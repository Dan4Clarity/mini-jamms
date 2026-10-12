from fastapi import Depends, FastAPI

from db import get_connection

app = FastAPI(title="Mini-JAMMS API")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db(conn=Depends(get_connection)):
    with conn.cursor() as cur:
        cur.execute("select count(*) as report_count from public.reports")
        return cur.fetchone()
