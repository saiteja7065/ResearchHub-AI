from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import workspaces, chat, papers

app = FastAPI(title="ResearchHub AI Backend")

# Configure CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(workspaces.router)
app.include_router(chat.router)
app.include_router(papers.router)

@app.on_event("startup")
async def startup_reindex_qdrant():
    """
    On server start, re-embed all papers from Supabase into the in-memory Qdrant DB.
    This ensures Qdrant always has document vectors even after a restart.
    """
    from utils.supabase_client import supabase
    from services.vector_db import vector_db

    print("🔄 [Startup] Re-indexing documents into Qdrant from Supabase...")
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

        print(f"✅ [Startup] Re-indexed {len(papers_list)} papers → {total_vectors} vectors loaded into Qdrant.")
    except Exception as e:
        print(f"⚠️ [Startup] Qdrant re-index failed: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}
