# ResearchHub AI - Ultimate Hybrid Showcase

## Intelligent Multi-Agent Research Platform for Discovery & Analysis

---

## 📌 Project Overview
ResearchHub AI is an advanced Agentic AI-powered research platform designed to automate research paper discovery, perform semantic multi-document analysis, and detect research gaps. 

Built with the dual purpose of demonstrating **hardcore AI engineering** for job interviews/exhibitions and laying a **scalable SaaS foundation** for a future startup. It integrates foundational web architecture, advanced multi-agent AI, and enterprise-grade documentation intelligence (voice search, multi-format parsing, PPTX generation).

**Target Audience:** Researchers, PhD Scholars, AI Recruiters, and Exhibition Attendees.
**Market Positioning:** "A multi-agent AI that doesn't just read papers for you, it finds where scientists disagree."

---

## 🏗 Core Architecture

### Tech Stack
**Frontend (Premium UI/UX & Interaction):**
* React + TypeScript
* Tailwind CSS + UI Component Libraries (e.g., shadcn/ui, Aceternity UI)
* Clerk (Secure User Authentication & Session Management)
* Web Speech API (Native browser voice-enabled interaction)
* Zustand (State Management)

**Backend (High-Performance Engine):**
* FastAPI (Python)
* PostgreSQL + SQLAlchemy (For Workspaces & Metadata)
* Redis (Caching & Task Queues)
* Unstructured.io (Multi-format document parsing: PDF, DOCX, TXT)
* python-pptx (Automated Presentation Generation)

**AI & Retrieval Layer:**
* Qdrant (Vector Database)
* Sentence Transformers (Embeddings)
* Hybrid Retrieval (Semantic + Keyword)
* Groq / Llama 3.3 70B (Core LLM Reasoning)
* Multi-Agent Orchestration Framework

---

## 🚀 The 3-Phase Development Roadmap

### Phase 1: The SaaS Foundation (Plan 1)
* **User Authentication:** Clerk integration for secure login/signup. Researchers can create isolated workspaces (e.g., "Deep Learning" vs. "Biotech").
* **Multi-Format Ingestion:** Users upload local PDFs, Word docs, or access databases. Powered by `Unstructured.io` for robust parsing.
* **Basic RAG & Chatbot:** Context-aware AI chat (Groq Llama 3) that answers specific queries based *only* on the active workspace.
* **Premium Dashboard UI:** Highly polished, dark-mode ready dashboard with recent papers and usage metrics.

### Phase 2: The Core RAG & Research Engine (Plan 2)
* **Cross-Paper Contradiction Detection:** Autonomous agent that extracts core claims across multiple papers, compares embeddings, and highlights opposing conclusions.
* **Research Gap Detection:** Uses clustering algorithms on vectors to identify sparse thematic regions, suggesting unexplored avenues.
* **Multi-Agent Architecture:** Specialized prompts and retrievals divided among agents (Summarization Agent, Comparison Agent, Gap Agent).

### Phase 3: The Hybrid Showpiece (AI Document System Integration)
* **Presentation Generation (PPTX Export):** Let the AI auto-generate a 10-slide PowerPoint summarizing literature contradictions, built via `python-pptx`, ready for download.
* **Voice-Enabled Interface:** Users click a microphone icon to talk to their papers instead of typing.
* **Streaming AI Responses:** WebSockets/SSE so the user sees the AI "typing" its analysis in real-time, crucial for exhibition visual appeal.

---

## ⏳ Estimated Timeline (2-3 Hours/Day)
*Total Expected Time: ~7 to 8 Weeks*

1. **Phase 1 (Foundation):** ~2 Weeks
2. **Phase 2 (Advanced AI Features):** ~3 Weeks
3. **Phase 3 (Polish & Integrations):** ~2 Weeks

---
## PROJECT STRUCTURE

```plaintext
ResearchHub-AI/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── agents/            # Multi-agent logic (Contradiction, Summarization)
│   ├── models/            # SQLAlchemy DB Models
│   ├── routers/           # FastAPI Endpoints
│   ├── services/          # RAG Pipeline, Qdrant, Unstructured.io, PPTX gen
│   └── utils/             # Helper functions, config
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI elements (shadcn)
│   │   ├── pages/         # Dashboard, Workspace, Chat views
│   │   ├── store/         # Zustand state management
│   │   ├── lib/           # Axios config, API clients
│   │   └── App.tsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```
