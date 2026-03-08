# Aura AI: Deep Technical Architecture & AI/ML Implementation

Aura AI is an intelligent career navigation platform designed to bridge the "final mile" gap between academic knowledge and technical job requirements. This document outlines the advanced AI/ML systems and architectural decisions powering the platform.

---

## 🏗️ System Architecture Overview

The platform is architected as a **Decoupled Intelligence Pipeline**, separating data ingestion, semantic retrieval, and generative reasoning into distinct, high-performance layers.

### 1. Multi-Modal Ingestion Layer
The "Entry Point" of user data. We don't just ask for a list of skills; we audit professional footprints.
- **Semantic Resume Parsing**: Uses LLM-based extraction to parse PDF/Text resumes into structured competency graphs, identifying hidden skills through context rather than simple keyword matches.
- **GitHub MCP (Model Context Protocol) Server**: A custom implementation that fetches live repository data (code patterns, language frequency, project complexity) to build an objective technical profile of the user.

### 2. Hybrid Retrieval Layer (RAG)
To provide real-world guidance, we index **40,000+ courses** and **100+ job roles** from open-source Kaggle datasets.
- **FAISS (Facebook AI Similarity Search)**: Dense vector indexing for near-instant semantic search. We use OpenAI `text-embedding-3-small` to map user gaps to the most relevant course segments.
- **Fuzzy Keyword Matcher**: A fallback/supplementary layer that ensures 100% accuracy for specific technical acronyms and certifications (e.g., "CKA," "AWS-CPP") where semantic embeddings might occasionally lose precision.

---

## 🤖 AI/ML Features & Orchestration

### 🎙️ Aura AI Interviewer (Voice-First Intelligence)
The interview simulator is a low-latency, multi-agent loop:
- **STT (Speech-to-Text)**: **OpenAI Whisper** handles high-fidelity transcription, even with varying accents and background noise.
- **TTS (Text-to-Speech)**: **OpenAI TTS-1** provides natural, human-like voice feedback, making the "Aura" agent feel like a real technical coach.
- **Evaluation Agent**: After the interview, a specialized agent evaluates the transcript based on technical depth, communication, and specific skill clusters, generating a Radar-chart visual of the user's performance.

### 🧠 Synthesis & Reasoning Engine
Powered by **GPT-4o-mini**, this layer coordinates the entire user journey:
- **Skill Gap Analyzer**: Compares the Ingestion Layer output against the Target Role to find the "missing delta."
- **Capstone Project Generator**: Synthesizes custom, full-stack project ideas designed specifically to fill that user's unique gaps.
- **Learning Roadmap Generator**: Sequences course recommendations into a chronological, time-boxed technical spine.

### 💬 Project Hub & Interactive Chatbots
Each capstone project includes a dedicated **LangChain-powered chatbot**.
- **Context-Aware Tutoring**: The bot has the full project requirements in its "system prompt," allowing it to walk users through implementation details, debug logic, and explain fundamental concepts.

---

## ⚙️ Technical Trade-offs

| Choice | Selection | Reason |
| :--- | :--- | :--- |
| **Vector DB** | **Local FAISS** over Pinecone | Eliminated 200ms network latency; made RAG searches instantaneous. |
| **State Management** | **Zustand Persistence** | Cached AI results to browser disk to prevent redundant $0.05 API calls during navigation. |
| **Data Source** | **Kaggle Dataset** over Web Scraping | Ensured "Data Integrity"—recommending real, verified courses instead of hallucinated AI links. |
| **Search Logic** | **Hybrid** over Pure Vector | Guaranteed literal accuracy for technical certifications where embeddings can be too "fuzzy." |

---

## 🎯 Target Audience & Impact
- **Recent Graduates**: Identifies the exact certifications needed to become competitive.
- **Career Switchers**: Quantifies **transferable skills** (e.g., moving from Chemical Engineering to Cloud Architect).
- **Mentors**: Provides a data-backed growth roadmap for mentes.

**Aura AI turns a fragmented job market into a structured, achievable technical roadmap.**
