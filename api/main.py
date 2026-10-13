from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException

from db import get_connection
from models import ReportCreate, ReportOut, ReportStatusUpdate
from reports import create_report, get_report, list_reports, update_report_status
from rules import is_allowed_transition

app = FastAPI(title="Mini-JAMMS API")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(conn=Depends(get_connection)):
    with conn.cursor() as cur:
        cur.execute("select count(*) as report_count from public.reports")
        return cur.fetchone()


@app.get("/reports", response_model=list[ReportOut])
def get_reports(conn=Depends(get_connection)):
    return list_reports(conn)


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
