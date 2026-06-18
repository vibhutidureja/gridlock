from app.network_graph import traffic_graph
from app.causal_engine import causal_engine
import time

class InterventionOptimizer:
    def __init__(self):
        self.w_officer = 5.0
        self.w_barricade = 1.0

    def optimize_ties(self, available_officers: int, available_barricades: int, predicted_time_mins: int):
        """
        Micro-routing and resource allocation optimizer.
        Uses causal engine for impact scoring.
        """
        start_time = time.time()
        
        if available_officers <= 0 and available_barricades <= 0:
            return {"officers": 0, "barricades": 0}, 0.0, "Do Nothing", {}
            
        strategies = [
            {"name": "Deploy Officers + Upstream Diversion", "req_off": 4, "req_bar": 2},
            {"name": "Barricades Only", "req_off": 0, "req_bar": 4},
            {"name": "Minimal Viable Patrol", "req_off": 1, "req_bar": 0}
        ]
        
        best_strategy = "Do Nothing"
        best_ties = 0.0
        allocation = {"officers": 0, "barricades": 0}
        best_causal_data = {}
        
        for strat in strategies:
            if strat["req_off"] <= available_officers and strat["req_bar"] <= available_barricades:
                cost = (self.w_officer * strat["req_off"]) + (self.w_barricade * strat["req_bar"])
                
                # Use causal engine for impact
                causal_res = causal_engine.score_intervention(strat["name"], predicted_time_mins)
                impact = causal_res["causal_impact_saved_mins"]
                
                if cost > 0:
                    ties = impact / cost
                    if ties > best_ties:
                        best_ties = ties
                        best_strategy = strat["name"]
                        allocation = {"officers": strat["req_off"], "barricades": strat["req_bar"]}
                        best_causal_data = causal_res
                        
        calc_time_ms = (time.time() - start_time) * 1000
        best_causal_data["optimization_time_ms"] = calc_time_ms
        
        return allocation, best_ties, best_strategy, best_causal_data

optimizer = InterventionOptimizer()
