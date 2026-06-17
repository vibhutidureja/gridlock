from app.knowledge_graph import kg
from unittest.mock import patch, MagicMock

def test_find_successful_interventions_fallback():
    # Since we don't have Neo4j running in CI, the fallback should return a mock list
    interventions = kg.find_successful_interventions("Accident", "Koramangala")
    assert isinstance(interventions, list)
    assert len(interventions) > 0
    assert "strategy_name" in interventions[0]

@patch("app.knowledge_graph.GraphDatabase.driver")
def test_find_successful_interventions_mocked(mock_driver):
    mock_session = MagicMock()
    mock_driver.return_value.session.return_value.__enter__.return_value = mock_session
    mock_record = {"strategy_name": "Mock Strategy", "impact_reduction": 99.0}
    mock_session.run.return_value = [mock_record]
    
    # We create a local instance to use the patched driver (if we imported a fresh one)
    # Since kg is instantiated globally, we mock its driver
    kg.driver = mock_driver.return_value
    
    interventions = kg.find_successful_interventions("Breakdown", "Central")
    assert len(interventions) == 1
    assert interventions[0]["strategy_name"] == "Mock Strategy"
    assert interventions[0]["impact_reduction"] == 99.0
