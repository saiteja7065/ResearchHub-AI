import os
from typing import List, Dict, Any, Optional, Generator
from dotenv import load_dotenv
from groq import Groq
from services.vector_db import vector_db
import json

load_dotenv()

class ChatAgentService:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.3-70b-versatile"

    def _search_context(self, workspace_id: str, query: str, top_k: int = 5, paper_id: Optional[str] = None) -> List[str]:
        """Search Qdrant for relevant document chunks based on the user's query."""
        import numpy as np
        from qdrant_client.http import models
        import numpy as np
        collection_name = f"workspace_{workspace_id.replace('-', '_')}"
        
        # Check if the collection exists
        collections_response = vector_db.qdrant.get_collections()
        exists = any(col.name == collection_name for col in collections_response.collections)
        if not exists:
            return []

        # Encode the query
        query_embedding = vector_db.model.encode([query])[0]

        # Search in Qdrant with optional metadata filtering by paper_id
        query_filter = None
        if paper_id:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="paper_id",
                        match=models.MatchValue(value=paper_id)
                    )
                ]
            )

        results = vector_db.qdrant.search(
            collection_name=collection_name,
            query_vector=query_embedding.tolist(),
            query_filter=query_filter,
            limit=top_k,
        )

        return [hit.payload.get("text", "") for hit in results if hit.payload]

    def _build_messages(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None, paper_id: Optional[str] = None):
        """Shared helper to build context + messages for both chat() and chat_stream()."""
        context_chunks = self._search_context(workspace_id, user_message, paper_id=paper_id)
        truncated_chunks = [chunk[:1000] + "..." if len(chunk) > 1000 else chunk for chunk in context_chunks]
        context_text = "\\n\\n---\\n\\n".join(truncated_chunks) if truncated_chunks else "No relevant documents found in this workspace."

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

        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            messages.extend(chat_history[-10:])
        messages.append({"role": "user", "content": user_message})

        return messages, len(context_chunks)

    def chat(
        self,
        workspace_id: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        paper_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main chat method (non-streaming):
        1. Retrieves relevant context from Qdrant (RAG)
        2. Builds a prompt with the context
        3. Calls Groq Llama 3 for a response
        """
        messages, context_used = self._build_messages(workspace_id, user_message, chat_history, paper_id)

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )

        response_text = completion.choices[0].message.content

        return {
            "response": response_text,
            "context_used": context_used,
            "model": self.model,
        }

    def chat_stream(
        self,
        workspace_id: str,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        paper_id: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Streaming chat method:
        Yields SSE-formatted events with tokens as they arrive from Groq.
        """
        messages, context_used = self._build_messages(workspace_id, user_message, chat_history, paper_id)

        # Send context_used count as the first event
        yield f"data: {json.dumps({'context_used': context_used})}\n\n"

        # Stream tokens from Groq
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

        # Final event to signal completion
        yield f"data: {json.dumps({'done': True})}\n\n"

chat_agent = ChatAgentService()

