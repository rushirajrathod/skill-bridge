from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str
    session_id: str
    github_username: Optional[str] = None
    target_role: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    extracted_skills: List[str] = []
    ready_for_roadmap: bool = False

class RoadmapRequest(BaseModel):
    session_id: str
    target_role: str
    target_job_description: Optional[str] = None
    current_skills: List[str]
    time_investment: int = 10
    persona: str = "graduate"
    current_role: str = ""

class CourseRecommendation(BaseModel):
    title: str
    platform: str = "Coursera"
    duration: str
    level: str
    rating: float
    skills_covered: List[str]
    reasoning: str
    url: str = ""
    platform_url: str = ""  # Direct link from edX/Skillshare
    instructor: str = ""
    description: str = ""

class ProjectRecommendation(BaseModel):
    title: str
    description: str
    skills_covered: List[str]

class CertificationRecommendation(BaseModel):
    title: str
    provider: str
    cost_type: str
    url: str

class RoadmapResponse(BaseModel):
    role: str
    missing_skills: List[str]
    courses: List[CourseRecommendation]
    projects: List[ProjectRecommendation] = []
    certifications: List[CertificationRecommendation] = []
    confidence_score: float
    is_fallback: bool = False
    analytics: dict = {}
