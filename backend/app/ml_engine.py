from app.network_graph import traffic_graph
from catboost import CatBoostClassifier
import os

class MLEngine:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "../models/sla_model.cbm")
        self.model = CatBoostClassifier()
        try:
            self.model.load_model(model_path)
            self.model_loaded = True
        except Exception as e:
            print(f"Warning: Failed to load SLA model: {e}")
            self.model_loaded = False

    def predict(self, event_type: str, priority: str, zone: str, road_closure: bool):
        """
        Predicts severity and resolution time using a spatial graph model
        AND the new CatBoost SLA predictor.
        """
        # Heuristic baseline severity mapping
        base_sev = 5.0
        if "Accident" in event_type:
            base_sev += 2.0
        if road_closure:
            base_sev += 2.0
        if priority == "High":
            base_sev += 1.0
            
        sev = max(1.0, min(10.0, float(base_sev)))
        
        # Inject shockwave into the graph
        shockwave_data = traffic_graph.inject_shockwave(zone, sev)
        total_added_delay = sum([edge["added_delay"] for edge in shockwave_data.get("impacted_edges", [])])
        
        # ML Prediction for SLA
        if self.model_loaded:
            # Prepare dummy data for missing features to make a prediction
            features = [
                event_type,      # event_type
                "Unknown",       # event_cause
                "Unknown",       # veh_type
                "Unknown",       # corridor
                priority,        # priority
                "Unknown",       # police_station
                "Unknown",       # add1
                "Unknown",       # add2
                "Unknown",       # pin
                12.9716,         # latitude
                77.5946,         # longitude
                0,               # cmonth
                0,               # cdate
                0                # chour
            ]
            is_delayed = self.model.predict([features])[0]
            
            # Adjust resolution time based on SLA breach prediction
            if is_delayed == 1:
                time_mins = int(max(90, total_added_delay * 2.0))
            else:
                time_mins = int(max(30, total_added_delay * 1.5))
        else:
            time_mins = int(max(30, total_added_delay * 1.5))
        
        return {
            "predicted_severity": sev,
            "predicted_resolution_time_mins": time_mins,
            "shockwave_data": shockwave_data
        }

ml_engine = MLEngine()
