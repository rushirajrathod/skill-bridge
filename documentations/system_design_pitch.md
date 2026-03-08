# System Design (1-Min Pitch)

## The Core Engineering Flow
"I architected the platform as a **decoupled Intelligence Pipeline**:

1.  **Multi-Modal Ingestion**: Real-time extraction of user competencies using deep-parsing for Resumes and a **GitHub MCP Server** for live repository analysis.
2.  **Hybrid RAG Layer**: A dual-lookup system using **FAISS vector search** for semantic contextualization and **Fuzzy Keyword Matching** for strict technical requirements (e.g., certifications).
3.  **Synthesis Engine**: A reasoning layer that orchestrates extracted gaps, retrieved courses, and project templates into a coherent, time-boxed Roadmap."

## Critical Trade-offs (What & Why)
"I made three key technical trade-offs to optimize for speed and costs:
-   **Local FAISS over Pinecone**: I chose a local vector index to eliminate the 200ms network round-trip of a managed cloud DB. This makes our search instantaneous.
-   **Zustand Persistence over Local State**: I chose to persist the entire dashboard state to disk. This trades a tiny bit of browser memory to prevent redundant $0.05 API calls during back-navigation.
-   **Hybrid Retrieval over Pure Vector**: I chose a dual-path search. Pure vector search often misses exact acronyms (like 'AWS AWS-CPP'), so the fuzzy matcher ensures accuracy where embeddings fail."

---

### Highlights
- **Stack**: Next.js 15, FastAPI, FAISS.
- **Tools**: GitHub MCP, Whisper STT, OpenAI TTS.
- **Strategy**: Low-latency, zero-redundancy RAG architecture.
