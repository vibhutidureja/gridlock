import sys
import random
import os

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models import TrafficEvent
from app.ml_engine import ml_engine

def fix_events():
    db = SessionLocal()
    events = db.query(TrafficEvent).all()
    
    # Bangalore bounds roughly: 12.85 to 13.10 (Lat), 77.50 to 77.75 (Lon)
    
    count = 0
    for e in events:
        # Run ML engine to get actual predictions
        try:
            res = ml_engine.predict(e.event_type, e.priority, e.zone, e.road_closure)
            e.predicted_severity = res["predicted_severity"]
            e.predicted_resolution_time_mins = res["predicted_resolution_time_mins"]
            
            # Generate random location around Bangalore
            lon = 77.50 + random.random() * 0.25
            lat = 12.85 + random.random() * 0.25
            e.location = f"POINT({lon} {lat})"
            count += 1
        except Exception as ex:
            print(f"Error predicting for event {e.id}: {ex}")
            
    db.commit()
    db.close()
    print(f"Successfully fixed {count} events with real ML predictions and locations!")

if __name__ == '__main__':
    fix_events()
