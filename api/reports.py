from psycopg import Connection

from models import ReportCreate

LIST_REPORTS_SQL = """
    SELECT id, location, problem_type, description, reporter_name,
           reporter_contact, photo_path, status, created_at
    FROM public.reports
    ORDER BY created_at DESC
"""

CREATE_REPORT_SQL = """
    INSERT INTO public.reports
        (location, problem_type, description, reporter_name, reporter_contact)
    VALUES
        (%(location)s, %(problem_type)s, %(description)s,
         %(reporter_name)s, %(reporter_contact)s)
    RETURNING id, location, problem_type, description, reporter_name,
              reporter_contact, photo_path, status, created_at
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
