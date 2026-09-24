"""
Locks in the exact response contract of GET /health, since the n8n "SENTINEL
-- System Health Monitor" workflow depends on this shape. No test previously
existed for this endpoint.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint_returns_expected_shape():
    response = client.get("/health")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "unhealthy")
    assert "database" in data
    if data["status"] == "healthy":
        assert "mode" in data
        assert "timestamp" in data


def test_health_endpoint_healthy_in_development_mode_without_database_url():
    """Default dev config (no DATABASE_URL) must report healthy with database='disabled'."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "disabled"
