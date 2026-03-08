from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from services.ai_service import generate_projects, project_chat

router = APIRouter()

class ProjectGenerateRequest(BaseModel):
    target_role: str
    missing_skills: List[str]

class ProjectChatRequest(BaseModel):
    session_id: str
    message: str
    project_context: str

@router.post("/generate")
async def handle_generate_projects(req: ProjectGenerateRequest):
    projects = generate_projects(req.target_role, req.missing_skills)
    return {"projects": projects}

@router.post("/chat")
async def handle_project_chat(req: ProjectChatRequest):
    response = project_chat(req.session_id, req.message, req.project_context)
    return {"response": response}

class ProjectInitRequest(BaseModel):
    session_id: str
    project_context: str

@router.post("/init-chat")
async def handle_init_chat(req: ProjectInitRequest):
    from services.ai_service import init_project_chat
    response = init_project_chat(req.session_id, req.project_context)
    return {"response": response}
