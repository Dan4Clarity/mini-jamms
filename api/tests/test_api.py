# Tests that send HTTP requests to the app in memory. TestClient calls the
# FastAPI app directly: no server is started and no network is used.
import pytest
from fastapi.testclient import TestClient

from db import get_connection
from main import app, parse_allowed_origins


def fake_connection():
    # Stands in for db.get_connection, so no database is opened. These tests
    # are all rejected before any SQL runs, so the "connection" is never used.
    yield None


# FastAPI calls get_connection for every route that has Depends(get_connection),
# even when the request body is invalid. dependency_overrides tells the app to
# call fake_connection instead.
app.dependency_overrides[get_connection] = fake_connection

client = TestClient(app)

VALID_REPORT = {
    "location": "Corner of Main St and High St",
    "problem_type": "pothole",
    "description": "Large pothole in the left lane.",
    "reporter_name": "Test Person",
    "reporter_contact": "test@example.com",
}


def failed_fields(response):
    # FastAPI's 422 body lists each error with a "loc" (location) such as
    # ["body", "location"]. Comparing the whole list proves that exactly one
    # field was rejected, and which one.
    return [error["loc"] for error in response.json()["detail"]]


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_unknown_problem_type_returns_422():
    # {**a, "k": v} copies the dict a and replaces one key.
    response = client.post("/reports", json={**VALID_REPORT, "problem_type": "volcano"})
    assert response.status_code == 422
    assert failed_fields(response) == [["body", "problem_type"]]


def test_unknown_user_type_returns_422():
    response = client.post("/reports", json={**VALID_REPORT, "user_type": "contractor"})
    assert response.status_code == 422
    assert failed_fields(response) == [["body", "user_type"]]


def test_missing_location_returns_422():
    body = {key: value for key, value in VALID_REPORT.items() if key != "location"}
    response = client.post("/reports", json=body)
    assert response.status_code == 422
    assert failed_fields(response) == [["body", "location"]]


def test_extra_status_field_returns_422():
    # status is owned by the server, so a client may not send it.
    response = client.post("/reports", json={**VALID_REPORT, "status": "closed"})
    assert response.status_code == 422
    assert failed_fields(response) == [["body", "status"]]


def test_preflight_from_allowed_origin_is_accepted():
    # A preflight is the OPTIONS request a browser sends before a PATCH or a
    # JSON POST, to ask whether the real request is allowed. conftest.py sets
    # the allow-list to http://localhost:5173.
    asking = {"Origin": "http://localhost:5173", "Access-Control-Request-Method": "PATCH"}
    response = client.options("/reports/any-id", headers=asking)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_origin_not_on_the_allow_list_gets_no_cors_header():
    # The API still answers; without the header it is the browser that refuses
    # to hand the response to the page.
    response = client.get("/health", headers={"Origin": "https://evil.example"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_parse_allowed_origins_trims_and_drops_empty_entries():
    raw = " http://a.example , ,http://b.example,"
    assert parse_allowed_origins(raw) == ["http://a.example", "http://b.example"]


def test_parse_allowed_origins_removes_trailing_slash():
    assert parse_allowed_origins("https://a.example/") == ["https://a.example"]


def test_parse_allowed_origins_rejects_star():
    # pytest.raises passes only if the code inside the block raises that error.
    with pytest.raises(ValueError):
        parse_allowed_origins("https://a.example,*")
