import os
# Force offline mode for Hugging Face during runtime to prevent checking for updates or making network requests
os.environ["HF_HUB_OFFLINE"] = "1"

import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routers import workspaces, chat, papers, collaboration, comments, analytics, integrations

app = FastAPI(title="ResearchHub AI Backend")

# Load CORS origins from env, fallback to localhost for development
origins_env = os.getenv("ALLOWED_ORIGINS")
if origins_env:
    origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://research-hub-ai-rho.vercel.app",
    ]

# Configure CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Vercel preview deployments get unique subdomains
    allow_origin_regex=r"https://research-hub-ai[a-z0-9-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # cache CORS preflights for a day instead of re-sending OPTIONS before every call
)
# Compress JSON responses (papers lists, insights, analytics); SSE streams are excluded by Starlette
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Include Routers
app.include_router(workspaces.router)
app.include_router(chat.router)
app.include_router(papers.router)
app.include_router(collaboration.router)
app.include_router(comments.router)
app.include_router(analytics.router)
app.include_router(integrations.router)

_index_state = {"status": "pending", "papers": 0, "vectors": 0, "seconds": None}


def reindex_qdrant():
    """
    Re-embed all papers from Supabase into the in-memory Qdrant DB.
    Runs in a background thread: it is CPU-bound (ONNX) and makes blocking Supabase calls,
    so running it on the event loop would stall every request until indexing finished.
    """
    from utils.supabase_client import supabase
    from services.vector_db import vector_db

    started = time.monotonic()
    _index_state["status"] = "running"
    print("[Startup] Starting background re-indexing of documents from Supabase to Qdrant...")
    try:
        # Load the embedding model first so the first chat request never pays the load cost
        vector_db.model

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

            try:
                total_vectors += vector_db.embed_and_store(
                    workspace_id=paper["workspace_id"],
                    paper_id=paper["id"],
                    elements=elements
                )
            except Exception as paper_err:
                # One bad paper should not stop the rest of the workspace from being searchable
                print(f"[Startup] Skipping paper {paper.get('id')}: {paper_err}")

        _index_state.update(status="ready", papers=len(papers_list), vectors=total_vectors)
        print(f"[Startup] Background re-indexing completed successfully: {len(papers_list)} papers -> {total_vectors} vectors loaded.")
    except Exception as e:
        _index_state["status"] = "failed"
        print(f"[Startup] Background Qdrant re-index failed: {e}")
    finally:
        _index_state["seconds"] = round(time.monotonic() - started, 1)


@app.on_event("startup")
async def startup_event():
    # Launch re-indexing in a daemon thread so the server binds to the port and serves requests immediately
    threading.Thread(target=reindex_qdrant, name="qdrant-reindex", daemon=True).start()


@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}


# HEAD is accepted because uptime monitors (UptimeRobot, cron pingers) often use it
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    """Cheap liveness probe for keep-alive pings and Render health checks."""
    return {"status": "ok", "index": _index_state}


@app.get("/health/deep")
def health_deep():
    """Readiness probe that also touches Supabase, which keeps a free-tier project from auto-pausing."""
    from utils.supabase_client import supabase
    from services import llm
    db_ok = True
    try:
        supabase.table("workspaces").select("id").limit(1).execute()
    except Exception as e:
        db_ok = False
        print(f"[Health] Supabase check failed: {e}")
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "llm_model": llm.LLM_MODEL,
        "index": _index_state,
    }
