from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Must match the reports_problem_type_chk CHECK constraint.
ProblemType = Literal["pothole", "damaged_fence", "signage", "lighting", "other"]


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
