# Tests for the status transition rule. Plain function calls: no database,
# no app, no network. pytest runs every function whose name starts with test_.
from rules import is_allowed_transition


def test_completed_to_closed_is_allowed():
    assert is_allowed_transition("completed", "closed") is True


def test_rework_completed_to_closed_is_allowed():
    assert is_allowed_transition("rework_completed", "closed") is True


def test_in_progress_to_closed_is_rejected():
    assert is_allowed_transition("in_progress", "closed") is False


def test_open_to_closed_is_rejected():
    assert is_allowed_transition("open", "closed") is False


def test_closed_to_rework_is_allowed():
    assert is_allowed_transition("closed", "rework") is True


def test_closed_to_open_is_rejected():
    assert is_allowed_transition("closed", "open") is False


def test_open_to_scheduled_is_allowed():
    assert is_allowed_transition("open", "scheduled") is True


def test_closed_to_closed_is_allowed():
    # Setting the status a report already has is a harmless no-op.
    assert is_allowed_transition("closed", "closed") is True


def test_unknown_code_is_rejected():
    assert is_allowed_transition("open", "volcano") is False
    assert is_allowed_transition("volcano", "open") is False
