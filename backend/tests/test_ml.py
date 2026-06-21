from hypothesis import given, strategies as st
from app.ml_engine import ml_engine

@given(
    event_type=st.text(),
    priority=st.text(),
    zone=st.text(),
    road_closure=st.booleans()
)
def test_ml_prediction_fallback_or_robustness(event_type, priority, zone, road_closure):
    # This property-based test ensures our ml_engine never crashes on unknown categories
    predictions = ml_engine.predict(event_type, priority, zone, road_closure)
    sev = predictions["predicted_severity"]
    time = predictions["predicted_resolution_time_mins"]
    
    assert isinstance(sev, float)
    assert 1.0 <= sev <= 10.0
    
    assert isinstance(time, int)
    assert time >= 1
