import os
from catboost import CatBoostRegressor
import pandas as pd

class MLEngine:
    def __init__(self):
        self.severity_model = None
        self.time_model = None
        self.is_loaded = False
        
    def load_models(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sev_path = os.path.join(base_dir, "models", "severity_model.cbm")
        time_path = os.path.join(base_dir, "models", "time_model.cbm")
        
        if os.path.exists(sev_path) and os.path.exists(time_path):
            self.severity_model = CatBoostRegressor()
            self.severity_model.load_model(sev_path)
            
            self.time_model = CatBoostRegressor()
            self.time_model.load_model(time_path)
            
            self.is_loaded = True
        else:
            # Fallback for testing or if models aren't generated yet
            self.is_loaded = False

    def predict(self, event_type: str, priority: str, zone: str, road_closure: bool):
        if not self.is_loaded:
            self.load_models()
            
        if not self.is_loaded:
            # Return median fallback
            return 5.0, 60
            
        df = pd.DataFrame([{
            "event_type": str(event_type),
            "priority": str(priority),
            "zone": str(zone),
            "road_closure": str(road_closure)
        }])
        
        try:
            sev = self.severity_model.predict(df)[0]
            time = self.time_model.predict(df)[0]
            # Ensure boundaries
            sev = max(1.0, min(10.0, float(sev)))
            time = max(1, int(time))
            return sev, time
        except Exception as e:
            # Fallback gracefully
            return 5.0, 60

ml_engine = MLEngine()
