from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_ingest_event():
    response = client.post("/api/v1/event/ingest", json={
        "event_type": "Breakdown",
        "priority": "High",
        "zone": "Central",
        "road_closure": True
    })
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data
    assert "predicted_severity" in data

def test_simulate_intervention():
    response = client.post("/api/v1/simulate", json={
        "event_id": "uuid-1234",
        "available_officers": 20,
        "available_barricades": 10
    })
    assert response.status_code == 200
    data = response.json()
    assert "recommended_strategy" in data
    assert "ties_score" in data
