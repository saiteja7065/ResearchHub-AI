from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List
from utils.auth import get_current_user
from services.document_parser import document_parser
from services.vector_db import vector_db
from utils.supabase_client import supabase

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.get("/")
async def get_workspaces(user=Depends(get_current_user)):
    """Fetch all workspaces for the authenticated user"""
    try:
        response = supabase.table('workspaces').select('*').eq('user_id', user.id).execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_workspace(name: str = Form(...), description: str = Form(""), user=Depends(get_current_user)):
    """Create a new workspace"""
    try:
        response = supabase.table('workspaces').insert({
            "name": name,
            "description": description,
            "user_id": user.id
        }).execute()
        return {"data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workspace_id}/upload")
async def upload_document(
    workspace_id: str, 
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """
    1. Uploads a document
    2. Parses it using Unstructured.io
    3. Saves the metadata into the Supabase 'papers' table
    """
    # 1. Parse the document using Unstructured
    parsed_elements = await document_parser.process_upload(file)
    
    # 2. Extract basic info
    title = file.filename or "Untitled Document"
    
    try:
        # 3. Save to Supabase Papers table
        # We store the fully parsed elements in the JSONB metadata column
        response = supabase.table('papers').insert({
            "workspace_id": workspace_id,
            "user_id": user.id,
            "title": title,
            "original_filename": file.filename,
            "metadata": {"elements": parsed_elements}
        }).execute()
        
        # 4. Generate Embeddings & Push to Qdrant Vector DB
        paper_id = response.data[0]['id']
        vectors_created = vector_db.embed_and_store(
            workspace_id=workspace_id,
            paper_id=paper_id,
            elements=parsed_elements
        )
        
        return {
            "message": "Document parsed, saved, and embedded successfully",
            "paper": response.data[0],
            "parsed_elements_count": len(parsed_elements),
            "vectors_created": vectors_created
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
