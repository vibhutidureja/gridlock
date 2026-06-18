import time

class CausalEngine:
    def __init__(self):
        self.confidence_base = 0.85
        
    def score_intervention(self, strategy_name: str, baseline_delay: float):
        """
        Calculates the causal impact of an intervention.
        In a real scenario, this would use Do-Calculus or structural causal models.
        Here we use a heuristic mapping for the hackathon demo.
        """
        start_time = time.time()
        
        impact = 0.0
        if "Diversion" in strategy_name:
            impact = baseline_delay * 0.40 # 40% reduction
            confidence = self.confidence_base + 0.05
        elif "Barricades" in strategy_name:
            impact = baseline_delay * 0.25
            confidence = self.confidence_base
        else:
            impact = baseline_delay * 0.10
            confidence = self.confidence_base - 0.10
            
        calc_time_ms = (time.time() - start_time) * 1000
        
        return {
            "causal_impact_saved_mins": round(impact, 2),
            "confidence_pct": round(confidence * 100, 2),
            "calc_time_ms": calc_time_ms
        }

causal_engine = CausalEngine()
