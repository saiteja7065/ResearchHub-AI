import os
from typing import Dict, Any, List, Optional
from groq import Groq
from utils.supabase_client import supabase
from services.chat_agent import chat_agent

class GapDetectionAgent:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.3-70b-versatile"

    def run(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, user_id: str = None, paper_id: Optional[str] = None) -> Dict[str, Any]:
        print(f"Running GapDetectionAgent... (paper_id={paper_id})")
        
        # 1. Retrieve relevant context (filtered by paper_id if specified)
        context_chunks = chat_agent._search_context(workspace_id, user_message, top_k=10, paper_id=paper_id)
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\\n\\n---\\n\\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found."
        
        # 2. Build Gap Detection Prompt
        system_prompt = f"""You are an expert AI Research Assistant focused on identifying missing research, underexplored areas, and future work.
Analyze the provided excerpts and highlight what questions remain unanswered, limitations of current methodologies, or specific "future work" suggested by the authors.
Be precise and structured.

<context>
{context_text}
</context>
"""
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history: messages.extend(chat_history[-4:])
        messages.append({"role": "user", "content": user_message})

        # 3. Call LLM
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        response_text = completion.choices[0].message.content

        # 4. Save to Database
        if "no obvious gaps" not in response_text.lower():
            try:
                supabase.table("research_insights").insert({
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "type": "research_gap",
                    "content": response_text,
                    "source_papers": [] 
                }).execute()
            except Exception as e:
                print(f"Failed to save insight to DB: {e}")

        return {
            "response": response_text,
            "context_used": len(context_chunks),
            "model": self.model,
            "agent_used": "Gap Detection"
        }

gap_detection_agent = GapDetectionAgent()
