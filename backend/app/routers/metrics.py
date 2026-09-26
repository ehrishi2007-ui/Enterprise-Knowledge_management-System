"""Metrics router — admin-only endpoints for RAG evaluation dashboards.

Endpoints:
  GET /api/metrics/summary     — averages of all metrics over N days
  GET /api/metrics/retrieval   — IR metrics trend (daily)
  GET /api/metrics/generation  — RAGAS metrics trend (daily)
  GET /api/metrics/performance — latency, throughput, error rate

All endpoints require admin role.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from statistics import median

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.middleware.auth import require_admin
from app.dependencies import get_supabase_client

router = APIRouter(tags=["Metrics"])
logger = logging.getLogger(__name__)


# ── Response schemas ─────────────────────────────────────────────────────────

class MetricsSummary(BaseModel):
    period_days: int
    total_queries: int

    # IR retrieval metrics (averages)
    avg_precision_at_k:  Optional[float] = None
    avg_recall_at_k:     Optional[float] = None
    avg_mrr:             Optional[float] = None
    hit_at_k_rate:       Optional[float] = None   # % of queries where hit_at_k=True

    # RAGAS generation metrics (averages)
    avg_faithfulness:      Optional[float] = None
    avg_answer_relevancy:  Optional[float] = None
    avg_context_precision: Optional[float] = None
    avg_context_relevancy: Optional[float] = None
    ragas_coverage:        Optional[float] = None  # % of queries with completed RAGAS scores

    # System performance
    avg_response_time_ms: Optional[float] = None
    p95_response_time_ms: Optional[float] = None
    throughput_per_day:   Optional[float] = None
    error_rate:           Optional[float] = None   # fraction 0–1


class DailyDataPoint(BaseModel):
    date: str
    value: Optional[float] = None
    count: int = 0


class RetrievalTrend(BaseModel):
    precision: List[DailyDataPoint] = []
    recall:    List[DailyDataPoint] = []
    mrr:       List[DailyDataPoint] = []
    hit_rate:  List[DailyDataPoint] = []


class GenerationTrend(BaseModel):
    faithfulness:      List[DailyDataPoint] = []
    answer_relevancy:  List[DailyDataPoint] = []
    context_precision: List[DailyDataPoint] = []
    context_relevancy: List[DailyDataPoint] = []


class PerformanceTrend(BaseModel):
    latency:    List[DailyDataPoint] = []
    throughput: List[DailyDataPoint] = []
    errors:     List[DailyDataPoint] = []


# ── Helpers ──────────────────────────────────────────────────────────────────

def _avg(values: list) -> Optional[float]:
    """Return average of a list, ignoring None. Returns None if list is empty."""
    filtered = [v for v in values if v is not None]
    return round(sum(filtered) / len(filtered), 4) if filtered else None


def _p95(values: list) -> Optional[float]:
    """95th percentile of a numeric list."""
    filtered = sorted([v for v in values if v is not None])
    if not filtered:
        return None
    idx = int(len(filtered) * 0.95)
    return round(filtered[min(idx, len(filtered) - 1)], 2)


def _fetch_rows(supabase, since_iso: str) -> list:
    """Fetch all metrics_log rows after since_iso, ordered by created_at."""
    try:
        resp = (
            supabase.table("metrics_log")
            .select("*")
            .gte("created_at", since_iso)
            .order("created_at", desc=False)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.error(f"Failed to fetch metrics_log: {e}")
        raise HTTPException(status_code=500, detail="Failed to query metrics data")


def _group_by_day(rows: list, field: str) -> List[DailyDataPoint]:
    """Group rows by UTC date and compute daily average of `field`."""
    daily: dict = {}
    for row in rows:
        date_str = row.get("created_at", "")[:10]  # YYYY-MM-DD
        if not date_str:
            continue
        val = row.get(field)
        if date_str not in daily:
            daily[date_str] = {"values": [], "count": 0}
        daily[date_str]["count"] += 1
        if val is not None:
            daily[date_str]["values"].append(float(val))

    return [
        DailyDataPoint(
            date=date,
            value=_avg(data["values"]),
            count=data["count"],
        )
        for date, data in sorted(daily.items())
    ]


def _since_iso(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client),
):
    """Overall averages of all metrics over the requested period."""
    rows = _fetch_rows(supabase, _since_iso(days))
    n = len(rows)

    if n == 0:
        return MetricsSummary(period_days=days, total_queries=0)

    latencies  = [r.get("response_time_ms") for r in rows]
    errors     = [r.get("had_error", False) for r in rows]
    hits       = [r.get("hit_at_k", False) for r in rows]
    ragas_done = [r for r in rows if r.get("ragas_status") == "done"]

    return MetricsSummary(
        period_days=days,
        total_queries=n,

        # IR (all rows — custom math runs for every query)
        avg_precision_at_k = _avg([r.get("precision_at_k") for r in rows]),
        avg_recall_at_k    = _avg([r.get("recall_at_k")    for r in rows]),
        avg_mrr            = _avg([r.get("mrr")            for r in rows]),
        hit_at_k_rate      = round(sum(1 for h in hits if h) / n, 4),

        # RAGAS (only rows where evaluation completed)
        avg_faithfulness      = _avg([r.get("faithfulness")      for r in ragas_done]),
        avg_answer_relevancy  = _avg([r.get("answer_relevancy")  for r in ragas_done]),
        avg_context_precision = _avg([r.get("context_precision") for r in ragas_done]),
        avg_context_relevancy = _avg([r.get("context_relevancy") for r in ragas_done]),
        ragas_coverage        = round(len(ragas_done) / n, 4) if n > 0 else None,

        # System performance
        avg_response_time_ms = _avg([r for r in latencies if r is not None]),
        p95_response_time_ms = _p95(latencies),
        throughput_per_day   = round(n / max(days, 1), 2),
        error_rate           = round(sum(1 for e in errors if e) / n, 4),
    )


@router.get("/retrieval", response_model=RetrievalTrend)
async def get_retrieval_trend(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client),
):
    """Daily trend of IR retrieval metrics: Precision@K, Recall@K, MRR, Hit@K."""
    rows = _fetch_rows(supabase, _since_iso(days))

    # Hit@K: convert boolean to 0/1 for averaging
    hit_rows = [{**r, "_hit_num": 1 if r.get("hit_at_k") else 0} for r in rows]

    return RetrievalTrend(
        precision = _group_by_day(rows, "precision_at_k"),
        recall    = _group_by_day(rows, "recall_at_k"),
        mrr       = _group_by_day(rows, "mrr"),
        hit_rate  = _group_by_day(hit_rows, "_hit_num"),
    )


@router.get("/generation", response_model=GenerationTrend)
async def get_generation_trend(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client),
):
    """Daily trend of RAGAS generation metrics (only rows where RAGAS completed)."""
    rows = _fetch_rows(supabase, _since_iso(days))
    ragas_rows = [r for r in rows if r.get("ragas_status") == "done"]

    return GenerationTrend(
        faithfulness      = _group_by_day(ragas_rows, "faithfulness"),
        answer_relevancy  = _group_by_day(ragas_rows, "answer_relevancy"),
        context_precision = _group_by_day(ragas_rows, "context_precision"),
        context_relevancy = _group_by_day(ragas_rows, "context_relevancy"),
    )


@router.get("/performance", response_model=PerformanceTrend)
async def get_performance_trend(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client),
):
    """Daily trend of system performance: latency, throughput (query count), error rate."""
    rows = _fetch_rows(supabase, _since_iso(days))

    # Error: convert bool to 0/1 for daily average (= daily error rate)
    err_rows = [{**r, "_err_num": 1 if r.get("had_error") else 0} for r in rows]

    # Throughput: count of queries per day (value = count)
    daily_counts: dict = {}
    for row in rows:
        date_str = row.get("created_at", "")[:10]
        if date_str:
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
    throughput_points = [
        DailyDataPoint(date=d, value=float(c), count=c)
        for d, c in sorted(daily_counts.items())
    ]

    return PerformanceTrend(
        latency    = _group_by_day(rows, "response_time_ms"),
        throughput = throughput_points,
        errors     = _group_by_day(err_rows, "_err_num"),
    )
