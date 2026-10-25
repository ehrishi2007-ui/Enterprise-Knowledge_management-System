# Enterprise Knowledge Management System (EKMS)
### Complete Technical Architecture, Implementation & User Guide — Derived from the Live Codebase

| SYSTEM VERSION | PRIMARY LLM | HYBRID RETRIEVAL | LOCAL VECTORIZER | BAAS LAYER | VECTOR STORE |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v2.1.0 Live Codebase** | **gemini-flash-lite-latest** *(with rapid multi-model failover)* | **Dense ChromaDB + Sparse BM25Okapi** *(65/35 Fusion)* | **all-MiniLM-L6-v2** *(384d, Local CPU)* | **Supabase (PostgreSQL 15)** | **ChromaDB (SQLite / HNSW)** |

---

## Table of Contents
1. **Executive Summary — What is EKMS in Simple Terms?**
2. **The Real-World Problem Solved by the Codebase**
3. **AI Architecture & Model Implementations**
   - 3.1 Primary Generation LLM: Google Gemini Flash Lite & Multi-Model Failover
   - 3.2 Local Dense Vectorizer: all-MiniLM-L6-v2 (384 Dimensions)
   - 3.3 Sparse Keyword Index: BM25Okapi
   - 3.4 Local Vector Store: ChromaDB with Cosine Distance
   - 3.5 Multi-Modal Vision AI: Google GenAI Client
4. **System Architecture & Live Tech Stack**
5. **Codebase Directory Structure & File Map**
6. **Multi-Modal Document Ingestion Engine**
7. **Conversational RAG Q&A Pipeline (Hybrid Retrieval & Caching)**
8. **Detailed Breakdown of All 12 Live Modules**
9. **Database Schema Reference (Supabase PostgreSQL — 10 Tables)**
10. **Backend REST API Catalog (FastAPI — 26 Endpoints)**
11. **Frontend Application Walkthrough (React + Vite)**
12. **Role-Based Access Control (RBAC) & Multi-Tier Security Layers**
13. **Empirical Evaluation Suite & Golden Benchmark Results**
14. **Step-by-Step Installation & Deployment Guide**
15. **Real-World User Personas & Scenarios**
16. **Troubleshooting & Error Recovery Guide**
17. **Production Extensibility & Roadmap**

---

## 1. Executive Summary — What is EKMS in Simple Terms?
The **Enterprise Knowledge Management System (EKMS)** is a full-stack, enterprise-grade AI knowledge platform built to transform static, scattered organizational documentation into an intelligent conversational assistant. In modern organizations and educational institutions, critical information is trapped inside hundreds of PDF files, policy handbooks, scanned photocopies, Word documents, spreadsheets, and manuals. Employees and students waste countless hours searching across folders or waiting for responses over email and messaging apps.

EKMS eliminates this friction entirely. When a user asks a question in natural language (e.g., *"What is the meal reimbursement limit on domestic business trips?"* or *"Who must endorse attendance permissions for students in Band C and D?"*), the system:
1. Performs hybrid search across verified organizational documents.
2. Discards irrelevant noise chunks using calibrated thresholding.
3. Synthesizes a direct, concise, and professional answer.
4. Generates interactive citation cards with exact document names and page numbers.

> [!NOTE]
> **The Elevator Pitch**: EKMS is a secure, private enterprise AI assistant. Instead of hallucinating or relying on public internet data, EKMS searches private corporate files in milliseconds and answers strictly from verified organizational records, citing exact document pages with zero guessing.

---

## 2. The Real-World Problem Solved by the Codebase

| Limitation of Traditional Systems | How the EKMS Codebase Solves It | Code Implementation |
| :--- | :--- | :--- |
| **Exact Keyword Dependency** | Understands conceptual intent and synonyms even when phrasing differs completely. | Local dense vector embeddings (`all-MiniLM-L6-v2`) + ChromaDB cosine similarity search. |
| **Missed Acronyms & Policy Codes** | Captures specific acronyms, form numbers, policy sections, and flight booking approval hierarchies. | Sparse BM25 keyword matching (`rank_bm25.BM25Okapi`) fused with dense vector search in `chroma_service.py`. |
| **Irrelevant Chunk Pollution** | Cuts off low-scoring context from dragging down answer accuracy. | Dynamic 0.48 relevance score threshold cut-off + calibrated `top_k=5` in `rag_pipeline.py`. |
| **Blindness to Scanned Files** | Transcribes photocopies, mobile photos, and scanned papers into clean Markdown tables. | Gemini Vision OCR in `document_processor.py` with 150 DPI page rendering. |
| **Ignoring Figures & Diagrams** | Extracts embedded figures and generates AI captions describing axes, charts, and diagrams. | Hybrid PDF processing (`process_hybrid_pdf`) with automated Vision captioning. |
| **Repetitive DB Overhead** | Eliminates repeated Supabase calls for settings and frequent user queries. | 300s TTL in-memory settings cache + LRU query cache in `rag_pipeline.py`. |
| **Weak Access Control** | Enforces multi-tier Role-Based Access Control down to custom institutional roles and departments. | PostgreSQL Row-Level Security (RLS) + FastAPI JWT middleware + Python metadata filtering. |

---

## 3. AI Architecture & Model Implementations

EKMS avoids expensive GPU infrastructure by combining efficient local CPU neural models with Google's high-speed Gemini APIs:

```
[User Query]
     │
     ├──► [all-MiniLM-L6-v2 (Local CPU)] ──► Dense Embedding (384d) ──► ChromaDB Cosine Search ──┐
     │                                                                                           ├─► [Hybrid Fusion (65% Dense / 35% BM25)]
     └──► [BM25Okapi Tokenizer] ──────────► Sparse Keyword Scoring ──────────────────────────────┘
                                                                                                        │
                                                                                          [Threshold Cut-off: Score >= 0.48]
                                                                                                        │
                                                                                          [RBAC Dept & Role Permission Gate]
                                                                                                        │
                                                                                          [Top 5 Delineated Chunks]
                                                                                                        │
                                                                                          [LangChain Prompt Composition]
                                                                                                        │
                                                                                          [Gemini Flash Lite (1.8s Latency)]
                                                                                                        │
                                                                                          [Synthesized Answer + Page Citations]
```

### 3.1 Primary Generation LLM: Google Gemini Flash Lite
The primary generation engine is configured as **`gemini-flash-lite-latest`** in `backend/app/config.py`. It delivers sub-1.8s generation latency, structured markdown formatting, and high token efficiency.
* **Rapid Multi-Model Failover**: To prevent downtime during API quota spikes or upstream 503/504 errors on preview endpoints, `rag_pipeline.py` maintains an automatic fallback chain:
  `["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]`
  with a strict 10.0-second deadline timeout.

### 3.2 Local Dense Vectorizer: all-MiniLM-L6-v2 (384 Dimensions)
Document text chunks and user queries are converted into 384-dimensional dense vectors using HuggingFace's `all-MiniLM-L6-v2` via `langchain-huggingface` (`backend/app/services/embedding_service.py`).
* Configured with `model_kwargs={"local_files_only": True}` to run 100% offline on standard CPU without network check stalls or third-party embedding API costs.

### 3.3 Sparse Keyword Index: BM25Okapi
Integrated via `rank_bm25` in `backend/app/services/chroma_service.py`. Builds an in-memory inverted index over all document chunks.
* Indexes all chunks in under 4ms and evaluates queries in under 0.5ms.
* Features dynamic dirty-flag tracking (`_bm25_dirty`) to invalidate and rebuild only when documents are uploaded or deleted.

### 3.4 Local Vector Store: ChromaDB
ChromaDB (`backend/app/services/chroma_service.py`) manages persistent vector storage using SQLite and HNSW indexing in `chroma_data/`. It searches thousands of document passages in milliseconds using Cosine Distance calculations.

### 3.5 Multi-Modal Vision AI: Google GenAI Client
For scanned documents and embedded figures, `document_processor.py` utilizes the Google GenAI SDK to perform OCR on images, preserving markdown tables, header hierarchies, and mathematical formulas.

---

## 4. System Architecture & Live Tech Stack

| Layer | Technology | Location | Functionality & Role |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts | `frontend/src/` | Responsive Single Page App, dark/light theme, real-time chat, radar charts, evaluation dashboards. |
| **Backend API** | FastAPI (Python 3.11+), Uvicorn | `backend/app/` | Asynchronous REST endpoints, JWT verification, document parsing, RAG pipeline coordination. |
| **Relational Database** | Supabase PostgreSQL 15 | `supabase/migrations/` | Stores profiles, documents, chat history, feedback, settings, announcements, and evaluation logs. |
| **Identity & Auth** | Supabase Auth (GoTrue) | `backend/app/middleware/auth.py` | Issues signed JWT tokens for secure authentication and session management. |
| **Object File Storage** | Supabase Storage (S3 API) | `003_triggers.sql` | Stores original PDF, DOCX, and image files in a dedicated `documents` bucket. |
| **Vector Store** | ChromaDB (Persistent Client) | `backend/app/services/chroma_service.py` | Nearest-neighbor semantic vector search over document chunks. |
| **Sparse Retrieval** | BM25Okapi (`rank_bm25`) | `backend/app/services/chroma_service.py` | In-memory keyword retrieval fused with dense vectors. |
| **RAG Orchestrator** | LangChain Core | `backend/app/services/rag_pipeline.py` | Prompt templates, document splitters, message history, and LLM execution chains. |
| **Evaluation Suite** | RAGAS & Custom IR | `backend/app/services/metrics_service.py` | Asynchronous background evaluation computing Precision@K, Recall@K, MRR, Hit@K, and Faithfulness. |

---

## 5. Codebase Directory Structure & File Map

```
c:\PROJECTS\EKMS\
├── backend/
│   ├── app/
│   │   ├── config.py                 # Settings: GEMINI_MODEL, CHUNK_SIZE=500, OVERLAP=50, TOP_K=5
│   │   ├── dependencies.py           # Singletons for Supabase, ChromaDB, and EmbeddingService
│   │   ├── main.py                   # FastAPI app, CORS middleware, lifespan events, /api/health
│   │   ├── middleware/
│   │   │   └── auth.py               # JWT validation, get_current_user, require_admin, require_permission
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic schemas for Auth, Chat, Documents, Search, Roles, Metrics
│   │   ├── routers/
│   │   │   ├── chat.py               # POST /api/chat/ask, conversation CRUD, bookmarking, renaming
│   │   │   ├── documents.py          # POST /api/documents/upload, list, delete, tag updates
│   │   │   ├── search.py             # GET /api/search (Semantic vector + PostgreSQL full-text search)
│   │   │   ├── metrics.py            # GET /api/metrics (Summary, retrieval trends, RAGAS, performance)
│   │   │   ├── users.py              # GET/POST/PUT /api/users (Admin user CRUD, activate/ban)
│   │   │   ├── departments.py        # GET/POST/PUT/DELETE /api/departments (Dynamic departments & colors)
│   │   │   ├── roles.py              # GET/POST/PUT/DELETE /api/roles (Custom roles & permission matrix)
│   │   │   ├── feedback.py           # POST/GET /api/feedback (Thumbs up/down ratings and metrics)
│   │   │   ├── settings.py           # GET/PUT /api/settings (System prompt, temperature, top-K config)
│   │   │   └── announcements.py     # GET/POST/DELETE /api/announcements (Dashboard notices)
│   │   └── services/
│   │       ├── chroma_service.py     # ChromaDB vector store + in-memory BM25Okapi hybrid search
│   │       ├── document_processor.py # PDF/DOCX/Image parsing, Vision OCR, chart captioning, chunking
│   │       ├── embedding_service.py  # all-MiniLM-L6-v2 local sentence-transformers vectorizer
│   │       ├── metrics_service.py    # IR metrics (P@K, R@K, MRR) + RAGAS LLM-as-judge background worker
│   │       └── rag_pipeline.py       # LangChain + Gemini Flash Lite Q&A with failover routing & caching
│   ├── evals/                        # Golden Evaluation Suite
│   │   ├── golden_set.json           # 35 curated ground-truth question/answer/document test cases
│   │   ├── run_eval.py               # Evaluation runner with request pacing and real-time metrics
│   │   ├── CHANGELOG.md              # Historical evaluation log and before/after comparison tables
│   │   └── results/                  # Snapshot JSON result files (baseline, latency, hybrid)
│   ├── Dockerfile                    # Production container specification for backend
│   └── requirements.txt              # Python library dependencies (includes rank-bm25, ragas)
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Supabase authentication state, login, register, session sync
│   │   │   └── ThemeContext.jsx      # Dark mode / light mode toggle state
│   │   ├── components/
│   │   │   ├── layout/               # Sidebar.jsx, TopBar.jsx navigation components
│   │   │   └── ui/                   # Reusable UI widgets and buttons
│   │   ├── pages/
│   │   │   ├── Login.jsx             # Login / Register / Forgot Password screen
│   │   │   ├── EmployeeDashboardPage.jsx # Employee homepage with quick query and recent files
│   │   │   ├── AdminDashboardPage.jsx    # Executive metrics, latency tracking, satisfaction charts
│   │   │   ├── MetricsDashboardPage.jsx  # Admin RAG evaluation dashboard (P@K, MRR, RAGAS, Latency)
│   │   │   ├── ChatPage.jsx          # Real-time AI chat, conversation drawer, citation cards
│   │   │   ├── SearchPage.jsx        # Semantic vs. keyword search with multi-faceted filters
│   │   │   ├── ViewDocumentsPage.jsx # Document library for employees with download links
│   │   │   ├── DocumentManagementPage.jsx # Admin document upload with OCR mode & role tagging
│   │   │   ├── UserManagementPage.jsx    # User accounts table with role and department assignment
│   │   │   ├── DepartmentDetailsPage.jsx # Department color configuration and role permissions
│   │   │   ├── BookmarksPage.jsx     # Saved conversation threads
│   │   │   ├── FeedbackPage.jsx      # Admin feedback viewer and satisfaction metrics
│   │   │   └── SettingsPage.jsx      # Live AI prompt, temperature, and top-K parameter editor
│   │   ├── lib/
│   │   │   ├── api.js                # Axios client with automatic Bearer token injection
│   │   │   └── supabase.js           # Supabase JavaScript client initialization
│   │   └── App.jsx                   # React Router configuration with role-guarded routes
├── supabase/
│   └── migrations/                   # SQL migration scripts 001 to 008 (includes 008_metrics_log.sql)
├── docker-compose.yml                # Multi-service container definitions (FastAPI + ChromaDB)
└── start-backend.bat                 # Windows batch script for launching backend locally
```

---

## 6. Multi-Modal Document Ingestion Engine

The file processing pipeline in `backend/app/services/document_processor.py` handles diverse document formats with intelligent routing:

| Document Type | Processing Engine | Extraction Method | Chunking Strategy |
| :--- | :--- | :--- | :--- |
| **Standard Digital PDF** | PyMuPDF (`fitz`) | Extracts clean digital text per page. If a page has <40 chars but contains images, it triggers per-page Vision OCR automatically. | 500-token chunks with 50-token overlap via RecursiveCharacterTextSplitter. |
| **Scanned PDF / Photocopy** | PyMuPDF + Gemini Vision | Renders pages as 150 DPI PNGs, prompts Gemini Vision to transcribe multi-column tables, forms, and handwriting into Markdown. | Splits transcribed markdown into 500-token chunks preserving table syntax. |
| **Hybrid PDF (Text + Charts)** | PyMuPDF + Vision Captioning | Extracts digital text AND inspects embedded images (>100px), generating AI captions describing chart data and axes. | Combines text chunks with captioned figure chunks: `[Figure on Page X]: Caption`. |
| **Word Document (.docx)** | python-docx + Binary Fallback | Extracts paragraph hierarchy (`#`, `##`, `###`), list items, and builds formatted Markdown tables. | Splits structured markdown into 500-token chunks preserving headings. |
| **Standalone Scanned Image** | Gemini Vision OCR | Transcribes standalone `.png`, `.jpg`, `.jpeg`, `.webp` images into clean markdown documents. | Splits OCR output into searchable chunks with image metadata. |
| **Plain Text File (.txt)** | Python UTF-8 Decoder | Cleans whitespace and normalizes text directly. | Splits text into 500-token overlapping chunks. |

---

## 7. Conversational RAG Q&A Pipeline

The end-to-end Q&A execution in `backend/app/services/rag_pipeline.py` runs in under 3.5 seconds:

1. **Cached Settings Lookup**:
   Checks in-memory cache for system prompt, temperature, max tokens, top-K, and model name (300s TTL).
2. **Query Cache Check**:
   If the exact query was asked previously without conversation history, returns cached result in <10ms.
3. **Hybrid Candidate Retrieval**:
   Executes `similarity_search_hybrid_with_relevance_scores` in `chroma_service.py`:
   - Fetches 25 dense vector candidates from ChromaDB using Cosine Distance.
   - Computes BM25 scores over all corpus documents using `BM25Okapi`.
   - Fuses scores: $\text{Score} = 0.65 \times \text{Dense} + 0.35 \times \text{Normalized BM25}$.
4. **Relevance Cut-Off Filtering**:
   Discards any candidate chunk with a hybrid score $< 0.48$ (as long as at least 1 candidate exists), cutting out noise from small documents.
5. **RBAC Filtering (Department & Role Gate)**:
   Verifies each chunk against `allowed_departments` and `allowed_roles`. Restricted chunks are discarded before ever reaching the context window.
6. **Cross-Document Deduplication**:
   Computes an alphanumeric signature of the first 80 characters of each chunk to eliminate identical paragraphs from duplicate document uploads.
7. **Prompt Composition**:
   LangChain ChatPromptTemplate combines System Instructions, formatted context blocks (`--- SOURCE X: Title (Page Y) ---`), conversation history (last 6 messages), and the user's question.
8. **LLM Invocation with Failover**:
   Invokes `gemini-flash-lite-latest` with a 10s deadline timeout. If throttled, falls back to `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`, and `gemini-3.8-flash`.
9. **Asynchronous Metrics Logging**:
   Saves message to `chat_messages` table and fires a non-blocking background task to `metrics_service.compute_and_save()` to calculate IR and RAGAS scores into `metrics_log`.

---

## 8. Detailed Breakdown of All 12 Live Modules

1. **Authentication & Session Management**: Supabase Auth with React `AuthContext.jsx`. Handles email/password sign-in, session tokens, and FastAPI JWT verification.
2. **AI Knowledge Chat (Core Feature)**: Real-time conversational interface in `ChatPage.jsx`. Features multi-turn memory, clickable citation cards, auto-titling, and thread bookmarking.
3. **Multi-Format Document Ingestion**: Implemented in `document_processor.py`. Supports PDF (digital, scanned, hybrid), DOCX, TXT, and Images with auto-detection, OCR, chunking (500/50), and vector indexing.
4. **Hybrid Semantic & Keyword Search**: Implemented in `search.py` and `SearchPage.jsx`. Combines vector similarity search with PostgreSQL full-text search (`tsvector`), offering filters for department, file type, upload date, and tags.
5. **Employee Portal & Dashboard**: Implemented in `EmployeeDashboardPage.jsx`. Provides standard users with an overview cockpit showing recent conversations, accessible documents, quick search, and broadcast announcements.
6. **Admin Analytics Dashboard**: Implemented in `AdminDashboardPage.jsx`. Displays high-level executive KPIs: total users, total indexed documents, query volume, response time, satisfaction ratings, and top documents.
7. **RAG Evaluation Metrics & Governance Dashboard (Module 12)**: Implemented in `MetricsDashboardPage.jsx` and `metrics.py`. Displays live IR retrieval metrics (Precision@K, Recall@K, MRR, Hit@K), RAGAS generation metrics (Faithfulness, Answer Relevancy, Context Precision), latency distributions, and throughput.
8. **User Management & Identity Governance**: Implemented in `users.py` and `UserManagementPage.jsx`. Full administrative CRUD: create user accounts, assign departments, assign roles, and toggle active/banned status.
9. **Role-Based Access Control (RBAC) & Row-Level Security (RLS)**: Multi-tier security implemented via PostgreSQL RLS policies (`002_rls_policies.sql`), FastAPI middleware (`auth.py`), and ChromaDB metadata filtering in `rag_pipeline.py`.
10. **Feedback System & Quality Flywheel**: Implemented in `feedback.py` and `FeedbackPage.jsx`. Allows users to rate any AI response with thumbs up 👍 or thumbs down 👎 and submit optional comments.
11. **Dynamic Prompt Management & AI Configuration**: Implemented in `settings.py` and `SettingsPage.jsx`. Allows admins to tune system prompt text, temperature slider (0.0–1.0), max response tokens, top-K chunk retrieval limits, and preferred Gemini models in real time without redeploying.
12. **Dynamic Departments & Custom Role Management**: Implemented in `departments.py`, `roles.py`, and `DepartmentDetailsPage.jsx`. Allows admins to create custom departments with custom hex colors and configure granular permission toggles (`can_upload`, `can_delete`, `can_manage_users`, etc.).

---

## 9. Database Schema Reference (Supabase PostgreSQL — 10 Tables)

| Table Name | Primary Key & Constraints | Key Columns & References | Row-Level Security (RLS) Policy |
| :--- | :--- | :--- | :--- |
| **profiles** | `id` (UUID PK -> `auth.users.id`) | `display_name`, `role`, `department`, `is_active`, `created_at` | Users select own profile; Admins select/update all profiles. |
| **documents** | `id` (UUID PK) | `title`, `filename`, `storage_path`, `department`, `tags`, `allowed_departments`, `allowed_roles`, `content_type`, `chunk_count`, `fts` (`tsvector`) | Users select matching department/role or 'All'; Admins full access. |
| **conversations** | `id` (UUID PK) | `user_id` (UUID FK -> `auth.users.id`), `title`, `is_bookmarked`, `created_at`, `updated_at` | Users manage own conversations only (`auth.uid() = user_id`). |
| **chat_messages** | `id` (UUID PK) | `conversation_id` (UUID FK ON DELETE CASCADE), `role` (user/assistant), `content`, `sources` (JSONB), `response_time_ms` | Users manage messages in own conversations only. |
| **feedback** | `id` (UUID PK) | `message_id` (UUID FK), `user_id` (UUID FK), `rating` ('helpful'/'not_helpful'), `comment`, `created_at` | Users insert own feedback; Admins select all feedback. |
| **settings** | `id` (UUID PK), `key` (UNIQUE) | `key`, `value`, `updated_by` (UUID FK), `updated_at` | All authenticated users select; Only Admins insert/update. |
| **announcements** | `id` (UUID PK) | `title`, `content`, `created_by` (UUID FK), `created_at` | All authenticated users select; Only Admins manage. |
| **departments** | `id` (UUID PK), `name` (UNIQUE) | `name`, `color` (HEX), `description`, `is_active`, `created_at` | All authenticated users select; Only Admins manage. |
| **role_permissions** | `role_name` (TEXT PK) | `display_name`, `can_upload`, `can_delete`, `can_manage_users`, `can_manage_departments`, `can_manage_settings`, `is_custom`, `color` | All authenticated users select; Only Admins manage. |
| **metrics_log** | `id` (UUID PK) | `message_id`, `user_id`, `question`, `retrieved_chunk_count`, `candidate_count`, `relevance_threshold`, `relevant_retrieved`, `precision_at_k`, `recall_at_k`, `mrr`, `hit_at_k`, `faithfulness`, `answer_relevancy`, `context_precision`, `context_relevancy`, `ragas_status`, `response_time_ms`, `had_error`, `created_at` | Admins select all; Service role inserts asynchronously. |

---

## 10. Backend REST API Catalog (FastAPI — 26 Endpoints)

| Method | Path | Request Body / Query Params | Required Role / Permission |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/chat/ask` | `ChatRequest { question, conversation_id, department }` | Authenticated User |
| **GET** | `/api/chat/conversations` | None | Authenticated User |
| **GET** | `/api/chat/conversations/{id}` | `id: UUID` | Authenticated User |
| **PUT** | `/api/chat/conversations/{id}/rename` | `ConversationRename { title }` | Authenticated User |
| **POST** | `/api/chat/conversations/{id}/bookmark` | None | Authenticated User |
| **DELETE** | `/api/chat/conversations/{id}` | `id: UUID` | Authenticated User |
| **POST** | `/api/documents/upload` | `UploadFile, title, department, tags, allowed_departments, allowed_roles, content_type` | Admin / `can_upload` |
| **GET** | `/api/documents` | `department, role, limit, offset` | Authenticated User |
| **GET** | `/api/documents/{id}` | `id: UUID` | Authenticated User |
| **DELETE** | `/api/documents/{id}` | `id: UUID` | Admin / `can_delete` |
| **PUT** | `/api/documents/{id}/tags` | `DocumentTagsUpdate { tags, allowed_departments, allowed_roles }` | Admin |
| **GET** | `/api/search` | `q, type (semantic\|keyword), department, tags, content_type` | Authenticated User |
| **GET** | `/api/metrics/summary` | `days: int` | Admin |
| **GET** | `/api/metrics/retrieval` | `days: int` | Admin |
| **GET** | `/api/metrics/generation` | `days: int` | Admin |
| **GET** | `/api/metrics/performance` | `days: int` | Admin |
| **GET** | `/api/users` | None | Admin / `can_manage_users` |
| **POST** | `/api/users` | `UserCreate { email, password, display_name, role, department }` | Admin / `can_manage_users` |
| **PUT** | `/api/users/{id}` | `UserUpdate { display_name, role, department, is_active }` | Admin / `can_manage_users` |
| **PUT** | `/api/users/profile/me` | `UserProfileUpdate { display_name, department, password }` | Authenticated User |
| **GET** | `/api/feedback` | None | Admin |
| **POST** | `/api/feedback` | `FeedbackCreate { message_id, rating, comment }` | Authenticated User |
| **GET** | `/api/settings` | None | Authenticated User |
| **PUT** | `/api/settings` | `SettingsUpdate { settings: { key: value } }` | Admin / `can_manage_settings` |
| **GET** | `/api/departments` | None | Authenticated User |
| **POST** | `/api/departments` | `DepartmentCreate { name, color, description }` | Admin / `can_manage_departments` |
| **GET** | `/api/roles` | None | Authenticated User |
| **GET** | `/api/health` | None | Public |

---

## 11. Frontend Application Walkthrough (React + Vite)

The frontend is a single-page React 18 application structured with modular routing in `frontend/src/App.jsx`:

* **Login (`/login`)**: Handles email/password authentication, registration, and password recovery.
* **AI Knowledge Assistant (`/employee/chat`)**: Multi-turn conversational interface with collapsible past conversations, auto-titling, markdown tables, interactive citation cards, and feedback ratings.
* **Document & Knowledge Search (`/employee/search`)**: Search portal with instant toggle between semantic vector search and PostgreSQL full-text search, with live department and tag filters.
* **Document Repository (`/employee/documents`)**: Card and grid view of accessible documents for the user's role and department with direct download links.
* **Saved Bookmarks (`/employee/bookmarks`)**: Pinned conversation threads for quick retrieval.
* **Employee Dashboard (`/employee/dashboard`)**: Homepage featuring quick query input, recent chat history, accessible documents, and announcements.
* **Admin Dashboard (`/admin/dashboard`)**: Executive cockpit displaying total users, indexed docs, query volume graphs, and top documents.
* **RAG Evaluation Dashboard (`/admin/metrics`)**: Specialized AI metrics cockpit displaying Precision@K, Recall@K, MRR, Hit@K, RAGAS Faithfulness/Relevance radar charts, latency percentiles, and daily trends.
* **User Management (`/admin/users`)**: Full administrative table with user creation, department/role assignment, and account activation toggle.
* **Document Management (`/admin/documents`)**: Administrative upload center with drag-and-drop file upload, content-type selector (Auto/Text/Scanned/Hybrid), and role tagging.
* **Departments & Roles (`/admin/departments`)**: Visual management screen for creating departments with custom hex color pickers and configuring custom role permission flags.
* **System Configuration (`/admin/settings`)**: Live settings editor for system prompt template, temperature slider, max tokens, top-K chunks, and preferred Gemini models.

---

## 12. Role-Based Access Control (RBAC) & Multi-Tier Security Layers

Security is enforced across three distinct layers:
1. **PostgreSQL Row-Level Security (RLS)**: Database policies in `002_rls_policies.sql` ensure SQL queries automatically filter rows based on `auth.uid()` and department/role assignments.
2. **FastAPI JWT Middleware**: In `auth.py`, the backend decodes the Supabase JWT using `SUPABASE_JWT_SECRET` on every request, rejecting inactive users or unauthorized roles with HTTP 401/403.
3. **Vector Metadata Security Boundary**: In `rag_pipeline.py`, ChromaDB candidate chunks are filtered against `allowed_departments` and `allowed_roles` in Python before reaching the LLM context, ensuring restricted corporate secrets are never injected into LLM prompts.

---

## 13. Empirical Evaluation Suite & Golden Benchmark Results

EKMS features a dedicated, reproducible evaluation harness located in `backend/evals/`:
* **Dataset (`golden_set.json`)**: 35 curated ground-truth test questions across all 11 indexed enterprise documents.
* **Runner (`run_eval.py`)**: Runs evaluation against live pipeline with request pacing and produces JSON result snapshots.

### Benchmark Results Comparison

| Stage | Precision@K | Recall@K | MRR | Hit@K | Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline** (Forced top-k=8, pure vector) | 60.36% | 81.13% | 0.8571 | 85.71% | 4.91s |
| **Step 3b** (Latency Caching + Token Tuning) | 60.36% | 81.13% | 0.8571 | 85.71% | **3.30s** |
| **Step 3c-1** (Top-K=5 + 0.48 Threshold) | 76.67% | 69.86% | 0.8571 | 85.71% | ~3.30s |
| **Step 3c-2 (Hybrid BM25 + Vector Search)** | **94.86%** | **71.75%** | **1.0000** | **100.00%** | **~3.20s** |

---

## 14. Step-by-Step Installation & Deployment Guide

### 14.1 Step 1: Supabase Configuration & Migrations
1. Create a Supabase project.
2. Run SQL scripts in `supabase/migrations/` in numerical order:
   - `001_create_tables.sql`
   - `002_rls_policies.sql`
   - `003_triggers.sql`
   - `004_add_content_type.sql`
   - `005_departments_table.sql`
   - `006_flexible_roles.sql`
   - `007_allowed_roles_and_permissions.sql`
   - `008_metrics_log.sql`

### 14.2 Step 2: Configure backend/.env
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-flash-lite-latest
CHROMA_HOST=localhost
CHROMA_PORT=8001
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 14.3 Step 3: Running the Application
* **Option A: Docker Compose**:
  ```bash
  docker-compose up -d --build
  # Backend: http://localhost:8000
  # ChromaDB: http://localhost:8001
  ```
* **Option B: Running Locally**:
  * **Backend**:
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
  * **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    # Opens at http://localhost:5173
    ```

---

## 15. Real-World User Personas & Scenarios

### 15.1 Scenario 1: Marketing Employee Querying Travel Policies
* **User**: Sarah, Marketing Specialist (Role: `employee`, Department: `Marketing`).
* **Query**: *"What is the daily meal allowance for domestic travel, and how soon do receipts need to be submitted?"*
* **System Action**: Hybrid retrieval searches ChromaDB and BM25, verifies marketing access, isolates the relevant travel policy section, and passes context to Gemini.
* **Result**: In 2.1 seconds, EKMS delivers a bulleted answer citing `[Travel_Policy_2026.pdf, Page 8]` with exact page citations.

### 15.2 Scenario 2: HR Director Publishing Scanned Policy
* **User**: Marcus, HR Director (Role: `admin`).
* **Action**: Uploads a 30-page scanned photocopy of the 2026 Health Insurance Plan with `content_type='auto'`.
* **System Action**: `document_processor.py` auto-detects `images_only`, renders 150 DPI pages, invokes Gemini Vision OCR, chunks markdown tables, creates embeddings via `all-MiniLM-L6-v2`, and refreshes the BM25 index.
* **Result**: All authorized staff can immediately ask detailed health plan questions with exact table citations.

---

## 16. Troubleshooting & Error Recovery Guide

* **Q: What happens if a user asks a question not covered by any document?**
  * **A**: EKMS strictly answers: *"I don't have enough information to answer that based on the provided documents."* The system will never hallucinate or invent outside facts.
* **Q: What if the primary Gemini model encounters API rate limits or downtime?**
  * **A**: The RAG pipeline automatically fails over in milliseconds to backup production models (`gemini-2.5-flash-lite`, `gemini-3.8-flash`), ensuring uninterrupted uptime.
* **Q: What happens if ChromaDB is temporarily disconnected?**
  * **A**: ChromaDB includes a fallback to a local persistent directory (`CHROMA_DATA_PATH`), and `/api/health` reports vector store connectivity status.
* **Q: Why were RAGAS generation metrics not computing previously?**
  * **A**: `langchain-community>=0.3.0` deprecated the internal `vertexai` module imported by RAGAS. An in-memory compatibility stub in `metrics_service.py` resolves this at runtime without requiring package downgrades.

---

## 17. Production Extensibility & Roadmap

1. **Server-Sent Events (SSE) Streaming**: Stream tokens to the frontend UI as they are generated by Gemini to reduce Perceived Latency (Time-To-First-Token) to under 600ms.
2. **Cross-Encoder Reranker**: For enterprise deployments exceeding 10,000 chunks, integrate a cross-encoder model (e.g. `bge-reranker-base`) to re-score top hybrid candidates down to the top 3.
3. **Parent-Document Retrieval / Hierarchical Chunking**: Index small chunk windows (250 tokens) for precise retrieval, while injecting surrounding section context (1000 tokens) into the LLM prompt.
4. **Workplace Chatbot Integrations**: Expose `/api/chat/ask` directly to Slack and Microsoft Teams bots for native workspace Q&A.
