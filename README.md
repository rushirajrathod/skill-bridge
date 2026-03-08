# Skill-Bridge: AI-Powered Career Roadmap & Project Hub 🚀

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

## Getting Started

### 1. Backend Setup (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Copy the `.env.example` to `.env` and add your OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to start your career transition roadmap!
