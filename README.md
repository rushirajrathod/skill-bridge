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
- **Data**: Synthetic CSV catalogs processing 40,000+ courses and 100+ simulated tech positions.

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
