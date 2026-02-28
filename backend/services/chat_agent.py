import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from groq import Groq
from services.vector_db import vector_db

load_dotenv()

class ChatAgentService:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.1-8b-instant"

    def _search_context(self, workspace_id: str, query: str, top_k: int = 5) -> List[str]:
        """Search Qdrant for relevant document chunks based on the user's query."""
        import numpy as np
        collection_name = f"workspace_{workspace_id.replace('-', '_')}"
        
        # Check if the collection exists
        collections_response = vector_db.qdrant.get_collections()
        exists = any(col.name == collection_name for col in collections_response.collections)
        if not exists:
            return []

        # Encode the query
        query_embedding = vector_db.model.encode([query])[0]

        # Search in Qdrant
        results = vector_db.qdrant.search(
            collection_name=collection_name,
            query_vector=query_embedding.tolist(),
            limit=top_k,
        )

        return [hit.payload.get("text", "") for hit in results if hit.payload]

    def chat(
        self,
        workspace_id: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Main chat method:
        1. Retrieves relevant context from Qdrant (RAG)
        2. Builds a prompt with the context
        3. Calls Groq Llama 3 for a response
        """
        # 1. Retrieve relevant document chunks (truncate to avoid 413 payload too large errors)
        context_chunks = self._search_context(workspace_id, user_message)
        # Safely truncate chunks to a max of ~1000 chars each (approx 250 tokens) to ensure they fit in 8k limit
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\\n\\n---\\n\\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found in this workspace."

        # 2. Build the system prompt with context
        system_prompt = f"""You are ResearchHub AI, an expert research assistant. You help users analyze and understand academic papers and research documents that have been uploaded to their workspace.

You have access to the following relevant excerpts from the user's research documents:

<context>
{context_text}
</context>

Instructions:
- Answer questions based on the provided context from the user's uploaded documents.
- If the context doesn't contain relevant information, say so clearly and provide general knowledge if helpful.
- Be concise, accurate, and scholarly in your responses.
- When citing information, mention it comes from the uploaded documents.
- Format your responses with clear structure when needed (bullet points, numbered lists, etc.)"""

        # 3. Build message history for multi-turn conversation
        messages = [{"role": "system", "content": system_prompt}]
        
        if chat_history:
            messages.extend(chat_history[-10:])  # Keep last 10 turns for context window
        
        messages.append({"role": "user", "content": user_message})

        # 4. Call Groq API
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )

        response_text = completion.choices[0].message.content

        return {
            "response": response_text,
            "context_used": len(context_chunks),
            "model": self.model,
        }

chat_agent = ChatAgentService()
