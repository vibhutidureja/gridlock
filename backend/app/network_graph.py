import networkx as nx
import time

class TrafficGraph:
    def __init__(self):
        self.G = nx.DiGraph()
        self._build_silk_board_subgraph()
        
    def _build_silk_board_subgraph(self):
        # Nodes: Silk Board, HSR Layout, Agara, Bellandur, Kadubeesanahalli, Marathahalli
        # We can add some internal bypass roads to make routing interesting.
        nodes = [
            ("Silk Board", {"lat": 12.9176, "lng": 77.6238}),
            ("HSR Layout", {"lat": 12.9116, "lng": 77.6389}),
            ("Agara", {"lat": 12.9244, "lng": 77.6495}),
            ("Bellandur", {"lat": 12.9304, "lng": 77.6784}),
            ("Kadubeesanahalli", {"lat": 12.9381, "lng": 77.6961}),
            ("Marathahalli", {"lat": 12.9569, "lng": 77.7011}),
            ("Koramangala", {"lat": 12.9279, "lng": 77.6271}),
            ("Bypass", {"lat": 12.9300, "lng": 77.6500})
        ]
        self.G.add_nodes_from(nodes)
        
        # Edges with baseline travel time in minutes and capacity
        edges = [
            ("Silk Board", "HSR Layout", {"weight": 5.0, "capacity": 100}),
            ("HSR Layout", "Agara", {"weight": 4.0, "capacity": 100}),
            ("Silk Board", "Koramangala", {"weight": 6.0, "capacity": 60}),
            ("Koramangala", "Agara", {"weight": 7.0, "capacity": 50}),
            ("Agara", "Bellandur", {"weight": 5.0, "capacity": 120}),
            ("Agara", "Bypass", {"weight": 8.0, "capacity": 40}),
            ("Bypass", "Kadubeesanahalli", {"weight": 6.0, "capacity": 40}),
            ("Bellandur", "Kadubeesanahalli", {"weight": 4.0, "capacity": 120}),
            ("Kadubeesanahalli", "Marathahalli", {"weight": 5.0, "capacity": 120})
        ]
        self.G.add_edges_from(edges)
        
        # Keep a copy of baseline weights
        self.baseline_weights = {(u, v): d['weight'] for u, v, d in self.G.edges(data=True)}

    def reset_graph(self):
        for u, v in self.G.edges():
            self.G[u][v]['weight'] = self.baseline_weights[(u, v)]

    def inject_shockwave(self, source_node: str, severity: float):
        """Simulates an ST-GNN shockwave, increasing weights on upstream and adjacent edges."""
        if source_node not in self.G:
            # Try to map to closest node (naive mapping for demo)
            mapped = False
            for node in self.G.nodes():
                if node.lower() in source_node.lower():
                    source_node = node
                    mapped = True
                    break
            if not mapped:
                return {"error": f"Node {source_node} not found in graph.", "traversal_time_ms": 0}
            
        start_time = time.time()
        self.reset_graph()
            
        # Apply shockwave
        impacted_edges = []
        # In-edges (traffic backing up)
        for u, v in self.G.in_edges(source_node):
            penalty = severity * 3.0  # Massive penalty
            self.G[u][v]['weight'] += penalty
            impacted_edges.append({"from": u, "to": v, "added_delay": penalty})
            
            # Cascade one more level upstream
            for uu, vv in self.G.in_edges(u):
                cascade_penalty = severity * 1.5
                self.G[uu][vv]['weight'] += cascade_penalty
                impacted_edges.append({"from": uu, "to": vv, "added_delay": cascade_penalty})
            
        # Out-edges (ripple effect)
        for u, v in self.G.out_edges(source_node):
            penalty = severity * 1.0
            self.G[u][v]['weight'] += penalty
            impacted_edges.append({"from": u, "to": v, "added_delay": penalty})
            
        traversal_time_ms = (time.time() - start_time) * 1000
        return {"impacted_edges": impacted_edges, "traversal_time_ms": traversal_time_ms, "mapped_node": source_node}

    def shortest_path(self, source: str, target: str):
        """Find fastest path dynamically."""
        try:
            path = nx.shortest_path(self.G, source=source, target=target, weight='weight')
            length = nx.shortest_path_length(self.G, source=source, target=target, weight='weight')
            return path, length
        except nx.NetworkXNoPath:
            return None, float('inf')

traffic_graph = TrafficGraph()
