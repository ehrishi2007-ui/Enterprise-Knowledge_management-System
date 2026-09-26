"""Metrics service for computing and persisting RAG evaluation metrics.

Handles two categories:
  1. Custom IR metrics  — Precision@K, Recall@K, MRR, Hit@K
                          Pure math from ChromaDB similarity scores.
                          No LLM calls, runs in microseconds.

  2. RAGAS metrics      — Faithfulness, Answer Relevancy,
                          Context Precision, Context Relevance.
                          LLM-as-judge using Gemini. Runs async
                          in a background task after response is sent.

Entry point: compute_and_save() — call as a FastAPI BackgroundTask.
It is designed to be completely safe: never raises, never blocks the
user-facing response.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any

from langchain_core.documents import Document

from app.config import settings

logger = logging.getLogger(__name__)

# Cosine similarity score >= this value → chunk is "relevant".
# Stored in metrics_log so it can be reviewed and tuned per deployment.
DEFAULT_RELEVANCE_THRESHOLD = 0.5


# ══════════════════════════════════════════════════════════════════
# 1. Custom IR Metrics  (pure math, no LLM)
# ══════════════════════════════════════════════════════════════════

def compute_ir_metrics(
    candidate_docs_with_scores: List[Tuple[Document, float]],
    retrieved_docs_with_scores: List[Tuple[Document, float]],
    threshold: float = DEFAULT_RELEVANCE_THRESHOLD,
) -> Dict[str, Any]:
    """Compute Precision@K, Recall@K, MRR, Hit@K from scored document lists.

    Args:
        candidate_docs_with_scores:
            Full candidate pool from ChromaDB *before* RBAC filtering,
            with their cosine similarity scores. Used as the Recall denominator.
        retrieved_docs_with_scores:
            Final docs shown to Gemini *after* RBAC filtering, with scores.
            Order matters for MRR (rank 1 = first element).
        threshold:
            Minimum score to count a chunk as "relevant". Default 0.5.

    Returns:
        Dict with all IR metric values ready to INSERT into metrics_log.
    """
    k = len(retrieved_docs_with_scores)
    candidate_count = len(candidate_docs_with_scores)

    if k == 0:
        return {
            "retrieved_chunk_count": 0,
            "candidate_count": candidate_count,
            "relevant_retrieved": 0,
            "precision_at_k": 0.0,
            "recall_at_k": 0.0,
            "mrr": 0.0,
            "hit_at_k": False,
        }

    # ── Precision@K ─────────────────────────────────────────────
    # Of the top-K retrieved chunks, how many scored >= threshold?
    relevant_retrieved = sum(1 for _, score in retrieved_docs_with_scores if score >= threshold)
    precision_at_k = relevant_retrieved / k

    # ── Recall@K ────────────────────────────────────────────────
    # Of ALL chunks in the full candidate pool that scored >= threshold
    # (i.e., the set of "actually relevant" chunks the DB knows about),
    # how many did we surface in the final retrieved set?
    total_relevant_in_pool = sum(
        1 for _, score in candidate_docs_with_scores if score >= threshold
    )
    recall_at_k = (
        relevant_retrieved / total_relevant_in_pool
        if total_relevant_in_pool > 0
        else 1.0  # Nothing is relevant → nothing to miss
    )

    # ── MRR — Mean Reciprocal Rank ───────────────────────────────
    # 1 / (rank of the FIRST chunk that scored >= threshold)
    # Rank 1 = first position in retrieved_docs_with_scores.
    mrr = 0.0
    for rank, (_, score) in enumerate(retrieved_docs_with_scores, start=1):
        if score >= threshold:
            mrr = 1.0 / rank
            break  # Only the first relevant result matters for MRR

    # ── Hit@K ────────────────────────────────────────────────────
    # Did we retrieve at least one relevant chunk?
    hit_at_k = relevant_retrieved > 0

    return {
        "retrieved_chunk_count": k,
        "candidate_count": candidate_count,
        "relevant_retrieved": relevant_retrieved,
        "precision_at_k": round(precision_at_k, 4),
        "recall_at_k": round(recall_at_k, 4),
        "mrr": round(mrr, 4),
        "hit_at_k": hit_at_k,
    }


# ══════════════════════════════════════════════════════════════════
# 2. RAGAS Generation Metrics  (LLM-as-judge)
# ══════════════════════════════════════════════════════════════════

def _build_ragas_wrappers():
    """Wrap the existing Gemini LLM and HuggingFace embeddings for RAGAS.

    Reuses the same models already loaded by the RAG pipeline — no extra
    API keys or cold-start overhead.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from app.services.embedding_service import embedding_service

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,   # Deterministic judging
            max_retries=1,
            timeout=30.0,
        )
        return LangchainLLMWrapper(llm), LangchainEmbeddingsWrapper(embedding_service.embeddings)
    except Exception as e:
        logger.warning(f"Could not build RAGAS wrappers: {e}")
        return None, None


def run_ragas_eval(
    question: str,
    answer: str,
    contexts: List[str],
) -> Dict[str, Any]:
    """Run RAGAS reference-free evaluation (no ground-truth labels needed).

    Metrics computed:
      - faithfulness:       Is the answer factually grounded in the context?
      - answer_relevancy:   Does the answer actually address the question?
      - context_precision:  Are the retrieved chunks relevant to the question?
      - context_relevancy:  Is the context on-topic overall?

    Args:
        question: The original user question.
        answer:   Gemini's generated answer.
        contexts: List of chunk texts passed as context to Gemini.

    Returns:
        Dict with scores (0–1 floats) and a ragas_status string.
    """
    try:
        from ragas import evaluate, EvaluationDataset, SingleTurnSample
        from ragas.metrics import (
            Faithfulness,
            AnswerRelevancy,
            LLMContextPrecisionWithoutReference,
            LLMContextRelevance,
        )

        ragas_llm, ragas_embeddings = _build_ragas_wrappers()
        if ragas_llm is None:
            return {"ragas_status": "failed"}

        sample = SingleTurnSample(
            user_input=question,
            response=answer,
            retrieved_contexts=contexts if contexts else ["No context retrieved."],
        )
        dataset = EvaluationDataset(samples=[sample])

        result = evaluate(
            dataset,
            metrics=[
                Faithfulness(llm=ragas_llm),
                AnswerRelevancy(llm=ragas_llm, embeddings=ragas_embeddings),
                LLMContextPrecisionWithoutReference(llm=ragas_llm),
                LLMContextRelevance(llm=ragas_llm),
            ],
        )

        row = result.to_pandas().iloc[0].to_dict()

        return {
            "faithfulness":       _safe_float(row.get("faithfulness")),
            "answer_relevancy":   _safe_float(row.get("answer_relevancy")),
            # Column name differs slightly across RAGAS patch versions
            "context_precision":  _safe_float(
                row.get("llm_context_precision_without_reference")
                or row.get("context_precision")
            ),
            "context_relevancy":  _safe_float(
                row.get("llm_context_relevance")
                or row.get("context_relevancy")
            ),
            "ragas_status": "done",
        }

    except ImportError:
        logger.warning(
            "RAGAS package not installed — generation metrics skipped. "
            "Install with: pip install ragas>=0.2.0"
        )
        return {"ragas_status": "not_installed"}
    except Exception as e:
        logger.warning(f"RAGAS evaluation failed (non-critical): {e}")
        return {"ragas_status": "failed"}


def _safe_float(val) -> Optional[float]:
    """Convert val to float, return None on NaN / None / error."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if f != f else round(f, 4)  # NaN check: NaN != NaN
    except (TypeError, ValueError):
        return None


# ══════════════════════════════════════════════════════════════════
# 3. Orchestrator — compute all + persist to Supabase
# ══════════════════════════════════════════════════════════════════

def compute_and_save(
    message_id: Optional[str],
    user_id: str,
    question: str,
    answer: str,
    candidate_docs_with_scores: List[Tuple[Document, float]],
    retrieved_docs_with_scores: List[Tuple[Document, float]],
    response_time_ms: int,
    had_error: bool,
    supabase_client,
    threshold: float = DEFAULT_RELEVANCE_THRESHOLD,
) -> None:
    """Compute all metrics and insert one row into metrics_log.

    Designed to be called as a FastAPI BackgroundTask — never raises,
    never blocks the user response. All failures are logged as warnings.

    Args:
        message_id:                  UUID of the assistant chat_messages row.
        user_id:                     UUID of the user who asked the question.
        question:                    The user's question text.
        answer:                      Gemini's generated answer.
        candidate_docs_with_scores:  Full ChromaDB candidate pool (pre-RBAC) with scores.
        retrieved_docs_with_scores:  Final docs passed to Gemini (post-RBAC) with scores.
        response_time_ms:            End-to-end latency of the RAG pipeline.
        had_error:                   True if the pipeline returned an error answer.
        supabase_client:             The Supabase service-role client.
        threshold:                   Relevance score threshold (default 0.5).
    """
    try:
        # ── Step 1: IR metrics (instant, no LLM) ─────────────────
        ir = compute_ir_metrics(
            candidate_docs_with_scores=candidate_docs_with_scores,
            retrieved_docs_with_scores=retrieved_docs_with_scores,
            threshold=threshold,
        )

        # ── Step 2: RAGAS metrics (LLM calls, ~5–15s) ────────────
        contexts = [doc.page_content for doc, _ in retrieved_docs_with_scores]
        ragas = run_ragas_eval(question=question, answer=answer, contexts=contexts)

        # ── Step 3: Persist ───────────────────────────────────────
        row = {
            "message_id":           message_id,
            "user_id":              user_id,
            "question":             question[:500],      # Guard against huge questions

            # IR
            "retrieved_chunk_count": ir["retrieved_chunk_count"],
            "candidate_count":       ir["candidate_count"],
            "relevance_threshold":   threshold,
            "relevant_retrieved":    ir["relevant_retrieved"],
            "precision_at_k":        ir["precision_at_k"],
            "recall_at_k":           ir["recall_at_k"],
            "mrr":                   ir["mrr"],
            "hit_at_k":              ir["hit_at_k"],

            # RAGAS
            "faithfulness":          ragas.get("faithfulness"),
            "answer_relevancy":      ragas.get("answer_relevancy"),
            "context_precision":     ragas.get("context_precision"),
            "context_relevancy":     ragas.get("context_relevancy"),
            "ragas_status":          ragas.get("ragas_status", "pending"),

            # Performance
            "response_time_ms":      response_time_ms,
            "had_error":             had_error,
        }

        supabase_client.table("metrics_log").insert(row).execute()
        logger.info(
            f"[Metrics] Saved | msg={message_id} | "
            f"P@K={ir['precision_at_k']:.2f} R@K={ir['recall_at_k']:.2f} "
            f"MRR={ir['mrr']:.2f} Hit={ir['hit_at_k']} | "
            f"RAGAS={ragas.get('ragas_status')}"
        )

    except Exception as e:
        # Metric failure must never affect the user experience
        logger.warning(f"[Metrics] compute_and_save failed (non-critical): {e}")
