# The nine status codes seeded in public.report_statuses
# (db/migrations/001_initial_schema.sql). Keep in step with ReportStatus in models.py.
STATUSES = frozenset({
    "open",
    "pending",
    "scheduled",
    "released",
    "in_progress",
    "rework",
    "rework_completed",
    "completed",
    "closed",
})

# Statuses a report may be closed from.
CLOSABLE_FROM = frozenset({"completed", "rework_completed"})


# "completed" (or "rework_completed") is the field crew's claim that the work is
# done. "closed" is the office verifying that claim, and it is the gate before
# billing. So a report can only be closed once the crew has said it is done, and
# a closed report can only be reopened as rework (the office found a problem).
# Unknown status codes are never allowed.
def is_allowed_transition(current: str, new: str) -> bool:
    """Return True if a report may move from status `current` to status `new`."""
    if current not in STATUSES or new not in STATUSES:
        return False
    # Setting the status it already has is a no-op, so PATCH is idempotent.
    if current == new:
        return True
    if new == "closed":
        return current in CLOSABLE_FROM
    if current == "closed":
        return new == "rework"
    return True
