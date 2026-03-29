from fastapi import APIRouter, HTTPException, Depends
from utils.auth import get_current_user
from utils.supabase_client import supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
async def get_analytics_overview(user=Depends(get_current_user)):
    """Fetch high-level aggregate usage metrics for the dashboard."""
    try:
        # 1. Total Workspaces
        ws_res = supabase.table("workspaces").select("id", count="exact").eq("user_id", user.id).execute()
        total_workspaces = ws_res.count if ws_res.count is not None else 0

        # We also need to count shared workspaces
        member_res = supabase.table("workspace_members").select("workspace_id", count="exact").eq("user_id", user.id).execute()
        total_shared = member_res.count if member_res.count is not None else 0

        unique_workspaces = list(set(
            [w["id"] for w in (ws_res.data or [])] + 
            [m["workspace_id"] for m in (member_res.data or [])]
        ))
        active_workspaces = len(unique_workspaces)

        # 2. Total Papers (across all accessible workspaces)
        total_papers = 0
        if unique_workspaces:
            papers_res = supabase.table("papers").select("id", count="exact").in_("workspace_id", unique_workspaces).execute()
            total_papers = papers_res.count if papers_res.count is not None else 0

        # 3. Total Comments (Engagement)
        comments_res = supabase.table("comments").select("id", count="exact").eq("user_id", user.id).execute()
        total_comments = comments_res.count if comments_res.count is not None else 0

        return {
            "metrics": {
                "active_workspaces": active_workspaces,
                "total_papers": total_papers,
                "total_comments": total_comments,
                "shared_environments": total_shared
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
async def get_activity_timeline(user=Depends(get_current_user)):
    """Constructs a chronological timeline by unioning row creations for the user."""
    try:
        activities = []

        # We could fetch user's accessible workspaces first, but to keep it simple, 
        # let's just fetch their own recent actions across the board.
        
        # Papers Uploaded
        papers_res = supabase.table("papers").select("id, title, created_at, workspace_id, workspaces(name)").eq("user_id", user.id).order("created_at", desc=True).limit(5).execute()
        if papers_res.data:
            for p in papers_res.data:
                ws_name = p.get('workspaces', {}).get('name', 'a workspace') if p.get('workspaces') else 'a workspace'
                activities.append({
                    "id": f"paper_{p['id']}",
                    "type": "upload",
                    "description": f"Imported paper '{p['title'][:40]}...'",
                    "workspace": ws_name,
                    "created_at": p['created_at']
                })

        # Comments Posted
        comments_res = supabase.table("comments").select("id, content, created_at, workspace_id, workspaces(name)").eq("user_id", user.id).order("created_at", desc=True).limit(5).execute()
        if comments_res.data:
            for c in comments_res.data:
                ws_name = c.get('workspaces', {}).get('name', 'a workspace') if c.get('workspaces') else 'a workspace'
                activities.append({
                    "id": f"comment_{c['id']}",
                    "type": "comment",
                    "description": f"Commented: '{c['content'][:40]}...'",
                    "workspace": ws_name,
                    "created_at": c['created_at']
                })
                
        # Workspaces Created
        ws_res = supabase.table("workspaces").select("id, name, created_at").eq("user_id", user.id).order("created_at", desc=True).limit(3).execute()
        if ws_res.data:
            for w in ws_res.data:
                activities.append({
                    "id": f"ws_{w['id']}",
                    "type": "workspace",
                    "description": f"Created workspace '{w['name']}'",
                    "workspace": w['name'],
                    "created_at": w['created_at']
                })

        # Sort combined timeline by date descending
        activities.sort(key=lambda x: x["created_at"], reverse=True)

        return {"timeline": activities[:10]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
