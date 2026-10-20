import threading
import time
from typing import Iterable, List, Optional
from fastapi import HTTPException
from utils.supabase_client import supabase

# The backend talks to Supabase with the service-role key, which bypasses Row Level Security.
# Every endpoint that takes a workspace_id must therefore check access itself, through this module.

WRITE_ROLES = ("owner", "admin", "editor")
ADMIN_ROLES = ("owner", "admin")

# Each chat message would otherwise cost 1-2 extra Supabase round-trips, so roles are cached briefly.
# A removed member can keep access for at most this long.
_ROLE_TTL_SECONDS = 60
_role_cache = {}
_cache_lock = threading.Lock()


def _lookup_role(workspace_id: str, user_id: str) -> Optional[str]:
    owner = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user_id).execute()
    if owner.data:
        return "owner"
    member = supabase.table("workspace_members").select("role").eq("workspace_id", workspace_id).eq("user_id", user_id).execute()
    return member.data[0]["role"] if member.data else None


def get_workspace_role(workspace_id: str, user_id: str) -> Optional[str]:
    """The user's role in the workspace ("owner", "admin", "editor", "viewer"), or None without access."""
    key = (workspace_id, user_id)
    now = time.monotonic()
    with _cache_lock:
        entry = _role_cache.get(key)
        if entry and entry[0] > now:
            return entry[1]

    role = _lookup_role(workspace_id, user_id)
    with _cache_lock:
        if len(_role_cache) > 5000:
            _role_cache.clear()
        _role_cache[key] = (now + _ROLE_TTL_SECONDS, role)
    return role


def require_workspace_access(workspace_id: str, user_id: str, roles: Optional[Iterable[str]] = None) -> str:
    """Raise 403 unless the user can access the workspace (with one of `roles`, if given). Returns the role."""
    role = get_workspace_role(workspace_id, user_id)
    if role is None:
        raise HTTPException(status_code=403, detail="Workspace not found or access denied")
    if roles is not None and role not in roles:
        raise HTTPException(status_code=403, detail="You don't have permission to do this in this workspace")
    return role


def accessible_paper_ids(paper_ids: List[str], user_id: str) -> List[str]:
    """Filter paper IDs down to those in workspaces the user can access, keeping the given order."""
    if not paper_ids:
        return []
    rows = supabase.table("papers").select("id, workspace_id").in_("id", paper_ids).execute()
    workspace_of = {r["id"]: r["workspace_id"] for r in (rows.data or [])}
    allowed_ws = {ws for ws in set(workspace_of.values()) if get_workspace_role(ws, user_id)}
    return [pid for pid in paper_ids if workspace_of.get(pid) in allowed_ws]
