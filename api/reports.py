from datetime import date
from uuid import UUID

from psycopg import Connection

from models import ReportCreate

# created_at is timestamptz, so "the 13th" only means something once a time zone
# is named. This is the zone whose calendar days date_from and date_to refer to.
# It is sent to Postgres as a bound parameter, so the result never depends on
# the database session's TimeZone setting. Use a region name from
# pg_timezone_names (not an offset such as "UTC-5"): a region name follows
# daylight saving, and a mistyped name only fails when a date filter is used.
REPORTS_TIME_ZONE = "America/New_York"

# GET /reports is assembled from the fixed pieces below. Every piece is a
# literal written here; nothing a client sends is ever put into the SQL text.
# Client values travel separately, as %(name)s bound parameters.
LIST_REPORTS_SELECT_SQL = """
    SELECT id, location, problem_type, description, reporter_name,
           reporter_contact, photo_path, status, created_at,
           user_type, updated_at
    FROM public.reports
"""

STATUS_FILTER_SQL = "status = %(status)s"

# Half-open range: from local midnight starting date_from, up to but not
# including local midnight starting the day after date_to. The bare timestamp
# is turned into a timestamptz by AT TIME ZONE, one boundary at a time, so
# daylight-saving changes (23 and 25 hour days) come out right.
DATE_FROM_FILTER_SQL = (
    "created_at >= ((%(date_from)s::date)::timestamp"
    " AT TIME ZONE %(time_zone)s::text)"
)
DATE_TO_FILTER_SQL = (
    "created_at < ((%(date_to)s::date + 1)::timestamp"
    " AT TIME ZONE %(time_zone)s::text)"
)

LIST_REPORTS_ORDER_BY_SQL = """
    ORDER BY created_at DESC
"""

CREATE_REPORT_SQL = """
    INSERT INTO public.reports
        (location, problem_type, description, reporter_name, reporter_contact,
         user_type)
    VALUES
        (%(location)s, %(problem_type)s, %(description)s,
         %(reporter_name)s, %(reporter_contact)s,
         %(user_type)s)
    RETURNING id, location, problem_type, description, reporter_name,
              reporter_contact, photo_path, status, created_at,
              user_type, updated_at
"""

# FOR UPDATE locks the row until the transaction ends, so a concurrent PATCH
# waits and then sees the new status. Commit only after the update.
GET_REPORT_SQL = """
    SELECT id, location, problem_type, description, reporter_name,
           reporter_contact, photo_path, status, created_at,
           user_type, updated_at
    FROM public.reports
    WHERE id = %(id)s
    FOR UPDATE
"""

# updated_at is not in the SET list: the reports_set_updated_at_trg trigger
# sets it, and RETURNING gives back the value the trigger stored.
UPDATE_REPORT_STATUS_SQL = """
    UPDATE public.reports
    SET status = %(status)s
    WHERE id = %(id)s
    RETURNING id, location, problem_type, description, reporter_name,
              reporter_contact, photo_path, status, created_at,
              user_type, updated_at
"""


def build_list_reports_query(
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[str, dict]:
    """Return the SQL text and the bound parameters for listing reports.

    A filter that is None adds no clause and no parameter. This function does
    not touch the database, so it can be tested on its own.
    """
    clauses: list[str] = []
    params: dict = {}
    if status is not None:
        clauses.append(STATUS_FILTER_SQL)
        params["status"] = status
    if date_from is not None:
        clauses.append(DATE_FROM_FILTER_SQL)
        params["date_from"] = date_from
    if date_to is not None:
        clauses.append(DATE_TO_FILTER_SQL)
        params["date_to"] = date_to
    if date_from is not None or date_to is not None:
        params["time_zone"] = REPORTS_TIME_ZONE

    sql = LIST_REPORTS_SELECT_SQL
    if clauses:
        # Only the constants above are joined here, never a value.
        sql += "    WHERE " + "\n      AND ".join(clauses)
    return sql + LIST_REPORTS_ORDER_BY_SQL, params


def list_reports(
    conn: Connection,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """Return the reports that match the given filters, newest first."""
    sql, params = build_list_reports_query(status, date_from, date_to)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def create_report(conn: Connection, data: ReportCreate) -> dict:
    """Insert one report and return the stored row."""
    with conn.cursor() as cur:
        # model_dump() gives a dict whose keys match the %(name)s placeholders.
        cur.execute(CREATE_REPORT_SQL, data.model_dump())
        row = cur.fetchone()
    # Commit here so the row is durable before the 201 response is built.
    conn.commit()
    return row


def get_report(conn: Connection, report_id: UUID) -> dict | None:
    """Return one report and lock its row, or None if no report has that id."""
    with conn.cursor() as cur:
        cur.execute(GET_REPORT_SQL, {"id": report_id})
        return cur.fetchone()


def update_report_status(conn: Connection, report_id: UUID, new_status: str) -> dict | None:
    """Set a report's status and return the updated row, or None if it no longer exists."""
    with conn.cursor() as cur:
        cur.execute(UPDATE_REPORT_STATUS_SQL, {"id": report_id, "status": new_status})
        row = cur.fetchone()
    # Commit here so the change is durable before the response is built.
    conn.commit()
    return row
