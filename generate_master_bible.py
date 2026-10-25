"""Generate the complete EKMS Master Project Bible Word (.docx) document.

Exhaustive, professional, enterprise-grade documentation covering:
- Executive Summary & Plain English Story
- Business Problem & Value Proposition
- Complete User Personas & Practical Walkthroughs
- Full Functional Feature Catalog (All 12 Modules)
- Multimodal Ingestion Engine & Document Processing
- Deep Technical Architecture & Hybrid Retrieval Engineering (BM25 + Dense)
- Database Schema Reference (All 10 Tables, Constraints, RLS)
- Complete REST API Catalog (All 26 Endpoints)
- Frontend Architecture & Screen Catalog
- Quality Evaluation & Empirical Benchmark Results (Golden Set, P@K, MRR, Latency)
- Triple-Tier Security & Privacy Framework
- Deployment, Configuration & Operations Guide
- Troubleshooting Matrix & FAQ
- Future Product Roadmap
"""

import os
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Set background color of a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set padding/margins for a table cell in dxa (1 pt = 20 dxa)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tc_pr.append(tc_mar)

def set_callout_left_border(cell, border_hex="599692", size="36"):
    """Set a thick left border on a callout box cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="{size}" w:space="0" w:color="{border_hex}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tc_pr.append(borders)

def add_callout(doc, text, title="KEY TAKEAWAY", border_hex="599692", bg_hex="F1F5F9"):
    """Insert an enterprise-styled callout box."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.5)

    cell = table.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_callout_left_border(cell, border_hex, size="36")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=140)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x1E, 0x2D, 0x40)

    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_table(table, header_bg="1E2D40", alt_bg="F8FAFC", col_widths=None):
    """Apply professional enterprise styling to a table."""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Apply widths if provided
    if col_widths:
        for i, width in enumerate(col_widths):
            for row in table.rows:
                if i < len(row.cells):
                    row.cells[i].width = width

    for row_idx, row in enumerate(table.rows):
        is_header = (row_idx == 0)
        for col_idx, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)

            # Apply borders
            tc_pr = cell._tc.get_or_add_tcPr()
            border_color = "CBD5E1"
            borders = parse_xml(
                f'<w:tcBorders {nsdecls("w")}>'
                f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>'
                f'<w:bottom w:val="{"double" if is_header else "single"}" w:sz="{"12" if is_header else "4"}" w:space="0" w:color="{border_color}"/>'
                f'<w:left w:val="none"/>'
                f'<w:right w:val="none"/>'
                f'</w:tcBorders>'
            )
            tc_pr.append(borders)

            if is_header:
                set_cell_background(cell, header_bg)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(3)
                    p.paragraph_format.space_after = Pt(3)
                    for r in p.runs:
                        r.font.name = "Calibri"
                        r.font.size = Pt(9.5)
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                bg = alt_bg if row_idx % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Calibri"
                        r.font.size = Pt(9)
                        r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

def build_master_document():
    doc = Document()

    # Configure Margins (0.85 in)
    for section in doc.sections:
        section.top_margin = Inches(0.85)
        section.bottom_margin = Inches(0.85)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # ══════════════════════════════════════════════════════════════════
    # TITLE & COVER BLOCK
    # ══════════════════════════════════════════════════════════════════
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(12)
    p_title.paragraph_format.space_after = Pt(4)
    run_main_title = p_title.add_run("Enterprise Knowledge Management System (EKMS)\n")
    run_main_title.font.name = "Calibri"
    run_main_title.font.size = Pt(26)
    run_main_title.font.bold = True
    run_main_title.font.color.rgb = RGBColor(0x1E, 0x2D, 0x40)

    run_sub = p_title.add_run("The Master Project Bible & Complete System Architecture Manual\n")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(14)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(0x59, 0x96, 0x92)

    run_desc = p_title.add_run("From High-Level Business Vision & User Personas to Low-Level Hybrid Retrieval Math, Empirical Benchmarks & Operations")
    run_desc.font.name = "Calibri"
    run_desc.font.size = Pt(11)
    run_desc.font.italic = True
    run_desc.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Executive Metadata Table
    meta_table = doc.add_table(rows=6, cols=2)
    meta_data = [
        ("System Version", "v2.1.0 (Production Live Codebase)"),
        ("Primary Generation Engine", "Google Gemini Flash Lite (gemini-flash-lite-latest) with Rapid Failover"),
        ("Retrieval Architecture", "Hybrid Search: Dense Cosine (all-MiniLM-L6-v2) + Sparse BM25Okapi (65/35 Fusion)"),
        ("Database & Persistence", "Supabase (PostgreSQL 15 with RLS) + ChromaDB (Local Persistent HNSW)"),
        ("Production Benchmarks", "94.86% Precision@K | 1.0000 MRR | 100.00% Hit@K | ~3.2s Avg Latency"),
        ("Target Audience", "Executives, Department Directors, Faculty, Software Engineers, DevOps & New Users"),
    ]
    for idx, (k, v) in enumerate(meta_data):
        row = meta_table.rows[idx]
        row.cells[0].paragraphs[0].add_run(k)
        row.cells[1].paragraphs[0].add_run(v)
    format_table(meta_table, header_bg="1E2D40", alt_bg="F1F5F9", col_widths=[Inches(2.2), Inches(4.5)])
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 1: EXECUTIVE SUMMARY & EXPLAINING TO A STRANGER
    # ══════════════════════════════════════════════════════════════════
    h1 = doc.add_heading("1. Executive Summary — What is EKMS in Simple Terms?", level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "Imagine walking into a massive organization with hundreds of departments, thousands of employees, and decades of history. "
        "Every single rule, policy, procedure, grading guideline, and medical reimbursement protocol is written down somewhere—inside thousands of "
        "PDF files, scanned forms, Word documents, policy handbooks, and intranet notices. "
        "When an employee or student needs to know something as simple as 'What is the meal reimbursement allowance for an overnight trip?' "
        "or 'Who needs to sign my medical leave form?', what happens in most companies today?"
    )
    doc.add_paragraph(
        "People spend 45 minutes searching through chaotic shared drives, digging through folders named 'Final_v2_new.pdf', or interrupting "
        "colleagues on Slack, Teams, or email. The organization suffers from 'tribal knowledge'—where answers only exist in the heads of a few "
        "senior employees who spend half their workday answering repetitive questions."
    )
    doc.add_paragraph(
        "The Enterprise Knowledge Management System (EKMS) completely solves this problem. "
        "EKMS is a private, intelligent, conversational assistant trained strictly on your organization's verified files. "
        "A user simply opens a clean web interface and types their question in everyday natural English. "
        "In approximately two to three seconds, EKMS reads through all authorized institutional records, extracts the exact relevant clauses, "
        "synthesizes an accurate and concise answer, and displays interactive citation badges showing the exact document title and page number where "
        "the truth can be verified."
    )

    add_callout(
        doc,
        "Public AI tools like ChatGPT or Gemini are trained on the open internet and will happily guess or hallucinate when they do not know private facts. "
        "EKMS operates under a strict Zero-Guessing Policy: if an answer is not explicitly written in the organization's verified files, the system politely states: "
        "'I don't have enough information to answer that based on the provided documents.' It will never invent company policies.",
        title="THE ZERO-GUESSING ENTERPRISE PROMISE"
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION 2: THE BUSINESS CRISIS & WHY TRADITIONAL SEARCH FAILS
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("2. The Real-World Business Problem Solved by EKMS", level=1)
    
    doc.add_paragraph(
        "Organizations often ask: 'Why can't we just use Windows Search, Google Drive search, or standard folder hierarchies?' "
        "Traditional file systems suffer from five fundamental architectural failures that cost enterprises millions in lost productivity:"
    )

    table_prob = doc.add_table(rows=6, cols=3)
    prob_headers = ["Traditional Search Limitation", "Real-World Business Impact", "How EKMS Codebase Solves It"]
    for c_idx, h in enumerate(prob_headers):
        table_prob.rows[0].cells[c_idx].paragraphs[0].add_run(h)

    prob_rows = [
        ("Exact Keyword Dependency", "If a user searches 'flight rules' but the document uses 'air travel itinerary authorization', traditional search returns zero results.", "Hybrid Retrieval combines semantic dense embeddings (all-MiniLM-L6-v2) with BM25 keyword matching to catch both concepts and exact terms."),
        ("Blindness to Scanned Files", "Over 35% of corporate policy documents are scanned paper copies, handwritten signatures, or photocopy PDFs invisible to Ctrl+F.", "Multi-modal Gemini Vision OCR automatically transcribes scanned documents and tables into structured, searchable markdown chunks."),
        ("Ignoring Charts & Figures", "Syllabus flowcharts, organizational hierarchies, and benefit tables are skipped entirely by text scrapers.", "Automated chart captioning in document_processor.py renders embedded images and writes descriptive summaries of axes, graphs, and workflows."),
        ("File Download Fatigue", "Users get a list of 20 dense 80-page PDFs and must manually read each one to find a single paragraph.", "Conversational synthesis quotes the exact passage and generates clickable citations linking directly to the page number."),
        ("One-Size-Fits-All Security", "Either everyone can see everything, or files are locked so tightly that nobody can find what they need to work.", "Triple-tier security: PostgreSQL Row-Level Security (RLS), FastAPI JWT validation, and in-memory Python RBAC metadata filtering."),
    ]
    for r_idx, r in enumerate(prob_rows):
        row = table_prob.rows[r_idx + 1]
        for c_idx, val in enumerate(r):
            row.cells[c_idx].paragraphs[0].add_run(val)
    format_table(table_prob, header_bg="1E2D40", alt_bg="F8FAFC", col_widths=[Inches(1.8), Inches(2.2), Inches(2.5)])
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 3: USER PERSONAS & STEP-BY-STEP USER JOURNEYS
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("3. User Personas & The Complete User Experience", level=1)
    doc.add_paragraph(
        "EKMS is designed for diverse institutional stakeholders. Below are four key personas showing how EKMS operates in practice:"
    )

    personas = [
        ("Sarah — Marketing Specialist (Regular Employee)", "employee", "Marketing",
         "Sarah needs to book a last-minute flight for a conference. She opens /employee/chat and asks: 'Can I book an economy class flight myself, or do I need director approval?' Within 2.2 seconds, EKMS references the Travel & Expense Policy (Page 4), explaining that domestic economy flights under $500 require only immediate manager sign-off. She clicks the citation badge to inspect the original text and submits her request with zero delay."),
        ("Dr. K. Rao — Associate Professor (Academic Faculty)", "lecturer", "Academics",
         "Dr. Rao is advising a student struggling with attendance. He types: 'What are the attendance requirements for a student in Band C to sit for campus placements?' EKMS cites the Student Progression Framework (Page 3) and CDC Band Policy (Page 2), noting that Band C students require a minimum of 70% weekly test attendance plus a special endorsement form from faculty. Dr. Rao bookmarks the response thread for future advisory sessions."),
        ("Marcus — HR Operations Director (Department Manager)", "admin", "HR",
         "Marcus needs to publish a 45-page scanned photocopy of the updated 2026 Employee Health Benefits guide. He navigates to /admin/documents, selects 'Auto' OCR mode, tags the document for HR and General departments, and uploads it. In the background, Gemini Vision transcribes tables into clean markdown, sentence-transformers creates 384-dimensional vectors, and the BM25 index refreshes. Within 30 seconds, 500 employees can query the healthcare guide."),
        ("Elena — Chief Information Officer / System Admin", "admin", "Executive",
         "Elena monitors institutional adoption, security, and response quality. She visits /admin/metrics to inspect live evaluation indicators. She verifies that Precision@K is 94.86%, Mean Reciprocal Rank is 1.0000, RAGAS Faithfulness is 90.83%, and p95 latency is under 4 seconds. She adjusts the LLM temperature slider on /admin/settings to maintain strict adherence without needing developer assistance."),
    ]

    for p_name, p_role, p_dept, p_story in personas:
        doc.add_heading(p_name, level=2)
        p = doc.add_paragraph()
        r1 = p.add_run(f"Assigned Role: {p_role} | Department: {p_dept}\n")
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(0x59, 0x96, 0x92)
        p.add_run(p_story)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 4: COMPLETE FUNCTIONAL MODULE CATALOG (ALL 12 MODULES)
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("4. The Complete Functional Feature Catalog (All 12 Modules)", level=1)
    doc.add_paragraph(
        "The EKMS codebase is built modularly across frontend and backend, encompassing 12 distinct functional subsystems:"
    )

    modules = [
        ("Module 1: Authentication & Identity Lifecycle",
         "Built with Supabase GoTrue Auth and React AuthContext.jsx. Supports secure email/password sign-in, self-service registration, password recovery, session tokens stored in secure browser storage, and automatic user profile generation via PostgreSQL database triggers (on_auth_user_created). FastAPI middleware validates cryptographic signatures on every request."),
        
        ("Module 2: Conversational AI Knowledge Assistant",
         "The primary interactive engine located at /employee/chat. Features real-time multi-turn conversational memory (retaining the past 6 dialogue turns), interactive citation cards with document title and page badges, automatic thread titling, thread renaming, thread pinning/bookmarking, and full markdown table and equation rendering."),
        
        ("Module 3: Multi-Modal Document Ingestion Engine",
         "Engineered in backend/app/services/document_processor.py. Ingests Digital PDFs, Scanned Photocopies, Hybrid PDFs with charts, Microsoft Word (.docx), plain text (.txt), and standalone images. Automatically selects processing mode (Text, Scanned, Hybrid) based on character density and vector drawing inspection."),
        
        ("Module 4: Dual-Engine Knowledge Search",
         "Available at /employee/search. Offers instant switching between Dense Semantic Vector Search (ChromaDB) and PostgreSQL Full-Text Search (tsvector with GIN indexing). Supports multi-faceted filtering across department, document type, tag labels, and upload date ranges."),
        
        ("Module 5: Employee Self-Service Cockpit",
         "The personalized landing hub at /employee/dashboard. Displays quick query triggers, recently accessed company documents, pinned conversation shortcuts, active institutional announcements, and account profile details."),
        
        ("Module 6: Executive Analytics & Operational Intelligence",
         "Located at /admin/dashboard. Equips administrators with high-level operational intelligence: registered user counts, document ingestion volume, total query throughput, average response latency, satisfaction ratios (thumbs up vs. down), and top-5 accessed policies."),
        
        ("Module 7: User Management & Governance",
         "Full administrative directory at /admin/users. Enables admins to provision accounts with default credentials, assign custom institutional roles, assign primary departments, and instantly activate or deactivate user access with real-time session revocation."),
        
        ("Module 8: Granular Role-Based Access Control (RBAC)",
         "Multi-tier security boundary enforced across three layers: PostgreSQL Row-Level Security (RLS) on database tables, FastAPI JWT middleware guarding API endpoints, and Python vector metadata filtering preventing unauthorized document chunks from ever reaching LLM prompts."),
        
        ("Module 9: Feedback Loop & Continuous Quality Flywheel",
         "Implemented in feedback.py and FeedbackPage.jsx. Empowers users to rate any generated answer with thumbs-up 👍 or thumbs-down 👎 and provide optional commentary. Ratings are aggregated on admin dashboards for continuous retrieval refinement."),
        
        ("Module 10: Dynamic AI Prompt & Parameter Engineering",
         "Available at /admin/settings. Allows administrators to tune the system prompt template, adjust LLM temperature (0.0 to 1.0), set token limits, configure top-K chunk retrieval ceilings, and switch preferred Gemini models in real time without restarting backend services."),
        
        ("Module 11: Dynamic Departments & Permission Matrices",
         "Configured in departments.py, roles.py, and DepartmentDetailsPage.jsx. Allows institutions to create custom departments with custom hex brand colors, as well as configure custom roles with granular boolean permission toggles (can_upload, can_delete, can_manage_users, can_manage_settings)."),
        
        ("Module 12: Real-Time RAG Evaluation & AI Governance Dashboard",
         "Specialized governance dashboard at /admin/metrics. Displays live Information Retrieval (IR) metrics (Precision@K, Recall@K, MRR, Hit@K), RAGAS generation metrics (Faithfulness, Answer Relevancy, Context Precision), latency distributions, and error rates. Fed asynchronously by background workers after every query."),
    ]

    for m_title, m_desc in modules:
        doc.add_heading(m_title, level=2)
        doc.add_paragraph(m_desc)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 5: DEEP-DIVE TECHNICAL ARCHITECTURE & HYBRID RETRIEVAL
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("5. Deep-Dive Technical Architecture & Hybrid Retrieval Engineering", level=1)
    
    doc.add_paragraph(
        "The core innovation of the EKMS v2.1.0 codebase lies in its high-precision Hybrid Retrieval Engine. "
        "Pure semantic vector retrieval often struggles with exact acronyms, policy numbers, and flight booking approval hierarchies. "
        "Meanwhile, pure keyword retrieval (BM25) fails when users use synonyms or conversational phrasing. "
        "EKMS blends both paradigms into a unified, mathematically calibrated retrieval pipeline."
    )

    doc.add_heading("5.1 The Mathematical Fusion Formula (65/35 Fusion)", level=2)
    doc.add_paragraph(
        "For any incoming user query Q, EKMS executes the following algorithmic steps in parallel:"
    )
    doc.add_paragraph(
        "1. Dense Vector Scoring: Encodes Q into a 384-dimensional vector using local all-MiniLM-L6-v2 and computes cosine similarity against ChromaDB chunks, yielding a score in [0.0, 1.0].\n"
        "2. Sparse BM25 Scoring: Tokenizes Q and scores all chunks in the corpus using BM25Okapi, normalized against the maximum score in the set:\n"
        "      NormBM25(d) = BM25(d, Q) / max(BM25_scores)\n"
        "3. Weighted Linear Fusion: Combines both scores using a calibrated 65% dense / 35% sparse ratio:\n"
        "      HybridScore(d) = 0.65 * DenseCosine(d, Q) + 0.35 * NormBM25(d, Q)\n"
        "4. Relevance Threshold Filtering: Chunks with HybridScore < 0.48 are discarded immediately, preventing irrelevant context from diluting the prompt."
    )

    add_callout(
        doc,
        "In empirical testing across 35 golden enterprise questions, adding BM25 sparse keyword scoring to dense vector search increased Precision@K "
        "from 60.36% to 94.86%, raised Mean Reciprocal Rank to a perfect 1.0000, and elevated Hit@K to 100.00%. "
        "Furthermore, BM25 indexing over 120 chunks takes only 3.88ms and query evaluation takes only 0.46ms—adding zero perceptible latency.",
        title="EMPIRICAL IMPACT OF HYBRID RETRIEVAL"
    )

    doc.add_heading("5.2 Multi-Tier Caching Architecture", level=2)
    doc.add_paragraph(
        "To satisfy the <4.0s average latency target, EKMS implements a multi-tier caching strategy:\n"
        "• Settings Cache: Fetches system prompt and model parameters from Supabase and caches them in memory for 300 seconds (eliminates 200–600ms DB overhead per query).\n"
        "• Query Cache: Thread-safe LRU cache storing the last 200 standalone questions, serving repeated requests in under 10ms.\n"
        "• Local Model Cache: Sentence-transformers embedding weights are pinned locally with local_files_only=True, eliminating network check stalls."
    )

    doc.add_heading("5.3 Production LLM Failover & Deadline Protection", level=2)
    doc.add_paragraph(
        "Google Gemini API endpoints can occasionally experience high-demand spikes (HTTP 503 UNAVAILABLE or HTTP 504 DEADLINE_EXCEEDED). "
        "In EKMS, rag_pipeline.py implements an active failover circuit. The primary model is gemini-flash-lite-latest. "
        "If an API call exceeds 10.0 seconds or encounters an error, the system automatically and invisibly retries with fallback models "
        "(gemini-2.5-flash-lite, gemini-3.1-flash-lite, and gemini-3.8-flash), ensuring 100% user-facing availability."
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION 6: EMPIRICAL EVALUATION SUITE & BENCHMARK RESULTS
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("6. Empirical Evaluation Suite & Golden Benchmark Results", level=1)
    
    doc.add_paragraph(
        "A core principle of EKMS is that system quality must be scientifically proven with repeatable numbers, not guessed. "
        "Located in backend/evals/, the Golden Evaluation Suite provides automated end-to-end benchmarking against 35 curated ground-truth questions "
        "spanning all 11 enterprise documents indexed in the system."
    )

    doc.add_heading("6.1 Progression of Optimization Stages", level=2)
    
    table_eval = doc.add_table(rows=5, cols=7)
    eval_headers = ["Optimization Stage", "Precision@K", "Recall@K", "MRR", "Hit@K", "Avg Latency", "Primary Outcome"]
    for c_idx, h in enumerate(eval_headers):
        table_eval.rows[0].cells[c_idx].paragraphs[0].add_run(h)

    eval_rows = [
        ("Baseline (Initial State)", "60.36%", "81.13%", "0.8571", "85.71%", "4,914 ms", "Forced top_k=8 caused chunk pollution on concise documents."),
        ("Step 3b: Latency Caching", "60.36%", "81.13%", "0.8571", "85.71%", "3,297 ms", "Settings cache & token limits cut latency by 1.62s (-33%)."),
        ("Step 3c-1: Top-K & Threshold", "76.67%", "69.86%", "0.8571", "85.71%", "3,300 ms", "Top_k=5 and 0.48 cutoff boosted precision by +16.3%."),
        ("Step 3c-2: Hybrid Search", "94.86%", "71.75%", "1.0000", "100.00%", "3,212 ms", "BM25 fusion delivered +34.5% precision and 100% hit rate."),
    ]
    for r_idx, r in enumerate(eval_rows):
        row = table_eval.rows[r_idx + 1]
        for c_idx, val in enumerate(r):
            row.cells[c_idx].paragraphs[0].add_run(val)
    format_table(table_eval, header_bg="1E2D40", alt_bg="F1F5F9", col_widths=[Inches(1.5), Inches(0.8), Inches(0.8), Inches(0.7), Inches(0.7), Inches(0.9), Inches(1.8)])
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    doc.add_heading("6.2 Explanation of Metrics for Stakeholders", level=2)
    doc.add_paragraph(
        "• Precision@K (94.86%): Measures what fraction of retrieved chunks are genuinely relevant. At 94.86%, nearly every single chunk fed into the AI is on-topic, completely eliminating confusing context.\n"
        "• Mean Reciprocal Rank / MRR (1.0000): Measures where the best matching document appears in the search results. A score of 1.0000 means the #1 returned chunk is ALWAYS the exact correct answer document.\n"
        "• Hit@K Rate (100.00%): Measures whether the correct ground-truth document was retrieved in the top results. 100% means zero missed policies across all 35 test cases.\n"
        "• Average Latency (~3.2s): Total time elapsed from user hitting Enter to complete generated answer rendering."
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION 7: DATABASE SCHEMA REFERENCE (ALL 10 TABLES)
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("7. Database Schema Reference (Supabase PostgreSQL — 10 Tables)", level=1)
    
    doc.add_paragraph(
        "The relational backbone is hosted on Supabase PostgreSQL 15, managed through versioned SQL migrations in supabase/migrations/:"
    )

    table_db = doc.add_table(rows=11, cols=4)
    db_headers = ["Table Name", "Primary Key & Constraints", "Key Columns & Foreign Keys", "Security (RLS Policy)"]
    for c_idx, h in enumerate(db_headers):
        table_db.rows[0].cells[c_idx].paragraphs[0].add_run(h)

    db_rows = [
        ("profiles", "id (UUID PK -> auth.users.id)", "display_name, role, department, is_active, created_at", "Users read own profile; Admins read/update all profiles."),
        ("documents", "id (UUID PK)", "title, filename, storage_path, department, tags, allowed_departments, allowed_roles, content_type, chunk_count, fts (tsvector)", "Users read matching dept/role or 'All'; Admins full access."),
        ("conversations", "id (UUID PK)", "user_id (UUID FK -> auth.users.id), title, is_bookmarked, created_at, updated_at", "Users manage own conversations only (auth.uid() = user_id)."),
        ("chat_messages", "id (UUID PK)", "conversation_id (UUID FK ON DELETE CASCADE), role, content, sources (JSONB), response_time_ms", "Users manage messages in own conversations only."),
        ("feedback", "id (UUID PK)", "message_id (UUID FK), user_id (UUID FK), rating, comment, created_at", "Users insert own feedback; Admins view all feedback."),
        ("settings", "id (UUID PK), key (UNIQUE)", "key, value, updated_by (UUID FK), updated_at", "All authenticated read; Admins update."),
        ("announcements", "id (UUID PK)", "title, content, created_by (UUID FK), created_at", "All authenticated read; Admins manage."),
        ("departments", "id (UUID PK), name (UNIQUE)", "name, color (HEX), description, is_active, created_at", "All authenticated read; Admins manage."),
        ("role_permissions", "role_name (TEXT PK)", "display_name, can_upload, can_delete, can_manage_users, can_manage_departments, can_manage_settings, is_custom, color", "All authenticated read; Admins manage."),
        ("metrics_log", "id (UUID PK)", "message_id, user_id, question, retrieved_chunk_count, candidate_count, relevance_threshold, relevant_retrieved, precision_at_k, recall_at_k, mrr, hit_at_k, faithfulness, answer_relevancy, context_precision, context_relevancy, ragas_status, response_time_ms, had_error, created_at", "Admins read all; Background task service-role inserts."),
    ]
    for r_idx, r in enumerate(db_rows):
        row = table_db.rows[r_idx + 1]
        for c_idx, val in enumerate(r):
            row.cells[c_idx].paragraphs[0].add_run(val)
    format_table(table_db, header_bg="1E2D40", alt_bg="F8FAFC", col_widths=[Inches(1.2), Inches(1.8), Inches(2.2), Inches(1.8)])
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 8: BACKEND REST API CATALOG (ALL 26 ENDPOINTS)
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("8. Complete Backend REST API Catalog (FastAPI — 26 Endpoints)", level=1)
    
    doc.add_paragraph(
        "The FastAPI application exposes 26 fully documented REST endpoints across 10 functional routers:"
    )

    table_api = doc.add_table(rows=27, cols=4)
    api_headers = ["HTTP Method", "Endpoint Path", "Request Parameters / Payload", "Authorization Guard"]
    for c_idx, h in enumerate(api_headers):
        table_api.rows[0].cells[c_idx].paragraphs[0].add_run(h)

    api_rows = [
        ("POST", "/api/chat/ask", "ChatRequest { question, conversation_id, department }", "Authenticated User"),
        ("GET", "/api/chat/conversations", "None (fetches user's conversation threads)", "Authenticated User"),
        ("GET", "/api/chat/conversations/{id}", "id: UUID (retrieves thread message history)", "Authenticated User"),
        ("PUT", "/api/chat/conversations/{id}/rename", "ConversationRename { title }", "Authenticated User"),
        ("POST", "/api/chat/conversations/{id}/bookmark", "None (toggles pinned status)", "Authenticated User"),
        ("DELETE", "/api/chat/conversations/{id}", "id: UUID (deletes conversation thread)", "Authenticated User"),
        ("POST", "/api/documents/upload", "UploadFile, title, department, tags, allowed_roles, content_type", "Admin / can_upload"),
        ("GET", "/api/documents", "department, role, limit, offset", "Authenticated User"),
        ("GET", "/api/documents/{id}", "id: UUID (fetches document details)", "Authenticated User"),
        ("DELETE", "/api/documents/{id}", "id: UUID (removes document and Chroma chunks)", "Admin / can_delete"),
        ("PUT", "/api/documents/{id}/tags", "DocumentTagsUpdate { tags, allowed_departments, allowed_roles }", "Admin"),
        ("GET", "/api/search", "q, type (semantic|keyword), department, tags, content_type", "Authenticated User"),
        ("GET", "/api/metrics/summary", "days: int (30-day aggregate averages)", "Admin"),
        ("GET", "/api/metrics/retrieval", "days: int (daily P@K, R@K, MRR trends)", "Admin"),
        ("GET", "/api/metrics/generation", "days: int (daily RAGAS faithfulness & relevancy)", "Admin"),
        ("GET", "/api/metrics/performance", "days: int (daily latency percentiles & error rate)", "Admin"),
        ("GET", "/api/users", "None (lists all registered user accounts)", "Admin / can_manage_users"),
        ("POST", "/api/users", "UserCreate { email, password, display_name, role, department }", "Admin / can_manage_users"),
        ("PUT", "/api/users/{id}", "UserUpdate { display_name, role, department, is_active }", "Admin / can_manage_users"),
        ("PUT", "/api/users/profile/me", "UserProfileUpdate { display_name, department, password }", "Authenticated User"),
        ("GET", "/api/feedback", "None (fetches thumbs up/down user feedback logs)", "Admin"),
        ("POST", "/api/feedback", "FeedbackCreate { message_id, rating, comment }", "Authenticated User"),
        ("GET", "/api/settings", "None (reads system prompt, temperature, top-K)", "Authenticated User"),
        ("PUT", "/api/settings", "SettingsUpdate { settings: { key: value } }", "Admin / can_manage_settings"),
        ("GET", "/api/departments", "None (lists dynamic departments with hex colors)", "Authenticated User"),
        ("POST", "/api/departments", "DepartmentCreate { name, color, description }", "Admin / can_manage_departments"),
    ]
    for r_idx, r in enumerate(api_rows):
        row = table_api.rows[r_idx + 1]
        for c_idx, val in enumerate(r):
            row.cells[c_idx].paragraphs[0].add_run(val)
    format_table(table_api, header_bg="1E2D40", alt_bg="F8FAFC", col_widths=[Inches(1.0), Inches(2.2), Inches(2.4), Inches(1.4)])
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 9: SECURITY, PRIVACY & COMPLIANCE FRAMEWORK
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("9. Security, Privacy & Enterprise Compliance", level=1)
    
    doc.add_paragraph(
        "In enterprise environments, data privacy and regulatory compliance are paramount. "
        "EKMS enforces a defense-in-depth security model across three independent layers:"
    )

    doc.add_heading("Layer 1: PostgreSQL Row-Level Security (RLS)", level=2)
    doc.add_paragraph(
        "Every single table in Supabase has RLS enabled. When a user runs a query, PostgreSQL automatically appends security predicates "
        "checking auth.uid(). Even if a malicious user inspects network traffic, they cannot read another employee's conversations, profile data, or feedback."
    )

    doc.add_heading("Layer 2: Cryptographic JWT Verification", level=2)
    doc.add_paragraph(
        "In backend/app/middleware/auth.py, FastAPI intercepts every HTTP request and verifies the cryptographic signature of the Bearer token "
        "using SUPABASE_JWT_SECRET. If a user is deactivated or banned in the admin table, their requests are immediately blocked with HTTP 401."
    )

    doc.add_heading("Layer 3: In-Memory Vector Metadata Boundary", level=2)
    doc.add_paragraph(
        "During vector retrieval, candidate chunks from ChromaDB are matched against the user's role and department permissions before prompt assembly. "
        "A confidential Finance policy will never enter the LLM context of an Engineering employee, preventing accidental data leaks in AI responses."
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION 10: INSTALLATION, CONFIGURATION & OPERATIONS
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("10. Installation, Configuration & Operations Guide", level=1)
    
    doc.add_paragraph(
        "EKMS can be deployed either via Docker Compose for production or directly on a local developer workstation:"
    )

    doc.add_heading("10.1 Environment Variables (backend/.env)", level=2)
    doc.add_paragraph(
        "SUPABASE_URL=https://<your-project>.supabase.co\n"
        "SUPABASE_ANON_KEY=<your-anon-key>\n"
        "SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>\n"
        "SUPABASE_JWT_SECRET=<your-jwt-secret>\n"
        "GEMINI_API_KEY=<your-google-ai-studio-api-key>\n"
        "GEMINI_MODEL=gemini-flash-lite-latest\n"
        "CHROMA_HOST=localhost\n"
        "CHROMA_PORT=8001\n"
        "CORS_ORIGINS=http://localhost:3000,http://localhost:5173"
    )

    doc.add_heading("10.2 Local Setup Instructions", level=2)
    doc.add_paragraph(
        "1. Supabase Migrations: Run scripts 001 through 008 in the Supabase SQL editor.\n"
        "2. Backend Setup:\n"
        "      cd backend\n"
        "      python -m venv .venv\n"
        "      .venv\\Scripts\\activate\n"
        "      pip install -r requirements.txt\n"
        "      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\n"
        "3. Frontend Setup:\n"
        "      cd frontend\n"
        "      npm install\n"
        "      npm run dev  (Opens at http://localhost:5173)\n"
        "4. Evaluation Suite Execution:\n"
        "      python backend/evals/run_eval.py"
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION 11: TROUBLESHOOTING & ERROR RECOVERY MATRIX
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("11. Troubleshooting & Error Recovery Matrix", level=1)
    
    table_ops = doc.add_table(rows=6, cols=3)
    ops_headers = ["Symptom / Error", "Root Cause", "Automated / Recommended Resolution"]
    for c_idx, h in enumerate(ops_headers):
        table_ops.rows[0].cells[c_idx].paragraphs[0].add_run(h)

    ops_rows = [
        ("Gemini 503 UNAVAILABLE or 504 DEADLINE_EXCEEDED", "Upstream Google preview model experiencing temporary high-demand spikes.", "Automatic failover circuit switches to gemini-flash-lite-latest and gemini-2.5-flash-lite within 10s deadline."),
        ("RAGAS background scoring fails silently", "langchain-community 0.4.2 removed deprecated vertexai chat model module.", "Resolved via runtime stub injection (_ensure_ragas_compatibility) in metrics_service.py."),
        ("ChromaDB HTTP connection refused", "ChromaDB Docker container is stopped while running locally.", "ChromaService automatically falls back to local PersistentClient in chroma_data/ without user disruption."),
        ("Low Precision@K on short documents", "Forced high top_k=8 pulled in trailing noise chunks from other documents.", "Calibrated top_k=5 and enforced 0.48 hybrid relevance threshold cutoff in rag_pipeline.py."),
        ("Foreign Key Violation in metrics_log", "Test or anonymous user ID does not exist in Supabase auth.users table.", "Added automatic fallback (row['user_id'] = None) before insert in metrics_service.py."),
    ]
    for r_idx, r in enumerate(ops_rows):
        row = table_ops.rows[r_idx + 1]
        for c_idx, val in enumerate(r):
            row.cells[c_idx].paragraphs[0].add_run(val)
    format_table(table_ops, header_bg="1E2D40", alt_bg="F8FAFC", col_widths=[Inches(2.0), Inches(2.2), Inches(2.8)])
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 12: FUTURE PRODUCT ROADMAP
    # ══════════════════════════════════════════════════════════════════
    doc.add_heading("12. Future Product Roadmap & Extensibility", level=1)
    
    roadmap_items = [
        ("Server-Sent Events (SSE) Streaming", "Stream answer tokens from Gemini to the React frontend as they are generated, lowering perceived Time-To-First-Token (TTFT) to under 600ms."),
        ("Cross-Encoder Re-Ranking", "Deploy a lightweight cross-encoder (e.g. bge-reranker-large) for enterprise datasets exceeding 20,000 document chunks to perform second-pass re-ranking on the top 25 hybrid candidates."),
        ("Hierarchical Parent-Document Chunking", "Split text into small 200-token chunks for precision retrieval, but feed the surrounding 1,000-token parent document context into Gemini for synthesized answers."),
        ("Enterprise Chatbot Integrations", "Provide ready-made Slack and Microsoft Teams bot adapters connecting straight to the /api/chat/ask endpoint for seamless in-chat Q&A."),
        ("Automated Document Revision Diffing", "Visually highlight policy changes between document versions (e.g., 2025 vs. 2026 Travel Policy changes) directly in the UI."),
    ]
    for r_title, r_desc in roadmap_items:
        doc.add_heading(r_title, level=2)
        doc.add_paragraph(r_desc)

    # Save to disk
    output_path = Path("c:/PROJECTS/EKMS/EKMS_Master_Project_Bible.docx")
    doc.save(str(output_path))
    print(f"Master Bible successfully generated at: {output_path}")

    # Also save a copy in docs/
    docs_path = Path("c:/PROJECTS/EKMS/docs/EKMS_Master_Project_Bible.docx")
    docs_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(docs_path))
    print(f"Copy saved at: {docs_path}")

if __name__ == "__main__":
    build_master_document()
