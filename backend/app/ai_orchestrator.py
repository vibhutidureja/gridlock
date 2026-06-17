import os
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

class AIOrchestrator:
    def __init__(self):
        # By default expects OPENAI_API_KEY environment variable
        api_key = os.getenv("OPENAI_API_KEY", "dummy-key-for-tests")
        # Initialize OpenAI Chat Model
        self.llm = ChatOpenAI(temperature=0.2, model="gpt-4o", openai_api_key=api_key)
        
        self.prompt_template = PromptTemplate(
            input_variables=["event_type", "zone", "severity", "recommended_strategy", "officers", "barricades", "ties_score"],
            template="""You are an expert traffic management AI at UrbanFlow Nexus.
An incident has occurred. Please generate a short, actionable operational brief for traffic officers.

Context:
- Event: {event_type} in {zone}
- Predicted Severity: {severity}/10.0
- Recommended Intervention: {recommended_strategy}
- Resource Allocation: {officers} Officers, {barricades} Barricades
- Estimated ROI (TIES Score): {ties_score}

Operational Brief:"""
        )

    def generate_operational_brief(self, event_type: str, zone: str, severity: float, recommended_strategy: str, officers: int, barricades: int, ties_score: float) -> str:
        prompt = self.prompt_template.format(
            event_type=event_type,
            zone=zone,
            severity=severity,
            recommended_strategy=recommended_strategy,
            officers=officers,
            barricades=barricades,
            ties_score=ties_score
        )
        
        # In testing environments, avoid making real API calls if key is dummy
        if os.getenv("OPENAI_API_KEY") in [None, "", "dummy-key-for-tests"]:
            return f"**Mock Operational Brief:**\nDeploy {officers} officers to {zone} for {event_type}. Execute strategy: {recommended_strategy}."
            
        try:
            response = self.llm.invoke(prompt)
            return response.content
        except Exception as e:
            return f"Error generating brief: {str(e)}"

ai_orchestrator = AIOrchestrator()
