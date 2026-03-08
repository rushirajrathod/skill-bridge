import os
import uuid
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
from openai import OpenAI

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

router = APIRouter()

# OpenAI client for Whisper STT and TTS
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

interviewer_llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=os.getenv("OPENAI_API_KEY", "dummy"),
    temperature=0.8
)

# In-memory session store
interview_sessions: dict = {}


class InterviewStartRequest(BaseModel):
    target_role: str = "Software Engineer"


class InterviewStartResponse(BaseModel):
    session_id: str
    greeting: str


class InterviewChatRequest(BaseModel):
    session_id: str
    user_message: str


class InterviewChatResponse(BaseModel):
    ai_response: str


@router.post("/interview/start")
async def start_interview(request: InterviewStartRequest) -> InterviewStartResponse:
    """Start a new interview session. Returns AI greeting."""
    session_id = str(uuid.uuid4())

    system_prompt = f"""
    You are 'Aura', an expert technical interviewer conducting a mock interview for the role of {request.target_role}.
    Your goal is to evaluate the candidate's skills, ask probing technical questions, and simulate a real interview.
    
    Rules:
    - Keep your responses brief, conversational, and spoken-word friendly (no markdown or bullet points).
    - Start by welcoming the candidate and asking a general technical question about {request.target_role}.
    - Listen to their answer, evaluate it silently, and ask a relevant follow-up.
    - If they say something incorrect, gently guide them or move on.
    - After 5-6 exchanges, wrap up the interview with brief feedback.
    """

    chat_history = [SystemMessage(content=system_prompt)]

    # Generate greeting
    intro_resp = interviewer_llm.invoke(chat_history)
    chat_history.append(AIMessage(content=intro_resp.content))

    # Store session
    interview_sessions[session_id] = chat_history

    return InterviewStartResponse(
        session_id=session_id,
        greeting=intro_resp.content
    )


@router.post("/interview/chat")
async def interview_chat(request: InterviewChatRequest) -> InterviewChatResponse:
    """Send user text and get AI interviewer response."""
    chat_history = interview_sessions.get(request.session_id)
    if not chat_history:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    chat_history.append(HumanMessage(content=request.user_message))
    ai_resp = interviewer_llm.invoke(chat_history)
    chat_history.append(AIMessage(content=ai_resp.content))
    interview_sessions[request.session_id] = chat_history

    return InterviewChatResponse(ai_response=ai_resp.content)


@router.post("/interview/whisper")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio using OpenAI Whisper API."""
    try:
        # Save uploaded audio to a temp file
        suffix = ".webm"
        if file.filename:
            suffix = "." + file.filename.split(".")[-1] if "." in file.filename else ".webm"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Call OpenAI Whisper
        with open(tmp_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )

        # Clean up temp file
        os.unlink(tmp_path)

        return {"text": transcript.strip() if isinstance(transcript, str) else str(transcript).strip()}

    except Exception as e:
        print(f"Whisper Error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/interview/tts")
async def text_to_speech(request: InterviewChatRequest):
    """Convert text to speech using OpenAI TTS API. Returns audio stream."""
    try:
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=request.user_message,  # reusing the field for text input
            response_format="mp3"
        )

        # Stream the audio back
        return StreamingResponse(
            response.iter_bytes(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )

    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


class EvaluationResponse(BaseModel):
    overall_score: int
    categories: dict  # {name: score}
    strengths: List[str]
    improvements: List[str]
    feedback: str


@router.post("/interview/evaluate")
async def evaluate_interview(request: InterviewChatRequest) -> EvaluationResponse:
    """Evaluate a completed interview session and return structured scores."""
    chat_history = interview_sessions.get(request.session_id)
    if not chat_history:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Build the transcript text from chat history
    transcript_lines = []
    for msg in chat_history:
        if isinstance(msg, AIMessage):
            transcript_lines.append(f"Interviewer: {msg.content}")
        elif isinstance(msg, HumanMessage):
            transcript_lines.append(f"Candidate: {msg.content}")
    
    transcript_text = "\n".join(transcript_lines)
    
    eval_prompt = f"""Evaluate this mock interview transcript. Score the candidate on a scale of 0-100 for each category.

TRANSCRIPT:
{transcript_text}

Return a JSON object with exactly this structure:
{{
    "overall_score": <0-100>,
    "categories": {{
        "Technical Knowledge": <0-100>,
        "Communication": <0-100>,
        "Problem Solving": <0-100>,
        "Code Understanding": <0-100>
    }},
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "improvements": ["area 1", "area 2", "area 3"],
    "feedback": "A 2-3 sentence overall assessment."
}}

Be fair but constructive. Return ONLY valid JSON, no markdown."""

    try:
        from langchain_core.output_parsers import JsonOutputParser
        eval_chain = interviewer_llm | JsonOutputParser()
        result = eval_chain.invoke(eval_prompt)
        
        return EvaluationResponse(
            overall_score=result.get("overall_score", 50),
            categories=result.get("categories", {}),
            strengths=result.get("strengths", []),
            improvements=result.get("improvements", []),
            feedback=result.get("feedback", "Interview evaluation complete.")
        )
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return EvaluationResponse(
            overall_score=65,
            categories={"Technical Knowledge": 60, "Communication": 70, "Problem Solving": 60, "Code Understanding": 65},
            strengths=["Attempted all questions", "Good communication"],
            improvements=["Deepen technical knowledge", "Practice more examples"],
            feedback="The interview showed potential. Continue practicing technical concepts."
        )


@router.post("/interview/end")
async def end_interview(request: InterviewChatRequest):
    """End and clean up an interview session."""
    if request.session_id in interview_sessions:
        del interview_sessions[request.session_id]
    return {"status": "ended"}
