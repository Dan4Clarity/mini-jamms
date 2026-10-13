from fastapi import Depends, FastAPI

from db import get_connection
from models import ReportCreate, ReportOut
from reports import create_report, list_reports

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
