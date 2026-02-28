import os
import json
from enum import Enum
from typing import Dict, Any, List, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class AgentType(str, Enum):
    GENERAL_CHAT = "general_chat"
    SUMMARIZE = "summarize"
    CONTRADICTION = "contradiction"
    GAP_DETECTION = "gap_detection"

class AgentRouter:
    """
    Lightweight LangGraph-style router.
    Determines which specialized agent should handle the user's request.
    """
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.1-8b-instant"

    def route_query(self, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None) -> AgentType:
        """Uses a quick LLM call to classify the intent of the user's query."""
        
        system_prompt = """You are a routing agent for a research assistant.
Your job is to classify the user's intent into one of the following exact strings based on what they are asking:
- "summarize": User is asking to summarize a document, workspace, or key findings.
- "contradiction": User is asking to find conflicting information, disagreements, or contradictions between papers.
- "gap_detection": User is asking to find future work, missing research, or gaps in the literature.
- "general_chat": User is asking a general question, seeking explanations, or nothing specific to the above 3 categories.

Output ONLY the exact string from the list above, nothing else."""

        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            messages.extend(chat_history[-4:]) # Context for routing
        
        messages.append({"role": "user", "content": user_message})

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.0, # Deterministic routing
                max_tokens=20,
            )
            
            route_str = completion.choices[0].message.content.strip().lower()
            
            # Map loosely returned strings back to Enum
            if "summarize" in route_str: return AgentType.SUMMARIZE
            if "contradict" in route_str: return AgentType.CONTRADICTION
            if "gap" in route_str: return AgentType.GAP_DETECTION
            
            return AgentType.GENERAL_CHAT
            
        except Exception as e:
            print(f"Routing failed, defaulting to GENERAL_CHAT: {e}")
            return AgentType.GENERAL_CHAT

    def chat(self, workspace_id: str, user_message: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        The main entrypoint for the multi-agent system.
        Classifies the query and executes the specific agent pipeline.
        """
        route = self.route_query(user_message, chat_history)
        print(f"AgentRouter selected route: {route.name}")

        from services.agents.summarization_agent import summarization_agent
        from services.agents.contradiction_agent import contradiction_agent
        from services.agents.gap_detection_agent import gap_detection_agent
        from services.chat_agent import chat_agent

        if route == AgentType.SUMMARIZE:
            return summarization_agent.run(workspace_id, user_message, chat_history)
        
        elif route == AgentType.CONTRADICTION:
            return contradiction_agent.run(workspace_id, user_message, chat_history)
        
        elif route == AgentType.GAP_DETECTION:
            return gap_detection_agent.run(workspace_id, user_message, chat_history)
        
        else: # Fallback to standard contextual RAG chat
            return chat_agent.chat(workspace_id, user_message, chat_history)

agent_router = AgentRouter()
