from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from services.agents import run_interview_coach_agent

router = APIRouter()


class InterviewCoachRequest(BaseModel):
    target_role: str
    transcript: List[dict] = []
    evaluation: dict = {}
    time_hours: int = 20


@router.post("/interview-coach")
async def interview_coach(request: InterviewCoachRequest):
    """Run the Interview Coach Agent to generate practice questions."""
    result = await run_interview_coach_agent(
        transcript=request.transcript,
        evaluation=request.evaluation,
        target_role=request.target_role,
        time_hours=request.time_hours
    )
    return result
