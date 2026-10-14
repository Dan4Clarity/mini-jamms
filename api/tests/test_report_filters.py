# Tests for the GET /reports filters: status, date_from and date_to.
# No database and no network. Two kinds of test:
#   - builder tests call build_list_reports_query directly and look at the SQL
#     text and the parameters it returns;
#   - HTTP tests send a request to the app in memory and look at what reached
#     the fake connection below.
import re
from datetime import date

import pytest
from fastapi.testclient import TestClient

from db import get_connection
from main import app
from reports import REPORTS_TIME_ZONE, build_list_reports_query

client = TestClient(app)


class RecordingConnection:
    """Stands in for a psycopg connection and its cursor. Runs no SQL: it only
    remembers what it was asked to run, and returns no rows."""

    def __init__(self):
        self.executed = []

    def cursor(self):
        return self

    # __enter__ and __exit__ are what make `with conn.cursor() as cur:` work.
    def __enter__(self):
        return self

    def __exit__(self, *error_details):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return []


# A fixture is set-up code that pytest runs for any test that names it as an
# argument. monkeypatch swaps the app's connection for the recording one and
# puts the original back when the test ends.
@pytest.fixture
def recorder(monkeypatch):
    conn = RecordingConnection()
    monkeypatch.setitem(app.dependency_overrides, get_connection, lambda: conn)
    return conn


def test_no_filters_builds_no_where_clause():
    sql, params = build_list_reports_query()
    assert "WHERE" not in sql
    assert params == {}
    assert sql.strip().endswith("ORDER BY created_at DESC")


def test_status_only():
    sql, params = build_list_reports_query(status="open")
    assert "WHERE status = %(status)s" in sql
    assert "created_at >=" not in sql and "created_at <" not in sql
    assert params == {"status": "open"}


def test_date_range_only():
    sql, params = build_list_reports_query(
        date_from=date(2026, 10, 1), date_to=date(2026, 10, 13)
    )
    assert "created_at >= ((%(date_from)s::date)::timestamp" in sql
    assert "created_at < ((%(date_to)s::date + 1)::timestamp" in sql
    assert "status =" not in sql
    assert params == {"date_from": date(2026, 10, 1), "date_to": date(2026, 10, 13),
                      "time_zone": REPORTS_TIME_ZONE}


def test_all_three_filters_are_joined_with_and():
    sql, params = build_list_reports_query("closed", date(2026, 10, 1), date(2026, 10, 13))
    assert sql.count("WHERE") == 1 and sql.count(" AND ") == 2
    assert sql.strip().endswith("ORDER BY created_at DESC")
    assert params == {"status": "closed", "date_from": date(2026, 10, 1),
                      "date_to": date(2026, 10, 13), "time_zone": REPORTS_TIME_ZONE}


def test_sql_text_never_contains_a_supplied_value():
    # The values (and the time zone name) must only ever be in the params dict.
    sql, _ = build_list_reports_query("rework_completed", date(2026, 10, 1), date(2026, 10, 13))
    for value in ("rework_completed", "2026", "10-01", "10-13", REPORTS_TIME_ZONE):
        assert value not in sql


def test_sql_text_does_not_depend_on_the_values():
    # Different values, same filters: the SQL text must be identical, because
    # values only ever travel in the params dict.
    first, _ = build_list_reports_query("open", date(2026, 10, 1), date(2026, 10, 13))
    second, _ = build_list_reports_query("closed", date(2020, 1, 2), date(2021, 3, 4))
    assert first == second


# Stacked parametrize runs the test once per combination: 2 x 2 x 2 = 8,
# including each date on its own.
@pytest.mark.parametrize("status", [None, "open"])
@pytest.mark.parametrize("date_from", [None, date(2026, 10, 1)])
@pytest.mark.parametrize("date_to", [None, date(2026, 10, 13)])
def test_placeholders_match_params_in_every_combination(status, date_from, date_to):
    sql, params = build_list_reports_query(status, date_from, date_to)
    # Every %(name)s placeholder in the SQL must have a matching key, and no extras.
    assert set(re.findall(r"%\((\w+)\)s", sql)) == set(params)


def test_get_reports_without_parameters_runs_the_unfiltered_query(recorder):
    response = client.get("/reports")
    assert response.status_code == 200
    assert response.json() == []
    assert recorder.executed == [build_list_reports_query()]


def test_get_reports_passes_all_three_filters_as_parameters(recorder):
    query = {"status": "open", "date_from": "2026-10-01", "date_to": "2026-10-13"}
    response = client.get("/reports", params=query)
    assert response.status_code == 200
    # FastAPI has already turned the two date strings into date objects.
    expected = build_list_reports_query("open", date(2026, 10, 1), date(2026, 10, 13))
    assert recorder.executed == [expected]


def test_invalid_status_returns_422(recorder):
    response = client.get("/reports", params={"status": "volcano"})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "status"]
    assert recorder.executed == []


def test_hostile_status_is_rejected_before_any_sql_runs(recorder):
    hostile = "open' OR '1'='1'; DROP TABLE reports; --"
    response = client.get("/reports", params={"status": hostile})
    assert response.status_code == 422
    assert recorder.executed == []


def test_date_from_after_date_to_returns_422(recorder):
    query = {"date_from": "2026-10-14", "date_to": "2026-10-13"}
    response = client.get("/reports", params=query)
    assert response.status_code == 422
    assert response.json() == {"detail": "The From date must not be later than the To date."}
    assert recorder.executed == []


def test_same_date_from_and_date_to_is_accepted(recorder):
    query = {"date_from": "2026-10-13", "date_to": "2026-10-13"}
    response = client.get("/reports", params=query)
    assert response.status_code == 200
    assert len(recorder.executed) == 1


# parametrize runs the same test once per value in the list.
@pytest.mark.parametrize("bad_date", ["2026-13-45", "yesterday"])
def test_malformed_date_returns_422(recorder, bad_date):
    response = client.get("/reports", params={"date_from": bad_date})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "date_from"]
    assert recorder.executed == []
