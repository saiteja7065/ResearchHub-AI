from services.agents.base import SpecialistAgent


class SummarizationAgent(SpecialistAgent):
    label = "Summarization"
    insight_type = "summary"
    top_k = 8
    temperature = 0.3
    instructions = """You are an expert Research Summarization AI.
Your task is to craft a highly condensed, executive summary answering the user's request based ONLY on the provided context retrieved from their workspace.
Avoid generic fluff. Provide structured bullet points if appropriate."""


summarization_agent = SummarizationAgent()
