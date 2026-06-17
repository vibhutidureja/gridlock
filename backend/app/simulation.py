import networkx as nx

class CounterfactualSimulator:
    def __init__(self):
        # Initialize a static mock road network for Bengaluru zones
        self.G = nx.DiGraph()
        
        # Nodes represent Junctions, Edges represent Corridors with base capacity and delay
        edges = [
            ("Koramangala", "Indiranagar", {'capacity': 100, 'base_delay': 15}),
            ("Indiranagar", "MG_Road", {'capacity': 80, 'base_delay': 10}),
            ("Koramangala", "HSR_Layout", {'capacity': 120, 'base_delay': 12}),
            ("HSR_Layout", "Silk_Board", {'capacity': 150, 'base_delay': 20}),
            ("Central", "MG_Road", {'capacity': 90, 'base_delay': 10}),
        ]
        self.G.add_edges_from(edges)
        
    def calculate_network_delay(self, capacities: dict) -> float:
        """Calculate a simplified total network delay metric."""
        total_delay = 0.0
        for u, v, data in self.G.edges(data=True):
            cap = capacities.get((u, v), data['capacity'])
            if cap <= 0:
                total_delay += data['base_delay'] * 5 # Huge penalty for 0 capacity
            else:
                total_delay += data['base_delay'] * (data['capacity'] / cap)
        return total_delay

    def simulate(self, zone: str, event_severity: float, intervention_type: str = None) -> float:
        """
        Returns impact reduction percentage.
        baseline delay (do(X = 0)) vs mitigated delay (do(X = intervention))
        """
        # Find edges connected to the zone (simplified logic)
        affected_edges = [(u, v) for u, v in self.G.edges if u == zone or v == zone]
        if not affected_edges:
            return 0.0 # No impact
            
        baseline_capacities = {}
        for u, v in affected_edges:
            # Capacity drops based on severity (1-10)
            baseline_capacities[(u, v)] = max(0, self.G[u][v]['capacity'] * (1 - event_severity/15))
            
        baseline_delay = self.calculate_network_delay(baseline_capacities)
        
        mitigated_capacities = baseline_capacities.copy()
        
        if intervention_type == "Deploy Officers + Upstream Diversion":
            # Recalculate assuming upstream diversion restores some capacity or redistributes
            for u, v in affected_edges:
                mitigated_capacities[(u, v)] += 20
        elif intervention_type == "Barricades Only":
            for u, v in affected_edges:
                mitigated_capacities[(u, v)] += 5
                
        mitigated_delay = self.calculate_network_delay(mitigated_capacities)
        
        if baseline_delay == 0:
            return 0.0
            
        impact_reduction_pct = max(0.0, ((baseline_delay - mitigated_delay) / baseline_delay) * 100)
        return impact_reduction_pct

simulator = CounterfactualSimulator()
