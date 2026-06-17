from ortools.linear_solver import pywraplp

class InterventionOptimizer:
    def __init__(self):
        # Operational weights
        self.w_officer = 5.0
        self.w_barricade = 1.0

    def optimize_ties(self, available_officers: int, available_barricades: int, delta_impact: float):
        """
        Maximize TIES = Delta_Impact / (w_officer * officers + w_barricade * barricades)
        Subject to: officers <= available_officers
                    barricades <= available_barricades
                    officers >= 1 (if we do intervention, we need at least 1)
        Returns best allocation and ties score.
        """
        if available_officers <= 0 and available_barricades <= 0:
            return {"officers": 0, "barricades": 0}, 0.0, "Do Nothing"
            
        # For a fixed delta_impact, maximizing TIES means minimizing the denominator
        # However, to achieve delta_impact we assume a fixed required resource.
        # Let's frame this as a Knapsack/Resource allocation problem:
        # We have multiple strategies with different Delta Impacts and Resource requirements.
        # For simplicity in this demo, let's select the strategy that maximizes TIES.
        
        strategies = [
            {"name": "Deploy Officers + Upstream Diversion", "req_off": 4, "req_bar": 2, "impact": delta_impact},
            {"name": "Barricades Only", "req_off": 0, "req_bar": 4, "impact": delta_impact * 0.4},
            {"name": "Minimal Viable Patrol", "req_off": 1, "req_bar": 0, "impact": delta_impact * 0.2}
        ]
        
        best_strategy = "Do Nothing"
        best_ties = 0.0
        allocation = {"officers": 0, "barricades": 0}
        
        for strat in strategies:
            if strat["req_off"] <= available_officers and strat["req_bar"] <= available_barricades:
                cost = (self.w_officer * strat["req_off"]) + (self.w_barricade * strat["req_bar"])
                if cost > 0:
                    ties = strat["impact"] / cost
                    if ties > best_ties:
                        best_ties = ties
                        best_strategy = strat["name"]
                        allocation = {"officers": strat["req_off"], "barricades": strat["req_bar"]}
                        
        return allocation, best_ties, best_strategy

optimizer = InterventionOptimizer()
