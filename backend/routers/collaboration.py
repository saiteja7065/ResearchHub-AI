from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional, List
from pydantic import BaseModel
from utils.auth import get_current_user
from utils.supabase_client import supabase

router = APIRouter(prefix="/workspaces/{workspace_id}/members", tags=["collaboration"])

class InviteRequest(BaseModel):
    email: str
    role: str = "viewer"  # admin, editor, viewer

class UpdateRoleRequest(BaseModel):
    role: str

def check_admin(workspace_id: str, user_id: str):
    """Verifies that the current user is an admin of the specified workspace."""
    # First check if user is the absolute owner
    ws = supabase.table("workspaces").select("*").eq("id", workspace_id).eq("user_id", user_id).execute()
    if ws.data:
        return True
        
    # Then check if they are an admin in the members table
    member = supabase.table("workspace_members").select("*").eq("workspace_id", workspace_id).eq("user_id", user_id).eq("role", "admin").execute()
    if member.data:
        return True
        
    return False

@router.get("")
async def list_members(workspace_id: str, user=Depends(get_current_user)):
    """List all members of a workspace."""
    # Note: RLS handles viewing permissions
    
    # 1. Get the workspace owner
    ws = supabase.table("workspaces").select("user_id").eq("id", workspace_id).execute()
    if not ws.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    owner_id = ws.data[0]["user_id"]
    
    # We now have a public.profiles table we can join/query to get emails!
    members = supabase.table("workspace_members").select("*").eq("workspace_id", workspace_id).execute()
    
    # Collect all unique user IDs to fetch their emails
    user_ids = [owner_id]
    if members.data:
        user_ids.extend([m["user_id"] for m in members.data])
        
    # Fetch profiles
    profiles_res = supabase.table("profiles").select("id, email").in_("id", user_ids).execute()
    email_map = {p["id"]: p["email"] for p in profiles_res.data} if profiles_res.data else {}
    
    result = [
        {"user_id": owner_id, "role": "owner", "email": email_map.get(owner_id, owner_id)}
    ]
    
    if members.data:
        for m in members.data:
            result.append({
                "user_id": m["user_id"],
                "role": m["role"],
                "email": email_map.get(m["user_id"], m["user_id"])
            })
            
    # Determine current user's role
    current_user_role = "viewer"
    if str(user.id) == str(owner_id):
        current_user_role = "owner"
    elif members.data:
        for m in members.data:
            if str(m["user_id"]) == str(user.id):
                current_user_role = m["role"]
                break
        
    return {"members": result, "current_user_role": current_user_role}

@router.post("/invite")
async def invite_member(
    workspace_id: str, 
    req: InviteRequest, 
    user=Depends(get_current_user)
):
    """Invites a user to the workspace based on their ID.
    In a full production app, this would send an email. For hackathon demo, we mimic by finding their user_id.
    """
    if not check_admin(workspace_id, user.id):
        raise HTTPException(status_code=403, detail="Only admins can invite members")
        
    if req.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be admin, editor, or viewer")
        
    # We now look up the email in the public 'profiles' table to find their UUID
    profile_res = supabase.table("profiles").select("id").eq("email", req.email).execute()
    if not profile_res.data:
        raise HTTPException(status_code=404, detail=f"No user found with email {req.email}. Have they signed up?")
        
    target_user_id = profile_res.data[0]["id"]
    
    try:
        data = {
            "workspace_id": workspace_id,
            "user_id": target_user_id,
            "role": req.role
        }
        res = supabase.table("workspace_members").insert(data).execute()
        return {"message": f"Successfully invited {req.email}", "data": res.data}
    except Exception as e:
        if "duplicate key value" in str(e).lower() or "unique_violation" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"{req.email} is already in the workspace.")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{member_id}")
async def update_member_role(
    workspace_id: str, 
    member_id: str,
    req: UpdateRoleRequest,
    user=Depends(get_current_user)
):
    """Updates a member's role."""
    if not check_admin(workspace_id, user.id):
        raise HTTPException(status_code=403, detail="Only admins can update roles")
        
    if req.role not in ["admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    res = supabase.table("workspace_members").update({"role": req.role}).eq("workspace_id", workspace_id).eq("user_id", member_id).execute()
    return {"message": "Success", "data": res.data}

@router.delete("/{member_id}")
async def remove_member(
    workspace_id: str, 
    member_id: str,
    user=Depends(get_current_user)
):
    """Removes a member from the workspace."""
    if not check_admin(workspace_id, user.id):
        raise HTTPException(status_code=403, detail="Only admins can remove members")
        
    res = supabase.table("workspace_members").delete().eq("workspace_id", workspace_id).eq("user_id", member_id).execute()
    return {"message": "Success", "data": res.data}
