import os
from typing import Dict, Any, List, Optional
from groq import Groq
from utils.supabase_client import supabase
from services.chat_agent import chat_agent

class SummarizationAgent:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.1-8b-instant"

    def run(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, user_id: str = None) -> Dict[str, Any]:
        print("Running SummarizationAgent...")
        
        # 1. Retrieve relevant context
        context_chunks = chat_agent._search_context(workspace_id, user_message, top_k=8)
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\\n\\n---\\n\\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found."
        
        # 2. Build Summarization Prompt
        system_prompt = f"""You are an expert Research Summarization AI.
Your task is to craft a highly condensed, executive summary answering the user's request based ONLY on the provided context retrieved from their workspace.
Avoid generic fluff. Provide structured bullet points if appropriate.

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
            temperature=0.3, # lower temp for factual summaries
            max_tokens=1024,
        )
        response_text = completion.choices[0].message.content

        # 4. Save to Database
        try:
            supabase.table("research_insights").insert({
                "workspace_id": workspace_id,
                "user_id": user_id,
                "type": "summary",
                "content": response_text,
                "source_papers": [] # We don't have exact paper ID mapping yet from Qdrant, left empty for now
            }).execute()
        except Exception as e:
            print(f"Failed to save insight to DB: {e}")

        return {
            "response": response_text,
            "context_used": len(context_chunks),
            "model": self.model,
            "agent_used": "Summarization"
        }

summarization_agent = SummarizationAgent()
