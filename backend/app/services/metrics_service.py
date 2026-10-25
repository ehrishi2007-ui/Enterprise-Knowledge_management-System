"""Metrics service for computing and persisting RAG evaluation metrics.

Handles two categories:
  1. Custom IR metrics  — Precision@K, Recall@K, MRR, Hit@K
                          Pure math from ChromaDB similarity scores.
                          No LLM calls, runs in microseconds.

  2. RAGAS metrics      — Faithfulness, Answer Relevancy, Context Precision.
                          LLM-as-judge using Gemini. Runs async
                          in a background task after response is sent.

Entry point: compute_and_save() — call as a FastAPI BackgroundTask.
"""

import sys
import types
import logging
from typing import List, Tuple, Optional, Dict, Any

from langchain_core.documents import Document

from app.config import settings

logger = logging.getLogger(__name__)

# Cosine similarity score >= this value → chunk is "relevant".
DEFAULT_RELEVANCE_THRESHOLD = 0.5


def _ensure_ragas_compatibility():
    """Ensure deprecated/removed modules in newer langchain-community don't break ragas imports."""
    if "langchain_community.chat_models.vertexai" not in sys.modules:
        m1 = types.ModuleType("langchain_community.chat_models.vertexai")
        class DummyChatVertexAI:
            pass
        m1.ChatVertexAI = DummyChatVertexAI
        sys.modules["langchain_community.chat_models.vertexai"] = m1

    if "langchain_community.llms.vertexai" not in sys.modules:
        m2 = types.ModuleType("langchain_community.llms.vertexai")
        class DummyVertexAI:
            pass
        m2.VertexAI = DummyVertexAI
        sys.modules["langchain_community.llms.vertexai"] = m2


# ══════════════════════════════════════════════════════════════════
# 1. Custom IR Metrics  (pure math, no LLM)
# ══════════════════════════════════════════════════════════════════

def compute_ir_metrics(
    candidate_docs_with_scores: List[Tuple[Document, float]],
    retrieved_docs_with_scores: List[Tuple[Document, float]],
    threshold: float = DEFAULT_RELEVANCE_THRESHOLD,
) -> Dict[str, Any]:
    """Compute Precision@K, Recall@K, MRR, Hit@K from scored document lists."""
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

    relevant_retrieved = sum(1 for _, score in retrieved_docs_with_scores if score >= threshold)
    precision_at_k = relevant_retrieved / k

    total_relevant_in_pool = sum(
        1 for _, score in candidate_docs_with_scores if score >= threshold
    )
    recall_at_k = (
        relevant_retrieved / total_relevant_in_pool
        if total_relevant_in_pool > 0
        else 1.0
    )

    mrr = 0.0
    for rank, (_, score) in enumerate(retrieved_docs_with_scores, start=1):
        if score >= threshold:
            mrr = 1.0 / rank
            break

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
    """Wrap the existing Gemini LLM and HuggingFace embeddings for RAGAS."""
    _ensure_ragas_compatibility()
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from app.services.embedding_service import embedding_service

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
            max_retries=1,
            timeout=30.0,
        )
        return LangchainLLMWrapper(llm), LangchainEmbeddingsWrapper(embedding_service.embeddings)
    except Exception as e:
        logger.error(f"[RAGAS] Failed to build RAGAS model wrappers: {e}", exc_info=True)
        return None, None


def run_ragas_eval(
    question: str,
    answer: str,
    contexts: List[str],
) -> Dict[str, Any]:
    """Run RAGAS reference-free evaluation with visible error logging."""
    _ensure_ragas_compatibility()
    try:
        from ragas import evaluate, EvaluationDataset, SingleTurnSample
        from ragas.metrics import (
            Faithfulness,
            AnswerRelevancy,
            LLMContextPrecisionWithoutReference,
        )

        ragas_llm, ragas_embeddings = _build_ragas_wrappers()
        if ragas_llm is None or ragas_embeddings is None:
            logger.error("[RAGAS] Cannot run eval because LLM/Embeddings wrappers failed to initialize.")
            return {"ragas_status": "failed_init"}

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
            ],
        )

        row = result.to_pandas().iloc[0].to_dict()

        return {
            "faithfulness":       _safe_float(row.get("faithfulness")),
            "answer_relevancy":   _safe_float(row.get("answer_relevancy")),
            "context_precision":  _safe_float(
                row.get("llm_context_precision_without_reference")
                or row.get("context_precision")
            ),
            "context_relevancy":  None,
            "ragas_status": "done",
        }

    except ImportError as ie:
        logger.error(f"[RAGAS] Missing required RAGAS dependency: {ie}", exc_info=True)
        return {"ragas_status": f"not_installed: {ie}"}
    except Exception as e:
        logger.error(f"[RAGAS] Evaluation failed with exception: {e}", exc_info=True)
        return {"ragas_status": f"failed: {str(e)[:100]}"}


def _safe_float(val) -> Optional[float]:
    """Convert val to float, return None on NaN / None / error."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if f != f else round(f, 4)
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
    """Compute all metrics and insert one row into metrics_log."""
    try:
        # Step 1: IR metrics
        ir = compute_ir_metrics(
            candidate_docs_with_scores=candidate_docs_with_scores,
            retrieved_docs_with_scores=retrieved_docs_with_scores,
            threshold=threshold,
        )

        # Step 2: RAGAS metrics
        contexts = [doc.page_content for doc, _ in retrieved_docs_with_scores]
        ragas = run_ragas_eval(question=question, answer=answer, contexts=contexts)

        # Step 3: Persist
        row = {
            "message_id":           message_id,
            "user_id":              user_id,
            "question":             question[:500],

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
            f"RAGAS={ragas.get('ragas_status')} | "
            f"faith={ragas.get('faithfulness')} ans_rel={ragas.get('answer_relevancy')}"
        )

    except Exception as e:
        logger.error(f"[Metrics] compute_and_save failed visibly: {e}", exc_info=True)
