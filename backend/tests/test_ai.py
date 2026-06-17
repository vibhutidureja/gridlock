from app.ai_orchestrator import ai_orchestrator
from unittest.mock import patch, MagicMock

@patch("app.ai_orchestrator.ChatOpenAI.invoke")
def test_generate_operational_brief(mock_invoke):
    mock_response = MagicMock()
    mock_response.content = "Deploy units immediately."
    mock_invoke.return_value = mock_response
    
    # We patch os.getenv to bypass the dummy key check inside the method just to test the try block if we wanted to
    # but the simplest test is just ensuring the mocked method works.
    
    with patch("os.getenv", return_value="real-key"):
        brief = ai_orchestrator.generate_operational_brief("Accident", "Central", 8.0, "Divert", 2, 4, 15.0)
        
    # Since we mocked os.getenv to "real-key", it will call invoke
    assert mock_invoke.called
    assert brief == "Deploy units immediately."

def test_generate_operational_brief_fallback():
    with patch("os.getenv", return_value="dummy-key-for-tests"):
        brief = ai_orchestrator.generate_operational_brief("Breakdown", "ZoneA", 5.0, "Wait", 1, 1, 1.0)
    
    assert "Mock Operational Brief" in brief
