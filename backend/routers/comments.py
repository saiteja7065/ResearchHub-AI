from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from utils.auth import get_current_user
from utils.supabase_client import supabase

router = APIRouter(prefix="/workspaces/{workspace_id}/comments", tags=["comments"])

class CommentCreate(BaseModel):
    content: str
    paper_id: Optional[str] = None
    insight_id: Optional[str] = None

@router.get("")
async def list_comments(
    workspace_id: str, 
    paper_id: Optional[str] = None,
    insight_id: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Fetches comments for a specific paper or insight within a workspace."""
    # RLS ensures user has access to this workspace's comments
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
async def create_comment(
    workspace_id: str, 
    comment: CommentCreate,
    user=Depends(get_current_user)
):
    """Creates a new comment for a paper or insight."""
    if not comment.paper_id and not comment.insight_id:
        raise HTTPException(status_code=400, detail="Must provide either paper_id or insight_id")
    if comment.paper_id and comment.insight_id:
        raise HTTPException(status_code=400, detail="Cannot provide both paper_id and insight_id")
        
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{comment_id}")
async def delete_comment(
    workspace_id: str, 
    comment_id: str,
    user=Depends(get_current_user)
):
    """Deletes a comment. RLS ensures only the author or an admin can delete."""
    try:
        res = supabase.table("comments").delete().eq("id", comment_id).eq("workspace_id", workspace_id).execute()
        
        # If no rows deleted but no error raised, might mean RLS blocked it securely
        if not res.data:
            # We don't necessarily throw 403 here because Supabase just returns empty data for RLS failures on delete.
            # But returning 200 with empty data is standard for PostgREST RLS silent failures, 
            # though we could do a SELECT first to verify. For now, this is secure.
            pass
            
        return {"message": "Success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
