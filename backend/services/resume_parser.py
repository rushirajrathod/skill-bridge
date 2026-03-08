import pdfplumber
import io
import os
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# Re-use our central LLM for logic 
# We don't import from ai_service directly to avoid circular deps with routers if needed,
# but since ai_service holds the main instance, we can import it.
from services.ai_service import chat_llm

async def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from a PDF or basic TXT file."""
    text = ""
    if filename.lower().endswith(".pdf"):
         try:
             with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                 for page in pdf.pages:
                     page_text = page.extract_text()
                     if page_text:
                         text += page_text + "\n"
         except Exception as e:
             print(f"Error parsing PDF: {e}")
             return ""
    else:
         # Assumes plain text fallback
         try:
            text = file_bytes.decode('utf-8')
         except:
            text = ""
            
    return text

async def extract_skills_from_resume(text: str) -> List[str]:
    """Uses OpenAI to find technical and soft skills in the parsed resume text."""
    if not text.strip():
        return []
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical recruiter. Extract a comma-separated list of ONLY the core technical skills, programming languages, tools, and relevant soft skills found in the following resume text. Do not include experience details or conversational text. If none, return 'NONE'."),
        ("user", "{text}")
    ])
    
    try:
        response = chat_llm.invoke(prompt.format_messages(text=text[:4000])) 
        content = response.content.strip()
        
        if content.upper() == "NONE":
            return []
            
        skills = [s.strip() for s in content.split(',') if len(s.strip()) > 1]
        return skills
    except Exception as e:
        print(f"Resume extraction error: {e}")
        return []
