<h1 align="center">
  🧠 ResearchHub AI
</h1>

<p align="center">
  <strong>A multi-agent AI platform for accelerating academic research</strong><br/>
  Upload papers → Let AI find contradictions, gaps, and generate synthesis reports
</p>

<p align="center">
  <a href="https://research-hub-ai-rho.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-FF6B35?style=for-the-badge" alt="Groq" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
</p>

---

## 📌 Overview

**ResearchHub AI** is a full-stack research automation platform that lets academics and researchers upload their literature and have a multi-agent AI system automatically:

- 🔍 **Find contradictions** between papers
- 🕳️ **Detect research gaps** and unexplored areas  
- 📝 **Generate literature reviews** exportable to PDF, Markdown, and PPTX
- 💬 **Answer questions** about your papers using RAG (Retrieval-Augmented Generation)
- 🔎 **Search and import papers** directly from arXiv and PubMed

> Built as a portfolio/resume project demonstrating full-stack development, AI integration, and cloud deployment skills.

---

## 🚀 Live Demo

| Service | URL | Platform |
|---|---|---|
| **Frontend** | https://research-hub-ai-rho.vercel.app/ | Vercel |
| **Backend API** | https://researchhub-ai-ke4d.onrender.com/ | Render |
| **API Docs** | https://researchhub-ai-ke4d.onrender.com/docs | FastAPI Swagger |

> ⚠️ **Note:** The backend is hosted on Render's free tier. First request may take up to 30 seconds if the server is cold-starting. Subsequent requests are instant.

---

## ✨ Features

### 🗂️ Workspace Management
- Create isolated research workspaces — each with its own AI context
- Upload PDFs, DOCX, and TXT documents per workspace
- View all uploaded papers with expandable metadata

### 🤖 AI Chat Agent (RAG-powered)
- Ask natural language questions about your uploaded papers
- AI responses stream in real time (token by token)
- Context indicator shows exactly which document chunks were used
- Pin important AI responses to the Insights Panel
- Voice input support (microphone dictation)

### 🧪 Multi-Agent AI Analysis
- **Contradiction Detection** — Find opposing claims across documents
- **Gap Analysis** — Identify unexplored research opportunities
- **Literature Review Generator** — Auto-generate comprehensive reviews

### 📤 Export Options
- Export literature reviews as **PDF**, **Markdown**, or **PowerPoint (PPTX)**

### 🔎 Paper Search & Import
- Search **arXiv** and **PubMed** directly from the platform
- One-click import into any workspace

### 🔐 Authentication
- Supabase-powered auth (email + password)
- Protected routes — all dashboard content requires login
- Session persists across page refreshes

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7.x | Build tool & dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.x | Animations & transitions |
| React Router DOM | 7.x | Client-side routing |
| Supabase JS | 2.x | Auth & database client |
| Lucide React | 0.575 | Icon library |
| React Markdown | 10.x | Render AI responses as Markdown |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.104 | REST API framework |
| Python | 3.11+ | Backend language |
| Groq SDK | 0.12+ | LLM API (Llama 3.3 70B) |
| Qdrant Client | 1.7 | Vector database (in-memory) |
| ONNX Runtime | 1.19+ | Local embedding model inference |
| Supabase Python | 2.28 | Database & auth |
| PDFPlumber | latest | PDF text extraction |
| python-docx | latest | DOCX parsing |
| python-pptx | latest | PPTX export |
| ReportLab | latest | PDF generation |
| Uvicorn | 0.24 | ASGI server |

### Infrastructure
| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting & CDN |
| **Render** | Backend API hosting |
| **Supabase** | PostgreSQL database + authentication |
| **Groq** | LLM inference (Llama 3.3 70B at 500+ tokens/sec) |
| **UptimeRobot** | Keep-alive pings to prevent Render cold starts |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                                                              │
│  React 19 + Vite (Vercel CDN)                               │
│  ├── AuthContext (Supabase session)                         │
│  ├── DashboardLayout (responsive sidebar)                   │
│  ├── AIAgentsView (RAG chat interface)                      │
│  ├── WorkspaceView (upload + papers list)                   │
│  └── SearchPapersView (arXiv / PubMed)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Render)                        │
│                                                              │
│  Routers:                                                    │
│  ├── /workspaces  → CRUD for workspaces                     │
│  ├── /papers      → Upload, parse, manage papers            │
│  ├── /chat        → RAG chat with streaming SSE             │
│  ├── /analytics   → Dashboard stats & timeline              │
│  ├── /integrations → arXiv + PubMed search                  │
│  └── /collaboration, /comments                              │
│                                                              │
│  Services:                                                   │
│  ├── vector_db.py    → Qdrant in-memory + ONNX embeddings   │
│  ├── chat_agent.py   → Groq Llama 3.3 70B RAG pipeline     │
│  ├── document_parser.py → PDF/DOCX/TXT text extraction      │
│  ├── report_generator.py → PDF/MD literature review         │
│  └── agents/         → Contradiction, Gap, Summarization    │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
┌──────────────────────┐          ┌─────────────────────────┐
│   Supabase           │          │   Groq API              │
│   ├── PostgreSQL     │          │   Llama 3.3 70B         │
│   ├── Auth (JWT)     │          │   500+ tokens/sec       │
│   └── RLS policies   │          └─────────────────────────┘
└──────────────────────┘
```

---

## 📁 Project Structure

```
ResearchHub-AI/
├── backend/
│   ├── main.py                    # FastAPI app entry point + startup
│   ├── requirements.txt           # Python dependencies
│   ├── download_model.py          # ONNX model download script
│   ├── migration_combined.sql     # Full database schema
│   ├── supabase_schema.sql        # Supabase table definitions
│   ├── routers/
│   │   ├── workspaces.py          # Workspace CRUD endpoints
│   │   ├── papers.py              # Upload, parse, delete papers
│   │   ├── chat.py                # RAG streaming chat endpoint
│   │   ├── analytics.py           # Dashboard analytics
│   │   ├── integrations.py        # arXiv & PubMed search
│   │   ├── collaboration.py       # Shared workspace features
│   │   └── comments.py            # Paper comments
│   ├── services/
│   │   ├── vector_db.py           # Qdrant + ONNX embedding service
│   │   ├── chat_agent.py          # RAG pipeline (retrieve + generate)
│   │   ├── document_parser.py     # PDF/DOCX/TXT text extraction
│   │   ├── context_compressor.py  # Token limit management
│   │   ├── report_generator.py    # PDF/MD report generation
│   │   ├── presentation_generator.py # PPTX generation
│   │   └── agents/
│   │       ├── agent_router.py        # Routes analysis requests
│   │       ├── contradiction_agent.py # Finds contradicting claims
│   │       ├── gap_detection_agent.py # Identifies research gaps
│   │       └── summarization_agent.py # Paper summarization
│   └── utils/
│       ├── auth.py                # JWT token verification
│       └── supabase_client.py     # Supabase admin client
│
├── frontend/
│   ├── index.html                 # App entry point
│   ├── vite.config.ts             # Vite + code splitting config
│   ├── package.json               # Node.js dependencies
│   ├── src/
│   │   ├── main.tsx               # React root render
│   │   ├── App.tsx                # Routes definition
│   │   ├── index.css              # Global styles + dark mode tokens
│   │   ├── store/
│   │   │   └── AuthContext.tsx    # Session state (React Context)
│   │   ├── lib/
│   │   │   ├── api.ts             # Authenticated fetch wrapper
│   │   │   ├── supabase.ts        # Supabase browser client
│   │   │   └── utils.ts           # cn() helper
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx # Sidebar + responsive nav
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx    # Public marketing page
│   │   │   ├── AuthPage.tsx       # Login / Sign up
│   │   │   ├── DashboardView.tsx  # Workspace grid + analytics
│   │   │   ├── WorkspaceView.tsx  # Paper upload + management
│   │   │   ├── AIAgentsView.tsx   # RAG chat interface
│   │   │   ├── AIToolsView.tsx    # Contradiction/Gap/Review tools
│   │   │   ├── SearchPapersView.tsx # arXiv + PubMed search
│   │   │   └── SettingsView.tsx   # User settings
│   │   ├── components/
│   │   │   ├── AIToolsPanel.tsx   # Inline AI tools panel
│   │   │   ├── InsightsPanel.tsx  # Pinned messages sidebar
│   │   │   ├── ActivityTimeline.tsx # Recent activity feed
│   │   │   ├── AnalyticsOverview.tsx # Stats cards
│   │   │   ├── CommentSection.tsx # Paper comments
│   │   │   ├── WorkspaceSettingsModal.tsx
│   │   │   └── UpgradeModal.tsx   # Free tier limit modal
│   │   └── hooks/
│   │       └── useWorkspaces.ts   # Workspace data fetching hook
│   └── public/
│
└── .gitignore
```

---

## ⚙️ Local Setup

### Prerequisites
- **Node.js** v18+ and **npm** v9+
- **Python** 3.11+
- **Git**
- A **Supabase** project (free tier)
- A **Groq** API key (free at [console.groq.com](https://console.groq.com))

---

### 1. Clone the Repository

```bash
git clone https://github.com/saiteja7065/ResearchHub-AI.git
cd ResearchHub-AI
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download the ONNX embedding model (required for vector search)
python download_model.py
```

Create a `.env` file in the `backend/` directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key

# Groq LLM
GROQ_API_KEY=your-groq-api-key

# CORS (comma-separated list of allowed frontend origins)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

Backend is now running at: `http://localhost:8000`  
API documentation: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
# Supabase (public anon key — safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend dev server:

```bash
npm run dev
```

Frontend is now running at: `http://localhost:5173`

---

### 4. Database Setup

Run the SQL schema in your Supabase project's SQL Editor:

```bash
# The file is at:
backend/migration_combined.sql
```

Copy the contents and run it in **Supabase → SQL Editor → New Query**.

---

## 🗄️ Database Schema

```sql
-- Core tables in Supabase PostgreSQL:
profiles          -- User profile data
workspaces        -- Research workspaces per user
papers            -- Uploaded/imported papers with metadata
workspace_members -- Collaboration memberships
paper_comments    -- Comments on individual papers
pinned_insights   -- AI responses pinned to Insights Panel
```

All tables use **Row Level Security (RLS)** — users can only access their own data.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/workspaces` | List user's workspaces |
| `POST` | `/workspaces` | Create new workspace |
| `GET` | `/workspaces/{id}/papers` | List papers in workspace |
| `POST` | `/workspaces/{id}/upload` | Upload & parse a document |
| `DELETE` | `/workspaces/{id}/papers/{paper_id}` | Delete a paper |
| `POST` | `/chat/{workspace_id}` | RAG chat (streaming SSE) |
| `GET` | `/analytics/dashboard` | Dashboard stats |
| `GET` | `/analytics/timeline` | Activity timeline |
| `GET` | `/integrations/search` | Search arXiv / PubMed |
| `POST` | `/integrations/import` | Import paper to workspace |

> Full interactive docs available at `/docs` when running locally.

---

## 🧠 How the RAG Pipeline Works

```
User Question
     │
     ▼
1. ENCODE QUERY
   └── ONNX MiniLM-L6-v2 model encodes question → 384-dim vector

2. VECTOR SEARCH
   └── Qdrant searches workspace's in-memory collection
   └── Returns top-5 most relevant document chunks

3. CONTEXT BUILDING
   └── context_compressor.py limits chunks to token budget
   └── Assembles system prompt + retrieved context + question

4. LLM GENERATION
   └── Groq API → Llama 3.3 70B model
   └── Streams response back to frontend via SSE

5. RESPONSE DELIVERY
   └── Frontend renders tokens as they arrive
   └── Source indicator shows how many chunks were used
```

---

## 🚀 Deployment

### Frontend — Vercel

1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` → your Render backend URL
4. Deploy — Vercel auto-deploys on every push to `main`

### Backend — Render

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   ```
   Root Directory:  backend
   Build Command:   pip install -r requirements.txt && python download_model.py
   Start Command:   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Add environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `GROQ_API_KEY`
   - `ALLOWED_ORIGINS` → your Vercel frontend URL

### Keep-Alive — UptimeRobot

To prevent Render free tier cold starts:
1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Add a new **HTTP(s) Monitor**:
   - URL: `https://your-render-url.onrender.com/`
   - Interval: **Every 5 minutes**
3. Save — your backend will never sleep again ✅

---

## 🧪 Testing

This project has a comprehensive test suite with **104 manually written test cases** covering all major features.

| Module | Test Cases | Types |
|---|---|---|
| Landing Page | 10 | Positive, Negative, UI |
| Authentication | 12 | Positive, Negative, Boundary, Security |
| Workspace Management | 10 | Positive, Negative, Boundary |
| Document Upload | 10 | Positive, Negative, Boundary |
| AI Chat Agent | 12 | Positive, Negative, Integration |
| Paper Search | 8 | Positive, Negative |
| AI Tools | 8 | Positive, Negative, Integration |
| Responsiveness | 10 | UI (375px, 768px, 1280px) |
| Security | 8 | XSS, SQL Injection, CORS, Auth |
| Performance | 6 | Load time, Bundle size, Cold start |
| Regression | 10 | Critical path after any change |
| **Total** | **104** | All types covered |

Automation with **Playwright** is planned for CI/CD integration.

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_KEY` | Supabase service role key (secret) | ✅ |
| `GROQ_API_KEY` | Groq API key for LLM inference | ✅ |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | ✅ |

### Frontend (`frontend/.env`)
| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | ✅ |
| `VITE_API_BASE_URL` | Backend API base URL | ✅ |

---

## ⚡ Performance Optimizations

- **Code Splitting** — Vendor libraries split into separate cached chunks (bundle: 845 kB → 331 kB largest chunk)
- **Lazy Loading** — React components load on demand per route
- **Background Indexing** — Qdrant re-indexing runs in background on startup, server binds to port immediately
- **ONNX Model** — Local embedding model instead of external API calls for vector search
- **UptimeRobot** — Eliminates Render cold start delays at zero cost

---

## 🤝 Contributing

This is a personal portfolio project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 👤 Author

**Sai Teja Garlapati**

[![GitHub](https://img.shields.io/badge/GitHub-saiteja7065-black?style=flat-square&logo=github)](https://github.com/saiteja7065)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-saitejagarlapati-blue?style=flat-square&logo=linkedin)](https://linkedin.com/in/saitejagarlapati)
[![Email](https://img.shields.io/badge/Email-saitejagarlapati5695@gmail.com-red?style=flat-square&logo=gmail)](mailto:saitejagarlapati5695@gmail.com)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by Sai Teja Garlapati &nbsp;|&nbsp; 
  <a href="https://research-hub-ai-rho.vercel.app/">Live Demo</a>
</p>
