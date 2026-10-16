from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "browser_automation_available" in data

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "TestPilot AI Backend"

def test_create_run_metadata_rejected():
    response = client.post(
        "/api/runs",
        json={"target_url": "http://169.254.169.254/latest/meta-data"},
        headers={"Authorization": "Bearer dev_mock_token_123"}
    )
    assert response.status_code == 400
    assert "blocked" in response.json()["detail"].lower() or "metadata" in response.json()["detail"].lower()

def test_create_run_unauthorized_domain_rejected():
    response = client.post(
        "/api/runs",
        json={"target_url": "https://unauthorized-domain.org"},
        headers={"Authorization": "Bearer dev_mock_token_123"}
    )
    assert response.status_code == 400
    assert "not an authorized test domain" in response.json()["detail"]

def test_create_run_allowed_dev_host_accepted():
    response = client.post(
        "/api/runs",
        json={"target_url": "http://localhost:3000"},
        headers={"Authorization": "Bearer dev_mock_token_123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert "run_id" in data
