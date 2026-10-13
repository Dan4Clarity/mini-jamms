from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Must match the reports_problem_type_chk CHECK constraint, as last redefined in
# db/migrations/002_add_problem_types_user_type_and_updated_at.sql.
ProblemType = Literal[
    "pothole",
    "damaged_fence",
    "signage",
    "lighting",
    "other",
    "damaged_attenuator",
    "roadside_littering",
    "roadside_accident",
]

# Must match the reports_user_type_chk CHECK constraint (migration 002).
UserType = Literal["public", "staff", "stakeholder"]

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
    # A field with a default may be left out of the request body, in which case
    # it is "public" (the same default as the column). If it is sent, it must be
    # one of the three UserType values; null is rejected because None is not one.
    user_type: UserType = "public"


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
    user_type: str
    # Set by the database (column default on INSERT, trigger on UPDATE), never
    # by the API.
    updated_at: datetime
