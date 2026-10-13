from uuid import UUID

from psycopg import Connection

from models import ReportCreate

LIST_REPORTS_SQL = """
    SELECT id, location, problem_type, description, reporter_name,
           reporter_contact, photo_path, status, created_at,
           user_type, updated_at
    FROM public.reports
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


def list_reports(conn: Connection) -> list[dict]:
    """Return all reports, newest first."""
    with conn.cursor() as cur:
        cur.execute(LIST_REPORTS_SQL)
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
