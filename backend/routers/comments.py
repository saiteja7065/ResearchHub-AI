from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from utils.auth import get_current_user
from utils.supabase_client import supabase
from utils.access import require_workspace_access, ADMIN_ROLES

router = APIRouter(prefix="/workspaces/{workspace_id}/comments", tags=["comments"])

class CommentCreate(BaseModel):
    content: str
    paper_id: Optional[str] = None
    insight_id: Optional[str] = None

@router.get("")
def list_comments(
    workspace_id: str, 
    paper_id: Optional[str] = None,
    insight_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Fetches comments for a specific paper or insight within a workspace."""
    # The backend uses the service-role key (RLS is bypassed), so check access explicitly
    require_workspace_access(workspace_id, user.id)
    query = supabase.table("comments").select("*").eq("workspace_id", workspace_id)
    
    if paper_id:
        query = query.eq("paper_id", paper_id)
    if insight_id:
        query = query.eq("insight_id", insight_id)
        
    query = query.order("created_at", desc=False)
    
    try:
        res = query.execute()
        return {"comments": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("")
def create_comment(
    workspace_id: str, 
    comment: CommentCreate,
    user=Depends(get_current_user)
):
    """Creates a new comment for a paper or insight."""
    if not comment.paper_id and not comment.insight_id:
        raise HTTPException(status_code=400, detail="Must provide either paper_id or insight_id")
    if comment.paper_id and comment.insight_id:
        raise HTTPException(status_code=400, detail="Cannot provide both paper_id and insight_id")
    require_workspace_access(workspace_id, user.id)
        
    try:
        data = {
            "workspace_id": workspace_id,
            "user_id": user.id,
            "author_email": user.email,
            "content": comment.content,
            "paper_id": comment.paper_id,
            "insight_id": comment.insight_id
        }
        res = supabase.table("comments").insert(data).execute()
        return {"message": "Success", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{comment_id}")
def delete_comment(
    workspace_id: str, 
    comment_id: str,
    user=Depends(get_current_user)
):
    """Deletes a comment. Only its author or a workspace owner/admin may delete it."""
    role = require_workspace_access(workspace_id, user.id)
    try:
        existing = supabase.table("comments").select("user_id").eq("id", comment_id).eq("workspace_id", workspace_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Comment not found")
        if existing.data[0]["user_id"] != user.id and role not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Only the author or an admin can delete this comment")

        res = supabase.table("comments").delete().eq("id", comment_id).eq("workspace_id", workspace_id).execute()
        return {"message": "Success", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
