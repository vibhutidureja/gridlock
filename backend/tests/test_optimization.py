from hypothesis import given, strategies as st
from app.optimization import optimizer

@given(
    available_officers=st.integers(min_value=0, max_value=100),
    available_barricades=st.integers(min_value=0, max_value=100),
    delta_impact=st.floats(min_value=0.0, max_value=100.0)
)
def test_optimization_constraints(available_officers, available_barricades, delta_impact):
    alloc, ties, strat = optimizer.optimize_ties(available_officers, available_barricades, delta_impact)
    
    assert isinstance(ties, float)
    assert ties >= 0.0
    
    assert alloc["officers"] <= available_officers
    assert alloc["barricades"] <= available_barricades
    
def test_zero_resources():
    alloc, ties, strat = optimizer.optimize_ties(0, 0, 50.0)
    assert ties == 0.0
    assert strat == "Do Nothing"
    assert alloc["officers"] == 0
