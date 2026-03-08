from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Skill-Bridge API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api import chat, github, roadmap, interview, agents, roles, courses, projects

app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(github.router, prefix="/api/github", tags=["GitHub"])
app.include_router(roadmap.router, prefix="/api/roadmap", tags=["Roadmap"])
app.include_router(interview.router, prefix="/api", tags=["Interview"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
