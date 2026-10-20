import threading
import time
from collections import defaultdict
from typing import Any, Dict, List

# Qdrant runs in memory, so after every restart the vectors are rebuilt from Supabase.
# Indexing is tracked per workspace so a chat request can index its own workspace first
# instead of waiting for the full startup rebuild (which takes ~1 minute on Render's free CPU).

state = {"status": "pending", "papers": 0, "vectors": 0, "seconds": None}

_done = set()
_locks = defaultdict(threading.Lock)
_locks_guard = threading.Lock()


def paper_elements(paper: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parsed elements for an uploaded paper, or title/authors/abstract for one imported from search."""
    metadata = paper.get("metadata") or {}
    elements = list(metadata.get("elements") or [])
    if elements:
        return elements

    title = paper.get("title", "")
    abstract = metadata.get("abstract", "")
    authors = ", ".join(metadata.get("authors", []))
    if title:
        elements.append({"type": "Title", "text": title, "page_number": 0})
    if authors:
        elements.append({"type": "NarrativeText", "text": f"Authors: {authors}", "page_number": 0})
    if abstract:
        elements.append({"type": "NarrativeText", "text": abstract, "page_number": 0})
    return elements


def _index_papers(workspace_id: str, papers: List[Dict[str, Any]]) -> int:
    from services.vector_db import vector_db
    vectors = 0
    for paper in papers:
        elements = paper_elements(paper)
        if not elements:
            continue
        try:
            vectors += vector_db.embed_and_store(workspace_id=workspace_id, paper_id=paper["id"], elements=elements)
        except Exception as paper_err:
            # One bad paper should not stop the rest of the workspace from being searchable
            print(f"[Indexer] Skipping paper {paper.get('id')}: {paper_err}")
    return vectors


def _workspace_lock(workspace_id: str) -> threading.Lock:
    with _locks_guard:
        return _locks[workspace_id]


def ensure_workspace_indexed(workspace_id: str, papers: List[Dict[str, Any]] = None) -> int:
    """Index a workspace's papers once per process. Safe to call from any thread; returns vectors added."""
    if workspace_id in _done:
        return 0
    with _workspace_lock(workspace_id):
        if workspace_id in _done:
            return 0
        if papers is None:
            from utils.supabase_client import supabase
            papers = supabase.table("papers").select("id, title, metadata").eq("workspace_id", workspace_id).execute().data or []
        vectors = _index_papers(workspace_id, papers)
        _done.add(workspace_id)
        return vectors


def reindex_all():
    """Startup rebuild of every workspace (runs in a background thread)."""
    from utils.supabase_client import supabase
    from services.vector_db import vector_db

    started = time.monotonic()
    state["status"] = "running"
    print("[Startup] Starting background re-indexing of documents from Supabase to Qdrant...")
    try:
        # Load the embedding model first so the first chat request never pays the load cost
        vector_db.model

        papers = supabase.table("papers").select("id, workspace_id, title, metadata").execute().data or []
        by_workspace = defaultdict(list)
        for paper in papers:
            by_workspace[paper["workspace_id"]].append(paper)

        for workspace_id, ws_papers in by_workspace.items():
            ensure_workspace_indexed(workspace_id, ws_papers)

        # Count what is actually stored (some workspaces may have been indexed on demand by a chat request)
        total_vectors = sum(
            vector_db.qdrant.count(collection_name=c.name).count
            for c in vector_db.qdrant.get_collections().collections
        )

        state.update(status="ready", papers=len(papers), vectors=total_vectors)
        print(f"[Startup] Background re-indexing completed successfully: {len(papers)} papers -> {total_vectors} vectors loaded.")
    except Exception as e:
        state["status"] = "failed"
        print(f"[Startup] Background Qdrant re-index failed: {e}")
    finally:
        state["seconds"] = round(time.monotonic() - started, 1)
