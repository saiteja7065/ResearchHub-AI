from services.agents.base import SpecialistAgent


class GapDetectionAgent(SpecialistAgent):
    label = "Gap Detection"
    insight_type = "research_gap"
    top_k = 10
    temperature = 0.3
    nothing_found_phrase = "no obvious gaps"
    instructions = """You are an expert AI Research Assistant focused on identifying missing research, underexplored areas, and future work.
Analyze the provided excerpts and highlight what questions remain unanswered, limitations of current methodologies, or specific "future work" suggested by the authors.
Be precise and structured. If you find nothing, say "No obvious gaps"."""


gap_detection_agent = GapDetectionAgent()
