from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, Response
from typing import List
from utils.auth import get_current_user
from services.document_parser import document_parser
from services.vector_db import vector_db
from services.presentation_generator import presentation_generator
from services.report_generator import report_generator
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

@router.get("/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    """Return dashboard stats: workspace count, papers imported, recent activity"""
    try:
        ws_resp = supabase.table('workspaces').select('id, name, created_at').eq('user_id', user.id).execute()
        workspaces = ws_resp.data or []

        papers_resp = supabase.table('papers').select('id', count='exact').eq('user_id', user.id).execute()
        papers_count = papers_resp.count or 0

        return {
            "workspace_count": len(workspaces),
            "papers_imported": papers_count,
            "recent_workspaces": workspaces[-3:][::-1],
        }
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

@router.get("/{workspace_id}/papers")
async def get_workspace_papers(workspace_id: str, user=Depends(get_current_user)):
    """Fetch all papers (uploaded or imported) for a specific workspace"""
    try:
        # Verify workspace belongs to user
        ws = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user.id).execute()
        if not ws.data:
            raise HTTPException(status_code=404, detail="Workspace not found")

        papers = supabase.table("papers").select(
            "id, title, original_filename, metadata, created_at"
        ).eq("workspace_id", workspace_id).order("created_at", desc=True).execute()

        return {"papers": papers.data or []}
    except HTTPException:
        raise
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

@router.get("/{workspace_id}/export/pptx")
async def export_workspace_pptx(workspace_id: str, user=Depends(get_current_user)):
    """
    Generate a PowerPoint presentation from the autonomous insights in this workspace.
    """
    try:
        # 1. Get workspace name
        ws_response = supabase.table('workspaces').select('name').eq('id', workspace_id).eq('user_id', user.id).execute()
        if not ws_response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_name = ws_response.data[0]['name']

        # 2. Get insights for this workspace, ordered chronologically
        insights_response = supabase.table('research_insights').select('*').eq('workspace_id', workspace_id).order('created_at', desc=False).execute()
        insights = insights_response.data
        
        if not insights or len(insights) == 0:
            raise HTTPException(status_code=400, detail="No insights found in this workspace to export. Use the chat to generate insights first.")

        # 3. Generate PPTX Stream
        pptx_stream = presentation_generator.generate_insights_pptx(workspace_name, insights)

        # 4. Return as a file stream download
        headers = {
            'Content-Disposition': f'attachment; filename="{workspace_name.replace(" ", "_")}_Insights.pptx"'
        }
        return StreamingResponse(
            pptx_stream, 
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation", 
            headers=headers
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")

@router.get("/{workspace_id}/export/markdown")
async def export_workspace_markdown(workspace_id: str, user=Depends(get_current_user)):
    """
    Generate a Markdown document from the autonomous insights in this workspace.
    """
    try:
        ws_response = supabase.table('workspaces').select('name').eq('id', workspace_id).eq('user_id', user.id).execute()
        if not ws_response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_name = ws_response.data[0]['name']

        insights_response = supabase.table('research_insights').select('*').eq('workspace_id', workspace_id).order('created_at', desc=False).execute()
        insights = insights_response.data
        if not insights or len(insights) == 0:
            raise HTTPException(status_code=400, detail="No insights found to export.")

        md_content = report_generator.generate_markdown(workspace_name, insights)
        headers = {'Content-Disposition': f'attachment; filename="{workspace_name.replace(" ", "_")}_Literature_Review.md"'}
        return Response(content=md_content, media_type="text/markdown", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/{workspace_id}/export/pdf")
async def export_workspace_pdf(workspace_id: str, user=Depends(get_current_user)):
    """
    Generate a PDF document from the autonomous insights in this workspace.
    """
    try:
        ws_response = supabase.table('workspaces').select('name').eq('id', workspace_id).eq('user_id', user.id).execute()
        if not ws_response.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_name = ws_response.data[0]['name']

        insights_response = supabase.table('research_insights').select('*').eq('workspace_id', workspace_id).order('created_at', desc=False).execute()
        insights = insights_response.data
        if not insights or len(insights) == 0:
            raise HTTPException(status_code=400, detail="No insights found to export.")

        pdf_stream = report_generator.generate_pdf(workspace_name, insights)
        headers = {'Content-Disposition': f'attachment; filename="{workspace_name.replace(" ", "_")}_Literature_Review.pdf"'}
        return StreamingResponse(
            pdf_stream, 
            media_type="application/pdf", 
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Export failed: {str(e)}")
