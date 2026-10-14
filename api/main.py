import os
from datetime import date
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from db import get_connection
from models import ReportCreate, ReportOut, ReportStatus, ReportStatusUpdate
from reports import create_report, get_report, list_reports, update_report_status
from rules import is_allowed_transition

app = FastAPI(title="Mini-JAMMS API")


def parse_allowed_origins(raw: str) -> list[str]:
    """Split a comma-separated list of origins into a clean list."""
    # Drop spaces, empty entries (e.g. from a trailing comma) and a trailing
    # slash: browsers send "https://example.com" with no slash, and the match
    # is an exact string comparison.
    origins = [origin.strip().rstrip("/") for origin in raw.split(",")]
    origins = [origin for origin in origins if origin]
    # "*" means "every website". Refuse to start, so the mistake is seen at
    # deploy time instead of silently opening the API.
    if "*" in origins:
        raise ValueError("ALLOWED_ORIGINS must list explicit origins, not '*'.")
    return origins


# CORS: the list of websites whose pages a browser will let call this API.
# An origin is scheme + host + port with no path, e.g. http://localhost:5173
# (the Vite dev server). Set ALLOWED_ORIGINS to a comma-separated list in
# production. `or` makes an unset variable and an empty one behave the same:
# both fall back to the local dev server.
# This runs after `from db import ...` above, which loads the local .env file.
ALLOWED_ORIGINS = parse_allowed_origins(
    os.environ.get("ALLOWED_ORIGINS") or "http://localhost:5173"
)

# Middleware wraps every request and response. This one answers the browser's
# preflight OPTIONS requests itself and adds the Access-Control-Allow-* headers
# to responses for the origins listed above.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    # The only non-default header the frontend sends: Content-Type: application/json.
    allow_headers=["Content-Type"],
    # allow_credentials is left at its default (False): no login, no cookies.
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(conn=Depends(get_connection)):
    with conn.cursor() as cur:
        cur.execute("select count(*) as report_count from public.reports")
        return cur.fetchone()


# Parameters that are not part of the path are read from the query string,
# e.g. GET /reports?status=open&date_from=2026-10-01. "X | None = None" means
# "an X, or nothing; nothing if left out", which is what makes each one optional.
# FastAPI converts the text using the type hint: status must be one of the
# ReportStatus codes and the dates must be real YYYY-MM-DD dates. Anything else
# gets a 422 before this function is called.
@app.get("/reports", response_model=list[ReportOut])
def get_reports(
    status: ReportStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    conn=Depends(get_connection),
):
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=422, detail="The From date must not be later than the To date."
        )
    return list_reports(conn, status, date_from, date_to)


@app.post("/reports", response_model=ReportOut, status_code=201)
def post_report(report: ReportCreate, conn=Depends(get_connection)):
    return create_report(conn, report)


@app.patch("/reports/{report_id}", response_model=ReportOut)
def patch_report(report_id: UUID, update: ReportStatusUpdate, conn=Depends(get_connection)):
    report = get_report(conn, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    current = report["status"]
    if not is_allowed_transition(current, update.status):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot change status from '{current}' to '{update.status}'. "
                "A report can only be closed after it is completed or rework completed, "
                "and a closed report can only be reopened as rework."
            ),
        )
    updated = update_report_status(conn, report_id, update.status)
    if updated is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return updated
