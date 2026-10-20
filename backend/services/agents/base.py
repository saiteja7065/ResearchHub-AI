from typing import Any, Dict, List, Optional, Tuple
from services import llm
from services.chat_agent import chat_agent
from utils.supabase_client import supabase


class SpecialistAgent:
    """
    A RAG agent with its own instructions, retrieval depth and temperature.
    Subclasses only declare their settings; building the prompt, calling the LLM (whole or streamed)
    and saving the finding to the Insights panel are shared here.
    """
    label: str = ""                 # shown to the user, e.g. "Contradiction Detection"
    insight_type: str = ""          # research_insights.type
    top_k: int = 8                  # chunks of context to retrieve
    temperature: float = 0.3
    instructions: str = ""
    nothing_found_phrase: Optional[str] = None  # if the answer contains this, don't save an insight

    def __init__(self):
        self.model = llm.LLM_MODEL

    def build_messages(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, paper_id: Optional[str] = None) -> Tuple[List[Dict[str, str]], int]:
        context_chunks = chat_agent._search_context(workspace_id, user_message, top_k=self.top_k, paper_id=paper_id)
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\n\n---\n\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found."

        system_prompt = f"""{self.instructions}

<context>
{context_text}
</context>
"""
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            messages.extend(chat_history[-4:])
        messages.append({"role": "user", "content": user_message})
        return messages, len(context_chunks)

    def save_insight(self, workspace_id: str, user_id: Optional[str], response_text: str) -> bool:
        """Store the finding in the Insights panel. Returns True if one was saved."""
        if not response_text.strip():
            return False
        if self.nothing_found_phrase and self.nothing_found_phrase in response_text.lower():
            return False
        try:
            supabase.table("research_insights").insert({
                "workspace_id": workspace_id,
                "user_id": user_id,
                "type": self.insight_type,
                "content": response_text,
                "source_papers": [],
            }).execute()
            return True
        except Exception as e:
            print(f"Failed to save insight to DB: {e}")
            return False

    def run(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, user_id: str = None, paper_id: Optional[str] = None) -> Dict[str, Any]:
        """Non-streaming answer (used by POST /chat/)."""
        messages, context_used = self.build_messages(workspace_id, user_message, chat_history, paper_id)
        response_text = llm.complete(messages, temperature=self.temperature, max_tokens=2048)
        self.save_insight(workspace_id, user_id, response_text)
        return {
            "response": response_text,
            "context_used": context_used,
            "model": self.model,
            "agent_used": self.label,
        }
