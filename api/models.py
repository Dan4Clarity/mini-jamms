from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Must match the reports_problem_type_chk CHECK constraint.
ProblemType = Literal["pothole", "damaged_fence", "signage", "lighting", "other"]

# Must match the codes seeded in public.report_statuses. Keep in step with
# STATUSES in rules.py.
ReportStatus = Literal[
    "open",
    "pending",
    "scheduled",
    "released",
    "in_progress",
    "rework",
    "rework_completed",
    "completed",
    "closed",
]


class ReportCreate(BaseModel):
    """What a member of the public sends to create a report."""

    # str_strip_whitespace: trim leading/trailing spaces before the length checks.
    # extra="forbid": reject unknown fields (e.g. id, status) with a 422.
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    # Lengths match the CHECK constraints in db/migrations/001_initial_schema.sql.
    location: str = Field(min_length=3, max_length=200)
    problem_type: ProblemType
    description: str = Field(min_length=5, max_length=2000)
    reporter_name: str = Field(min_length=1, max_length=120)
    reporter_contact: str = Field(min_length=3, max_length=200)


class ReportStatusUpdate(BaseModel):
    """What the admin sends to change a report's status."""

    # extra="forbid": reject unknown fields with a 422, as in ReportCreate.
    model_config = ConfigDict(extra="forbid")

    status: ReportStatus


class ReportOut(BaseModel):
    """What the API returns for a report: every column."""

    id: UUID
    location: str
    problem_type: str
    description: str
    reporter_name: str
    reporter_contact: str
    photo_path: str | None
    status: str
    created_at: datetime
