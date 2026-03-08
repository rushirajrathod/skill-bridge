from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from services.mcp_github import analyze_github_profile

router = APIRouter()

class GithubRequest(BaseModel):
    username: str

class GithubResponse(BaseModel):
    skills: List[str]

@router.post("/analyze", response_model=GithubResponse)
async def analyze_github(request: GithubRequest):
    skills = await analyze_github_profile(request.username)
    return GithubResponse(skills=skills)
