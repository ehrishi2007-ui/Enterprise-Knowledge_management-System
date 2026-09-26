-- ============================================================
-- 008_metrics_log.sql
-- Stores one row per assistant message with all evaluation
-- metrics: IR retrieval scores + RAGAS generation scores +
-- system performance.
-- ============================================================

CREATE TABLE IF NOT EXISTS metrics_log (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id              UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id                 UUID REFERENCES auth.users(id),
    question                TEXT,

    -- ── Retrieval metrics (custom math from similarity scores) ──
    retrieved_chunk_count   INT     DEFAULT 0,
    candidate_count         INT     DEFAULT 0,
    relevance_threshold     FLOAT   DEFAULT 0.5,
    relevant_retrieved      INT     DEFAULT 0,
    precision_at_k          FLOAT,          -- relevant_retrieved / retrieved_chunk_count
    recall_at_k             FLOAT,          -- relevant_retrieved / total relevant in candidate pool
    mrr                     FLOAT,          -- 1 / rank of first relevant chunk
    hit_at_k                BOOLEAN DEFAULT false,  -- any chunk score >= threshold?

    -- ── RAGAS generation metrics (LLM-as-judge) ──
    faithfulness            FLOAT,          -- is answer grounded in context? 0–1
    answer_relevancy        FLOAT,          -- does answer address the question? 0–1
    context_precision       FLOAT,          -- are retrieved chunks relevant? 0–1
    context_relevancy       FLOAT,          -- is context on-topic? 0–1
    ragas_status            TEXT    DEFAULT 'pending',  -- pending | done | failed | not_installed

    -- ── System performance ──
    response_time_ms        INT     DEFAULT 0,
    had_error               BOOLEAN DEFAULT false,

    created_at              TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_metrics_log_created_at
    ON metrics_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_log_user_id
    ON metrics_log(user_id);

CREATE INDEX IF NOT EXISTS idx_metrics_log_message_id
    ON metrics_log(message_id);

-- RLS: backend uses the service_role key (bypasses RLS by default).
-- Enable RLS so direct client access is restricted.
ALTER TABLE metrics_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all rows via direct client (e.g. Supabase Studio)
CREATE POLICY "Admins can read metrics_log"
    ON metrics_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );
