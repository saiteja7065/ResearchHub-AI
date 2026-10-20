import os
# Force offline mode for Hugging Face during runtime to prevent checking for updates or making network requests
os.environ["HF_HUB_OFFLINE"] = "1"

import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from services import indexer
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
class JSONOnlyGZipMiddleware(GZipMiddleware):
    """
    Compress JSON responses (papers lists, insights, analytics) but never the SSE chat stream.
    Starlette 0.27's GZip compresses event streams too, and the compressor holds tokens back until a
    block fills, so answers would arrive in bursts instead of word by word.
    """
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"].endswith("/stream"):
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


app.add_middleware(JSONOnlyGZipMiddleware, minimum_size=1024)

# Include Routers
app.include_router(workspaces.router)
app.include_router(chat.router)
app.include_router(papers.router)
app.include_router(collaboration.router)
app.include_router(comments.router)
app.include_router(analytics.router)
app.include_router(integrations.router)

@app.on_event("startup")
async def startup_event():
    # Launch re-indexing in a daemon thread so the server binds to the port and serves requests immediately
    threading.Thread(target=indexer.reindex_all, name="qdrant-reindex", daemon=True).start()


@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}


# HEAD is accepted because uptime monitors (UptimeRobot, cron pingers) often use it
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    """Cheap liveness probe for keep-alive pings and Render health checks."""
    return {"status": "ok", "index": indexer.state}


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
        "index": indexer.state,
    }
