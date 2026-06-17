from app.simulation import simulator

def test_counterfactual_simulator():
    # Test a zone that is in the graph
    impact = simulator.simulate(zone="Koramangala", event_severity=8.0, intervention_type="Deploy Officers + Upstream Diversion")
    
    assert isinstance(impact, float)
    assert impact >= 0.0

def test_simulator_no_impact_unknown_zone():
    impact = simulator.simulate(zone="UnknownZone", event_severity=8.0)
    assert impact == 0.0
