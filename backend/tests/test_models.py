from app.models import TrafficEvent, SimulatedIntervention
import uuid

def test_traffic_event_model():
    event = TrafficEvent(
        event_type="Accident",
        priority="High",
        zone="Koramangala",
        road_closure=True,
        predicted_severity=8.0,
        predicted_resolution_time_mins=60
    )
    assert event.event_type == "Accident"
    assert event.road_closure is True
    assert event.predicted_severity == 8.0

def test_simulated_intervention_model():
    event_id = uuid.uuid4()
    intervention = SimulatedIntervention(
        event_id=event_id,
        strategy_name="Divert Traffic",
        officers_deployed=5,
        barricades_deployed=2,
        impact_reduction_pct=30.0,
        ties_score=15.0,
        is_final_selection=True
    )
    assert intervention.strategy_name == "Divert Traffic"
    assert intervention.officers_deployed == 5
    assert intervention.ties_score == 15.0
