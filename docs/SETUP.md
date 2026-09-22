# EKMS Setup Guide

This guide covers setting up the Enterprise Knowledge Management System (EKMS) backend and database.

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note your database password.

### Run Migrations
1. Go to the **SQL Editor** in your Supabase dashboard.
2. Run the SQL files from the `supabase/migrations/` directory in this exact order:
   - `001_create_tables.sql`
   - `002_rls_policies.sql`
   - `003_triggers.sql`

*(The triggers script automatically creates the `documents` storage bucket for file uploads.)*

### Get API Keys
1. Go to **Project Settings** -> **API**.
2. Copy your `Project URL` (SUPABASE_URL), `anon` `public` key (SUPABASE_ANON_KEY), and `service_role` `secret` key (SUPABASE_SERVICE_ROLE_KEY).
3. Copy your `JWT Secret` from **Project Settings** -> **API** -> **JWT Settings**.

## 2. Environment Setup

1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit `backend/.env` and fill in your Supabase keys and your Gemini API key:
   - `GEMINI_API_KEY`: Get this from Google AI Studio.
   - Leave `CHROMA_HOST=chromadb` if using Docker Compose, or change to `localhost` if running without Docker.

## 3. Running the Application

### Option A: Using Docker Compose (Recommended)
This runs both the FastAPI backend and ChromaDB in containers.

1. Start the services:
   ```bash
   docker-compose up -d --build
   ```
2. The backend will be available at `http://localhost:8000`.
3. ChromaDB will be available at `http://localhost:8001`.

### Option B: Running without Docker (Local Dev)
1. Ensure you have Python 3.11+ installed.
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Change `CHROMA_HOST` to `localhost` in your `.env`.
4. (You must have ChromaDB running separately to use it fully).
5. Start the backend:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
