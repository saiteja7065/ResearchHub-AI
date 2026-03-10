from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from utils.auth import get_current_user
from services.agents.agent_router import agent_router
from services.chat_agent import chat_agent
from utils.supabase_client import supabase

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    workspace_id: str
    message: str
    history: Optional[List[ChatMessage]] = []
    paper_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    context_used: int
    model: str
    agent_used: Optional[str] = "General Chat"

@router.post("/", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    user=Depends(get_current_user)
):
    """
    Send a message to the AI Research Agent.
    The agent uses RAG to pull context from the workspace's uploaded documents.
    """
    try:
        # Convert to simple dicts for the agent
        history = [{"role": m.role, "content": m.content} for m in request.history] if request.history else []
        
        result = agent_router.chat(
            workspace_id=request.workspace_id,
            user_message=request.message,
            chat_history=history,
            user_id=user.id,
            paper_id=request.paper_id
        )
        
        return ChatResponse(**result)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("CHAT AGENT ERROR:\\n", error_trace)
        raise HTTPException(status_code=500, detail=f"Chat agent error: {str(e)}\\n\\nTraceback:\\n{error_trace}")

@router.post("/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
    user=Depends(get_current_user)
):
    """
    Stream AI responses token-by-token using Server-Sent Events (SSE).
    """
    history = [{"role": m.role, "content": m.content} for m in request.history] if request.history else []

    return StreamingResponse(
        chat_agent.chat_stream(
            workspace_id=request.workspace_id,
            user_message=request.message,
            chat_history=history,
            paper_id=request.paper_id
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.get("/insights/{workspace_id}")
async def get_workspace_insights(
    workspace_id: str,
    user=Depends(get_current_user)
):
    """
    Fetch all autonomously generated insights (summaries, contradictions, gaps) for a workspace.
    """
    try:
        response = supabase.table("research_insights")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .order("created_at", desc=True)\
            .execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch insights: {str(e)}")
