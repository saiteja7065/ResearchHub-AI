import os
from typing import Dict, Any, List, Optional
from groq import Groq
from utils.supabase_client import supabase
from services.chat_agent import chat_agent

class ContradictionAgent:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.3-70b-versatile"

    def run(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, user_id: str = None) -> Dict[str, Any]:
        print("Running ContradictionAgent...")
        
        # 1. Retrieve relevant context
        context_chunks = chat_agent._search_context(workspace_id, user_message, top_k=10)
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\\n\\n---\\n\\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found."
        
        # 2. Build Contradiction Prompt
        system_prompt = f"""You are an advanced AI Research Assistant specializing in identifying conflicting claims, disagreements, and contradictions across different research papers.
Analyze the provided context and specifically point out where authors disagree, report different results, or propose opposing theories.
If there are no clear contradictions, state that the literature currently aligns based on the provided text.

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
            temperature=0.2, # Very low temp for strict contradiction finding
            max_tokens=1024,
        )
        response_text = completion.choices[0].message.content

        # 4. Save to Database
        if "no clear contradictions" not in response_text.lower():
            try:
                supabase.table("research_insights").insert({
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                    "type": "contradiction",
                    "content": response_text,
                    "source_papers": []
                }).execute()
            except Exception as e:
                print(f"Failed to save insight to DB: {e}")

        return {
            "response": response_text,
            "context_used": len(context_chunks),
            "model": self.model,
            "agent_used": "Contradiction Detection"
        }

contradiction_agent = ContradictionAgent()
