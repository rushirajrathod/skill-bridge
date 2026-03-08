from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict
import uuid

from models import ChatRequest, ChatResponse
from services.ai_service import chat_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

router = APIRouter()

# In-memory store for demo. In production, use Redis or SQLite.
sessions: Dict[str, dict] = {}

SYSTEM_PROMPT = """
You are 'Aura', an expert AI Career Navigator for the Skill-Bridge platform.
Your objective is to help the user generate a personalized learning roadmap to bridge the gap between their current skills and their dream job.

Follow this conversational flow:
1. GREETING: Welcome them and ask what role they are aiming for (e.g., "Data Scientist", "Frontend Engineer").
2. GATHER CURRENT SKILLS: Once they provide a role, ask them to describe their current skills, paste their resume, or provide their GitHub username so you can analyze their repos.
3. CONFIRM & PROCEED: Once you have BOTH their target role AND a list of current skills (either explicitly stated or extracted from text), summarize their profile briefly and tell them you are ready to generate their interactive roadmap. Include the command "<READY_FOR_ROADMAP>" in your response.

Stay friendly, encouraging, and concise. Do not generate the roadmap yourself; the frontend will use the system tools for that once you signal readiness with "<READY_FOR_ROADMAP>".

CRITICAL INSTRUCTIONS:
Always maintain context from previous turns.
Extract all identifiable technical skills (e.g., Python, React, AWS, Communication) and keep a running list throughout the conversation.
If they mention an unclear role, ask for clarification.
"""

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, background_tasks: BackgroundTasks):
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        
    if session_id not in sessions:
        sessions[session_id] = {
            "history": [SystemMessage(content=SYSTEM_PROMPT)],
            "extracted_skills": set(),
            "target_role": request.target_role or None
        }

    session = sessions[session_id]
    
    # Check for github integration intent and maybe fire async github task in a real app
    # For now, it's simulated.
        
    try:
        # Add user message
        session["history"].append(HumanMessage(content=request.message))
        
        # Invoke LLM
        response = chat_llm.invoke(session["history"])
        ai_msg = response.content
        session["history"].append(AIMessage(content=ai_msg))
        
        # We also need to run a quick background extraction to update our skill set
        # For simplicity in this endpoint, we'll do a quick secondary LLM call or regex, 
        # but to save time & API calls, we'll just check if they explicitly listed known skills using a simple heuristic 
        # or use a dedicated structured output parser. Let's do a fast secondary extractor.
        
        extractor_prompt = ChatPromptTemplate.from_messages([
            ("system", "Extract a comma-separated list of technical and soft skills mentioned in this text. If none, return exactly 'NONE'."),
            ("user", "{text}")
        ])
        
        extraction_resp = chat_llm.invoke(extractor_prompt.format(text=request.message))
        if extraction_resp.content.strip().upper() != "NONE":
            skills = [s.strip() for s in extraction_resp.content.split(',') if len(s.strip()) > 1]
            for s in skills:
                session["extracted_skills"].add(s)
                
        # Update role if provided
        if request.target_role:
             session["target_role"] = request.target_role
             
        ready = "<READY_FOR_ROADMAP>" in ai_msg
        clean_msg = ai_msg.replace("<READY_FOR_ROADMAP>", "").strip()

        return ChatResponse(
            response=clean_msg,
            extracted_skills=list(session["extracted_skills"]),
            ready_for_roadmap=ready
        )
        
    except "openai.APIConnectionError" as e:
        # Implementing the explicit Fallback Requirement for when AI is unavailable
        print("Falling back to rule-based chat")
        return ChatResponse(
            response="I'm having trouble connecting to my brain right now, but we can stick to the basics. Please just list your current skills and target role separated by a hyphen (e.g., 'Python, SQL - Data Engineer').",
            extracted_skills=["Fallback Mode"],
            ready_for_roadmap=False
        )
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

from services.resume_parser import extract_text_from_file, extract_skills_from_resume

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), session_id: str = Form("new")):
    """Parses a resume file and injects skills into the active session."""
    
    # Initialize basic session struct if new
    if session_id == "new" or session_id not in sessions:
        sessions[session_id] = {
            "history": [SystemMessage(content=SYSTEM_PROMPT)],
            "extracted_skills": set(),
            "target_role": None
        }

    session = sessions[session_id]
        
    try:
        file_bytes = await file.read()
        text = await extract_text_from_file(file_bytes, file.filename)
        skills = await extract_skills_from_resume(text)
        
        for s in skills:
            session["extracted_skills"].add(s)
            
        return {
            "message": f"Successfully parsed {file.filename} and found {len(skills)} technical skills.",
            "skills": list(skills)
        }
    except Exception as e:
        print(f"File Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse resume.")
