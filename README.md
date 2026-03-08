# Skill-Bridge: AI-Powered Career Roadmap & Project Hub 

**Candidate Name:** rushiraj (rushi) rathod  
**Scenario Chosen:** Skill-Bridge Career Navigator  
**Estimated Time Spent:** 6 hours  
**Demo Video:** [https://www.youtube.com/watch?v=xshf5NcRsxo](https://www.youtube.com/watch?v=xshf5NcRsxo)
** Demo Video cut-out few second early but I was just saying 'Thank you🙂'

### Motivation
The idea for this project came from something I noticed personally. Many students and early-career professionals know the fundamentals, but they struggle with the “final mile” gap, the difference between what they learn in school and the specific skills companies actually look for. I saw this with friends when someone transitioned from Chemical Engineering to Cloud Architecture. There was no clear roadmap, just scattered job postings and courses.

---

Skill-Bridge is an intelligent, interactive career navigation platform. It utilizes AI and Large Language Models (LLMs) to analyze a user's current skills against their dream role, generating a highly personalized, interactive roadmap complete with custom capstone projects, professional certifications, and technical mentorship.

## Key Features
- **AI Career Gap Analysis**: Uses semantic vector search (FAISS) across thousands of job descriptions and courses.
- **Interactive Multi-Skill Node Map**: Renders an interactive, step-by-step technical learning spine.
- **LLM Project Hub**: Generates 100% custom portfolio projects designed specifically to fill a user's uniquely missing skills.
- **Interactive Technical Tutor**: Features a LangChain-powered conversational AI mentor to walk you through your capstone projects.
- **Dynamic Skill Match Percentage**: Utilizes an AI HR Recruiting algorithm evaluator to compute realistic readiness.

## Tech Stack
- **Frontend**: Next.js 15, React, Framer Motion, Zustand, Tailwind CSS, ShadCN
- **Backend**: FastAPI, Python, LangChain, FAISS, OpenAI Embeddings & GPT-4o
- **Data**: Open sourced real data of CSV catalogs processing 40,000+ courses and 100+ simulated tech positions.

## Machine Learning Architecture 🧠

Skill-Bridge utilizes a multi-layered ML approach to ensure high-fidelity career guidance:

### 1. Vector Search & RAG (Retrieval-Augmented Generation)
- **OpenAI Embeddings (`text-embedding-3-small`)**: Powers the semantic understanding of 40,000+ courses.
- **FAISS (Facebook AI Similarity Search)**: Handles extreme-speed vector indexing for real-time skill-to-course matching.

### 2. Semantic Reasoning (LLM)
- **GPT-4o-mini**: Orchestrates career gap analyses by evaluating the context and depth of candidate skills.
- **Custom AI Evaluator**: An HR-weighted recruiting algorithm that computes semantic readiness (Match %) rather than simple keyword counts.

### 3. Speech & Audio Intelligence (Aura AI)
- **OpenAI Whisper (`whisper-1`)**: High-accuracy speech-to-text for real-time interviewer transcription.
- **OpenAI TTS (`tts-1`)**: Natural, low-latency text-to-speech for conversational AI mentorship.

### 4. Fuzzy Aggregation & Analysis
- **Fuzzy String Matching**: Consolidation of disparate skill terminology across 100+ job sources.
- **Weighted Word Overlap**: Prioritizes job description relevance based on title and skill density.
--- 
# Project Architecture (high level)

Frontend (Next.js)
        |
        |
    FastAPI API
        |
        |
   AI Orchestration
     (LangChain)
        |
        |
Vector Search (FAISS)
        |
        |
Course Dataset (40k+)
        |
        |
   SQLite Storage
   
---

## AI Disclosure
- **Did you use an AI assistant (Copilot, ChatGPT, etc.)?** Yes (Cloud Code / Antigravity).
- **How did you verify the suggestions?** Manual code review, running automated tests (Pytest), and performing live functional verification to ensure state persistence and correct data propagation.
- **Give one example of a suggestion you rejected or changed:** At one point, the AI suggested a FastAPI implementation that returned course recommendations but did not properly handle edge cases where no vector results were returned. This would have caused the API to crash when the FAISS index returned an empty list.

I rewrote that section to add proper validation and fallback logic so the system returns a safe response instead of failing.

## Tradeoffs & Prioritization
- **What did you cut to stay within the 4–6 hour limit?** I prioritized architectural stability, core AI logic, and state persistence over secondary features like **User Authentication**.
- **What would you build next if you had more time?** I would implement **OAuth-based authentication** (GitHub/Google) to enable personalized user profiles, deeper **persona-based outcomes** (advanced career-switching logic), and real-time job market trend analysis via APIs.
- **Known limitations**: Course data is static from the dataset, the platform currently lacks a persistent user login system, and voice recognition (Whisper) performs best in quiet environments. AI responses may occasionally contain inaccuracies or hallucinations. For this reason, the platform includes AI disclaimers reminding users that recommendations should be used as guidance.

---
## Responsible AI

The project was designed with responsible AI practices in mind.
	•	AI recommendations are treated as guidance, not guaranteed answers
	•	The interface includes AI disclaimers so users understand that results may not always be perfect
	•	The system does not make automated hiring decisions
	•	No sensitive personal data is stored

The goal is to use AI as a decision-support tool rather than replacing human judgment.
--- 
## Getting Started

### 1. Prerequisites
- **Python**: 3.9+
- **Node.js**: 18+
- **OpenAI API Key** (Set in `backend/.env`)

### 2. Backend Setup (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Copy the .env.example to .env and add your OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### 4. Test Commands
```bash
# Backend Tests
cd backend
pytest

# Frontend Tests
cd frontend
npm test
```

Navigate to `http://localhost:3000` to start your career transition roadmap!
