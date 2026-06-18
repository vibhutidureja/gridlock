from app.network_graph import traffic_graph

class MLEngine:
    def __init__(self):
        # We replace the tabular CatBoost model with our ST-GNN / NetworkX graph engine
        pass

    def predict(self, event_type: str, priority: str, zone: str, road_closure: bool):
        """
        Simulates predicting severity and resolution time using a spatial graph model.
        Instead of just returning scalar values, it calculates the network jam factor.
        """
        # Heuristic baseline severity mapping
        base_sev = 5.0
        if "Accident" in event_type:
            base_sev += 2.0
        if road_closure:
            base_sev += 2.0
        if priority == "High":
            base_sev += 1.0
            
        # Bound severity
        sev = max(1.0, min(10.0, float(base_sev)))
        
        # Inject shockwave into the graph
        shockwave_data = traffic_graph.inject_shockwave(zone, sev)
        
        # Calculate expected resolution time dynamically based on the graph penalty
        total_added_delay = sum([edge["added_delay"] for edge in shockwave_data.get("impacted_edges", [])])
        time_mins = int(max(30, total_added_delay * 1.5))
        
        # We also want to return the shockwave data for the UI
        return {
            "predicted_severity": sev,
            "predicted_resolution_time_mins": time_mins,
            "shockwave_data": shockwave_data
        }

ml_engine = MLEngine()
