# Advanced AI/ML System Architecture: Skill-Bridge 🧠🚀

Skill-Bridge is not just an AI wrapper; it is a complex, data-driven ecosystem that integrates **Retrieval-Augmented Generation (RAG)**, **High-Dimensional Vector Spaces**, and **Multi-Agent Orchestration** to solve the career transition problem.

## 1. System Architecture Flow
The following flowchart illustrates the dual-path onboarding strategy—where skills are derived either from traditional documents or real-world development activity.

```mermaid
graph TD
    subgraph "Data Ingestion & Embedding Pipeline"
        A[Raw CSV Data: 40k+ Courses] --> B[Data Normalization & Cleaning]
        B --> C[OpenAI text-embedding-3-small]
        C --> D[(FAISS Vector Database)]
    end

    subgraph "Multi-Modal Skill Extraction"
        E1[User Input: Resume PDF/Text] --> F1[Semantic Resume Parser]
        E2[User Input: GitHub Username] --> F2[GitHub MCP Skill Extractor]
        F1 & F2 --> G[Unified Skill Profile]
    end

    subgraph "Intelligent Query Orchestrator"
        JD[Job Description / Target Role] --> H[Safety Guardrail]
        H --> I[Semantic Feature Extractor]
    end

    subgraph "Hybrid Retrieval Layer"
        G & I --> J[FAISS Semantic Search]
        G & I --> K[Fuzzy Keyword Matcher]
        J & K --> L[Context Window Aggregator]
    end

    subgraph "Reasoning & Generation (LLM)"
        L --> M[GPT-4o-mini Reasoning Engine]
        M --> N[Skill Gap Analyzer]
        N --> O[Match % Evaluator]
        M --> P[Project & Roadmap Generator]
    end

    subgraph "Multi-Agent System"
        Q[Aura AI: Mock Interviewer]
        R[OpenAI Whisper: Transcription]
        S[OpenAI TTS: Speech Gen]
        R --> Q
        Q --> S
    end

    O --> T[Interactive Roadmap UI]
    P --> T
    S --> T
```

## 2. Core ML Components & Methodologies

### 🛠️ The RAG Pipeline (Retrieval-Augmented Generation)
Instead of relying on internal LLM knowledge, we use a **Long-Term Memory** storage via **FAISS**.
*   **Vectorization**: Thousands of courses are converted into 1536-dimensional vectors.
*   **Similarity Search**: We use **Cosine Similarity** to find the exact mathematical intersection between a user's missing skills and the available course descriptions.

### 📄 Semantic Resume Parsing Architecture
For users choosing the document path, we use a **Neural Entity Extraction** approach:
*   **Structural Inference**: The LLM parses raw text or OCR-extracted content to infer professional hierarchy and experience weight.
*   **Skill Normalization**: Converts non-standard skill descriptions into standardized taxonomy tokens for precise gap analysis.

### 🐙 GitHub Model Context Protocol (MCP) Skill Discovery
As a powerful alternative to resumes, we utilize the **Model Context Protocol** to audit a user's real-world code:
*   **Automated Skill Evidence**: `mcp_github.py` interacts with the user's repositories to extract language tags and analyze project descriptions.
*   **Logic-Based Inference**: The system identifies tech clusters (e.g., detecting "Docker" and "K8s" in descriptions) to build a high-fidelity technical profile without requiring a manually written resume.

### 🧠 Semantic Reasoning Engine
We treat the LLM as a **Probabilistic Processor** rather than a text generator:
*   **JD Context Extraction**: The engine identifies "Implicit Skills"—knowing that a "Full Stack" role implies "REST API" knowledge even if not written.
*   **Gap Determination**: A cross-reference algorithm that distinguishes between "General Knowledge" and "Tool Proficiency" (e.g., Python vs. Scikit-Learn).

### 🤖 Multi-Agent Orchestration
We utilize a decentralized approach where different agents handle specialized tasks:
*   **Career Researcher Agent**: Simulates market research to determine salary ranges and skill demand.
*   **Interview Coach Agent**: Analyzes interview transcripts to provide a personalized study plan based on technical weak points.

### 🎙️ Neural Audio Intelligence (Aura AI)
The mock interview system leverages **Synchronous Transformer Models**:
*   **Speech-to-Text (STT)**: Whisper-1 provides near-zero latency transcription of candidate speech.
*   **Text-to-Speech (TTS)**: Neural synthesis creates a human-like persona (Aura) to reduce user anxiety and increase immersion.

### 🛡️ Responsible AI & Ethical Layer
*   **PII Sanitization**: Automated regex and semantic filtering ensure no emails or phone numbers reach the LLM context.
*   **Prompt Injection Resilience**: Multi-stage guardrails prevent "jailbreaking" attempts on the system prompts.
