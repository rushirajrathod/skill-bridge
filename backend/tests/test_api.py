from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate_roadmap_happy_path():
    """Test 1 (Happy Path): Submit a valid payload and expect an accurate RoadmapResponse payload."""
    payload = {
        "session_id": "test_123",
        "target_role": "Data Scientist",
        "current_skills": ["Python", "SQL"],
        "time_investment": 10,
        "persona": "graduate",
        "current_role": ""
    }
    
    response = client.post("/api/roadmap/generate", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # Assert core components of the response exist
    assert "role" in data
    assert data["role"] == "Data Scientist"
    assert "missing_skills" in data
    assert isinstance(data["missing_skills"], list)
    assert "courses" in data
    assert len(data["courses"]) > 0
    assert "confidence_score" in data
    assert "analytics" in data


def test_generate_roadmap_edge_case_validation():
    """Test 2 (Edge Case): Submit an invalid payload missing required fields."""
    
    # Missing 'current_skills' entirely which is required by Pydantic model
    payload_invalid = {
        "session_id": "test_456",
        "target_role": "Data Scientist"
    }
    
    response = client.post("/api/roadmap/generate", json=payload_invalid)
    
    # Assert FastAPI correctly blocks it with a 422 Unprocessable Entity
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert data["detail"][0]["loc"] == ["body", "current_skills"]
    assert data["detail"][0]["msg"] == "Field required"
