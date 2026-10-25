"""Evaluation script for EKMS RAG pipeline.

Computes:
  - Precision@K
  - Recall@K
  - MRR (Mean Reciprocal Rank)
  - Hit@K
  - Latency: Average and P95 (ms)
Outputs a real-time results table and saves results to a JSON file.
Includes request pacing to respect Gemini API rate limits (15 RPM).
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import List, Dict, Any

# Ensure proper stdout encoding on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend directory is in Python path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.dependencies import get_supabase_client
from app.services.rag_pipeline import rag_pipeline
from app.services.metrics_service import compute_ir_metrics, DEFAULT_RELEVANCE_THRESHOLD

def calculate_p95(values: List[float]) -> float:
    """Calculate the 95th percentile of a list of numbers."""
    if not values:
        return 0.0
    sorted_v = sorted(values)
    idx = int(len(sorted_v) * 0.95)
    return sorted_v[min(idx, len(sorted_v) - 1)]

def run_evaluation(
    dataset_path: Path,
    output_path: Path,
    relevance_threshold: float = DEFAULT_RELEVANCE_THRESHOLD,
    limit: int = None,
    delay_between_requests: float = 4.2
) -> Dict[str, Any]:
    print(f"\n=======================================================", flush=True)
    print(f"             EKMS RAG PIPELINE EVALUATION              ", flush=True)
    print(f"=======================================================", flush=True)
    print(f"Dataset:             {dataset_path}", flush=True)
    print(f"Relevance Threshold: {relevance_threshold}", flush=True)
    print(f"Output File:         {output_path}", flush=True)
    print(f"Inter-query delay:   {delay_between_requests}s (to respect 15 RPM quota)", flush=True)
    
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)
        
    if limit and limit > 0:
        dataset = dataset[:limit]
        
    total_samples = len(dataset)
    print(f"Total Test Cases:    {total_samples}\n", flush=True)
    
    supabase = get_supabase_client()
    
    results = []
    latencies = []
    precisions = []
    recalls = []
    mrrs = []
    hits = []
    
    header = f"{'#':<3} | {'Question':<40} | {'P@K':<6} | {'R@K':<6} | {'MRR':<6} | {'Hit':<5} | {'Latency':<9}"
    print(header, flush=True)
    print("-" * len(header), flush=True)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    for idx, sample in enumerate(dataset, start=1):
        q = sample["question"]
        dept = sample.get("department", "All")
        role = sample.get("role", "employee")
        target_doc = sample.get("target_document", "")
        
        # Pacing: delay between queries to prevent 429 quota exhaustion
        if idx > 1 and delay_between_requests > 0:
            time.sleep(delay_between_requests)
            
        max_retries = 3
        rag_res = None
        elapsed_ms = 0.0
        
        for attempt in range(max_retries):
            t0 = time.perf_counter()
            rag_res = rag_pipeline.ask(
                question=q,
                conversation_history=[],
                user_department=dept,
                supabase_client=supabase,
                user_role=role
            )
            t1 = time.perf_counter()
            elapsed_ms = (t1 - t0) * 1000.0
            
            # Check if rate-limited
            err = rag_res.get("error", "")
            if "RESOURCE_EXHAUSTED" in err or "429" in err:
                print(f"[Attempt {attempt+1}] Rate limited on Q{idx}. Backing off for 15s...", flush=True)
                time.sleep(15.0)
            else:
                break
                
        latencies.append(elapsed_ms)
        
        metrics_data = rag_res.get("_metrics_data", {})
        cand_with_scores = metrics_data.get("candidate_docs_with_scores", [])
        ret_with_scores = metrics_data.get("retrieved_docs_with_scores", [])
        
        ir_metrics = compute_ir_metrics(
            candidate_docs_with_scores=cand_with_scores,
            retrieved_docs_with_scores=ret_with_scores,
            threshold=relevance_threshold
        )
        
        p_at_k = ir_metrics["precision_at_k"]
        r_at_k = ir_metrics["recall_at_k"]
        mrr = ir_metrics["mrr"]
        hit = ir_metrics["hit_at_k"]
        
        precisions.append(p_at_k)
        recalls.append(r_at_k)
        mrrs.append(mrr)
        hits.append(1.0 if hit else 0.0)
        
        sources = rag_res.get("sources", [])
        retrieved_titles = [s.get("title", "") for s in sources]
        target_retrieved = any(target_doc.lower() in t.lower() for t in retrieved_titles) if target_doc else True
        
        q_display = (q[:37] + "...") if len(q) > 40 else q
        hit_str = "YES" if hit else "NO"
        print(f"{idx:<3} | {q_display:<40} | {p_at_k:<6.2f} | {r_at_k:<6.2f} | {mrr:<6.2f} | {hit_str:<5} | {elapsed_ms:>7.1f}ms", flush=True)
        
        results.append({
            "id": sample.get("id", f"sample_{idx}"),
            "question": q,
            "target_document": target_doc,
            "target_retrieved": target_retrieved,
            "answer": rag_res.get("answer", ""),
            "sources_count": len(sources),
            "precision_at_k": p_at_k,
            "recall_at_k": r_at_k,
            "mrr": mrr,
            "hit_at_k": hit,
            "latency_ms": round(elapsed_ms, 2)
        })
        
        # Save intermediate snapshot every 5 queries
        if idx % 5 == 0 or idx == total_samples:
            current_summary = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "total_samples": idx,
                "relevance_threshold": relevance_threshold,
                "summary": {
                    "avg_precision_at_k": round(sum(precisions) / len(precisions), 4),
                    "avg_recall_at_k": round(sum(recalls) / len(recalls), 4),
                    "avg_mrr": round(sum(mrrs) / len(mrrs), 4),
                    "hit_at_k_rate": round(sum(hits) / len(hits), 4),
                    "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
                    "p95_latency_ms": round(calculate_p95(latencies), 2)
                },
                "individual_results": results
            }
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(current_summary, f, indent=2, ensure_ascii=False)
        
    avg_precision = sum(precisions) / len(precisions) if precisions else 0.0
    avg_recall = sum(recalls) / len(recalls) if recalls else 0.0
    avg_mrr = sum(mrrs) / len(mrrs) if mrrs else 0.0
    hit_rate = sum(hits) / len(hits) if hits else 0.0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    p95_latency = calculate_p95(latencies)
    
    print("-" * len(header), flush=True)
    print(f"\n================ SUMMARY METRICS ================", flush=True)
    print(f"Total Evaluated:       {total_samples}", flush=True)
    print(f"Average Precision@K:   {avg_precision * 100:.2f}%", flush=True)
    print(f"Average Recall@K:      {avg_recall * 100:.2f}%", flush=True)
    print(f"Mean Reciprocal Rank:  {avg_mrr:.4f}", flush=True)
    print(f"Hit@K Rate:            {hit_rate * 100:.2f}%", flush=True)
    print(f"Average Latency:       {avg_latency:.1f} ms ({avg_latency/1000.0:.2f} s)", flush=True)
    print(f"P95 Latency:           {p95_latency:.1f} ms ({p95_latency/1000.0:.2f} s)", flush=True)
    print(f"=================================================\n", flush=True)
    print(f"Saved evaluation results to: {output_path}", flush=True)
    return current_summary

if __name__ == "__main__":
    base_eval_dir = Path(__file__).resolve().parent
    dataset_file = base_eval_dir / "golden_set.json"
    output_filename = sys.argv[1] if len(sys.argv) > 1 else "baseline.json"
    results_file = base_eval_dir / "results" / output_filename
    
    run_evaluation(
        dataset_path=dataset_file,
        output_path=results_file
    )
