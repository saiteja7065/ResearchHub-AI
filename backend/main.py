import os
# Force offline mode for Hugging Face during runtime to prevent checking for updates or making network requests
os.environ["HF_HUB_OFFLINE"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import workspaces, chat, papers, collaboration, comments, analytics, integrations

app = FastAPI(title="ResearchHub AI Backend")

# Load CORS origins from env, fallback to localhost for development
origins_env = os.getenv("ALLOWED_ORIGINS")
if origins_env:
    origins = [origin.strip() for origin in origins_env.split(",")]
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

# Configure CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(workspaces.router)
app.include_router(chat.router)
app.include_router(papers.router)
app.include_router(collaboration.router)
app.include_router(comments.router)
app.include_router(analytics.router)
app.include_router(integrations.router)

async def reindex_qdrant_task():
    """
    Background task to re-embed all papers from Supabase into the in-memory Qdrant DB.
    This ensures Qdrant always has document vectors even after a restart, without blocking
    the FastAPI server from binding to the port and starting up.
    """
    from utils.supabase_client import supabase
    from services.vector_db import vector_db

    print("[Startup] Starting background re-indexing of documents from Supabase to Qdrant...")
    try:
        response = supabase.table("papers").select("id, workspace_id, title, metadata").execute()
        papers_list = response.data or []
        total_vectors = 0

        for paper in papers_list:
            metadata = paper.get("metadata") or {}
            elements = metadata.get("elements", [])

            # If no parsed elements, try building from search-imported metadata
            if not elements:
                title = paper.get("title", "")
                abstract = metadata.get("abstract", "")
                authors = ", ".join(metadata.get("authors", []))

                if title:
                    elements.append({"type": "Title", "text": title, "page_number": 0})
                if authors:
                    elements.append({"type": "NarrativeText", "text": f"Authors: {authors}", "page_number": 0})
                if abstract:
                    elements.append({"type": "NarrativeText", "text": abstract, "page_number": 0})

            if not elements:
                continue

            vectors_created = vector_db.embed_and_store(
                workspace_id=paper["workspace_id"],
                paper_id=paper["id"],
                elements=elements
            )
            total_vectors += vectors_created

        print(f"[Startup] Background re-indexing completed successfully: {len(papers_list)} papers -> {total_vectors} vectors loaded.")
    except Exception as e:
        print(f"[Startup] Background Qdrant re-index failed: {e}")

@app.on_event("startup")
async def startup_event():
    import asyncio
    # Launch re-indexing in the background so the server can bind to the port immediately
    asyncio.create_task(reindex_qdrant_task())

@app.get("/")
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}
