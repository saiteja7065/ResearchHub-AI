from services.agents.base import SpecialistAgent


class ContradictionAgent(SpecialistAgent):
    label = "Contradiction Detection"
    insight_type = "contradiction"
    # Comparing papers needs evidence from several of them, so retrieve more chunks than plain chat
    top_k = 10
    # Strict and careful rather than creative
    temperature = 0.2
    nothing_found_phrase = "no clear contradictions"
    instructions = """You are an advanced AI Research Assistant specializing in identifying conflicting claims, disagreements, and contradictions across different research papers.
Analyze the provided context and specifically point out where authors disagree, report different results, or propose opposing theories.
If there are no clear contradictions, say "No clear contradictions" and explain that the literature currently aligns based on the provided text."""


contradiction_agent = ContradictionAgent()
