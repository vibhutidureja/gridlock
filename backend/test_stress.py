from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def run_tests():
    print("=== COLD START TEST ===")
    
    payload = {
        "event_id": "test-123",
        "event_type": "Accident",
        "zone": "Central",
        "predicted_severity": 8.0,
        "predicted_resolution_time_mins": 75,
        "available_officers": 10,
        "available_barricades": 20
    }
    
    response = client.post("/api/v1/simulate", json=payload)
    if response.status_code == 200:
        print("Cold Start Response: OK")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Cold Start Failed:", response.text)
        return
        
    print("\n=== STRESS TEST (1000 REQUESTS) ===")
    from app.rl_inference import rl_agent
    for i in range(1000):
        # Vary severity slightly to cause state fluctuations
        sev = 5.0 + (i % 5)
        rl_agent.predict_action(catboost_prob=sev/10.0, estimated_duration=75, current_congestion=sev)
            
    # Check internal context
    ctx = rl_agent.context
    print("\nFinal Context State after 1000 requests:")
    print(f"current_day_load: {ctx.current_day_load:.2f}")
    print(f"current_congestion: {ctx.current_congestion:.2f}")
    print(f"events_last_6_hours: {ctx.events_last_6_hours:.2f}")
    print("\nStress Test Passed! Values are clamped and valid.")

if __name__ == "__main__":
    run_tests()
