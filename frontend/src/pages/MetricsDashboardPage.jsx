import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  RefreshCw, TrendingUp, Zap, Target, AlertTriangle,
  CheckCircle, Clock, Activity, BarChart2, Info
} from 'lucide-react';
import api from '../lib/api';
import { Card, Button, LoadingSpinner } from '../components/ui';

// ── Colour palette (matches existing teal/navy theme) ─────────────────────
const TEAL   = '#599692';
const PURPLE = '#8b5cf6';
const AMBER  = '#f59e0b';
const ROSE   = '#f43f5e';
const NAVY   = '#1e2d40';

// ── Helper: format a 0–1 float as a percentage string ─────────────────────
const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : '—');
const ms  = (v) => (v != null ? `${Math.round(v)} ms`      : '—');

// ── Score colour: green / amber / red based on value ─────────────────────
function scoreColor(v, good = 0.75, ok = 0.5) {
  if (v == null) return 'text-[var(--color-text-secondary)]';
  if (v >= good) return 'text-emerald-500';
  if (v >= ok)  return 'text-amber-500';
  return 'text-rose-500';
}

// ── Single stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase text-[var(--color-text-secondary)]">{label}</span>
      <p className={`text-2xl font-extrabold ${colorClass || 'text-[var(--color-text)]'}`}>{value}</p>
      {sub && <span className="text-[11px] text-[var(--color-text-secondary)]">{sub}</span>}
    </Card>
  );
}

// ── Tooltip for radar chart ───────────────────────────────────────────────
function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2 text-xs shadow">
      <p className="font-semibold text-[var(--color-text)]">{d.name}</p>
      <p className="text-teal">{pct(d.value)}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function MetricsDashboardPage() {
  const [summary,     setSummary]     = useState(null);
  const [retrieval,   setRetrieval]   = useState(null);
  const [generation,  setGeneration]  = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [days,        setDays]        = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, g, p] = await Promise.all([
        api.get(`/metrics/summary?days=${days}`),
        api.get(`/metrics/retrieval?days=${days}`),
        api.get(`/metrics/generation?days=${days}`),
        api.get(`/metrics/performance?days=${days}`),
      ]);
      setSummary(s.data);
      setRetrieval(r.data);
      setGeneration(g.data);
      setPerformance(p.data);
    } catch {
      setError('Could not load metrics data.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build radar data for retrieval quality
  const retrievalRadar = summary ? [
    { metric: 'Precision',  value: summary.avg_precision_at_k ?? 0 },
    { metric: 'Recall',     value: summary.avg_recall_at_k    ?? 0 },
    { metric: 'MRR',        value: summary.avg_mrr            ?? 0 },
    { metric: 'Hit@K',      value: summary.hit_at_k_rate      ?? 0 },
  ] : [];

  // Build radar data for generation quality
  const generationRadar = summary ? [
    { metric: 'Faithfulness',    value: summary.avg_faithfulness      ?? 0 },
    { metric: 'Ans. Relevance',  value: summary.avg_answer_relevancy  ?? 0 },
    { metric: 'Ctx Precision',   value: summary.avg_context_precision ?? 0 },
    { metric: 'Ctx Relevance',   value: summary.avg_context_relevancy ?? 0 },
  ] : [];

  // Shared chart label formatter
  const pctTick = (v) => `${(v * 100).toFixed(0)}%`;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <BarChart2 size={22} className="text-teal" />
            AI Evaluation Metrics
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Retrieval quality (IR) · Answer quality (RAGAS) · System performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs border border-[var(--color-border)] rounded-lg px-3 py-2
                       bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none
                       focus:ring-2 focus:ring-teal/40"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <Button onClick={fetchAll} variant="secondary" icon={RefreshCw} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Notice: minimum queries ───────────────────────────────── */}
      {summary && summary.total_queries < 50 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30
                        border border-amber-200 dark:border-amber-800 text-xs text-amber-700
                        dark:text-amber-300">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>{summary.total_queries} queries</strong> logged so far.
            Scores become statistically reliable at <strong>50+</strong> queries.
            Keep using the system and check back.
          </span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading metrics…" />
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          <Button onClick={fetchAll} size="sm" variant="secondary" className="mt-3">
            Retry
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Summary stat cards ──────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Total Queries"
              value={summary?.total_queries ?? 0}
              sub={`Last ${days} days`}
            />
            <StatCard
              label="Avg Latency"
              value={ms(summary?.avg_response_time_ms)}
              sub={`p95: ${ms(summary?.p95_response_time_ms)}`}
              colorClass={
                summary?.avg_response_time_ms < 2000 ? 'text-emerald-500'
                : summary?.avg_response_time_ms < 4000 ? 'text-amber-500'
                : 'text-rose-500'
              }
            />
            <StatCard
              label="Hit@K Rate"
              value={pct(summary?.hit_at_k_rate)}
              sub="At least 1 relevant chunk retrieved"
              colorClass={scoreColor(summary?.hit_at_k_rate, 0.90, 0.75)}
            />
            <StatCard
              label="Error Rate"
              value={pct(summary?.error_rate)}
              sub="Failed requests"
              colorClass={
                (summary?.error_rate ?? 1) < 0.02 ? 'text-emerald-500'
                : (summary?.error_rate ?? 1) < 0.05 ? 'text-amber-500'
                : 'text-rose-500'
              }
            />
          </div>

          {/* ── Radar charts row ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Retrieval Quality Radar */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal"><Target size={16} /></div>
                  <div>
                    <Card.Title>Retrieval Quality</Card.Title>
                    <Card.Description>Precision · Recall · MRR · Hit@K</Card.Description>
                  </div>
                </div>
              </Card.Header>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { k: 'Precision@K', v: summary?.avg_precision_at_k },
                  { k: 'Recall@K',    v: summary?.avg_recall_at_k },
                  { k: 'MRR',         v: summary?.avg_mrr },
                  { k: 'Hit@K Rate',  v: summary?.hit_at_k_rate },
                ].map(({ k, v }) => (
                  <div key={k} className="bg-[var(--color-surface-alt)] rounded-lg p-2.5 border border-[var(--color-border)]">
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-medium">{k}</p>
                    <p className={`text-lg font-bold ${scoreColor(v)}`}>{pct(v)}</p>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={retrievalRadar}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                  <PolarRadiusAxis domain={[0, 1]} tickFormatter={pctTick} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke={TEAL} fill={TEAL} fillOpacity={0.25} />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Generation Quality Radar */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Zap size={16} /></div>
                  <div>
                    <Card.Title>Generation Quality (RAGAS)</Card.Title>
                    <Card.Description>
                      {summary?.ragas_coverage != null
                        ? `${pct(summary.ragas_coverage)} queries evaluated`
                        : 'LLM-as-judge scores'}
                    </Card.Description>
                  </div>
                </div>
              </Card.Header>

              {summary?.avg_faithfulness == null ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <Activity size={28} className="text-[var(--color-text-secondary)]" />
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    RAGAS scores will appear here after queries are processed.
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Scores compute in the background after each chat response.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { k: 'Faithfulness',     v: summary?.avg_faithfulness },
                      { k: 'Ans. Relevance',   v: summary?.avg_answer_relevancy },
                      { k: 'Ctx Precision',    v: summary?.avg_context_precision },
                      { k: 'Ctx Relevance',    v: summary?.avg_context_relevancy },
                    ].map(({ k, v }) => (
                      <div key={k} className="bg-[var(--color-surface-alt)] rounded-lg p-2.5 border border-[var(--color-border)]">
                        <p className="text-[10px] text-[var(--color-text-secondary)] font-medium">{k}</p>
                        <p className={`text-lg font-bold ${scoreColor(v)}`}>{pct(v)}</p>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={generationRadar}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                      <PolarRadiusAxis domain={[0, 1]} tickFormatter={pctTick} tick={{ fontSize: 9 }} />
                      <Radar name="Score" dataKey="value" stroke={PURPLE} fill={PURPLE} fillOpacity={0.25} />
                      <Tooltip content={<RadarTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </>
              )}
            </Card>
          </div>

          {/* ── Trend charts row ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Retrieval trend — line chart */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal"><TrendingUp size={16} /></div>
                  <div>
                    <Card.Title>Retrieval Metrics Trend</Card.Title>
                    <Card.Description>Daily averages</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {!retrieval?.precision?.length ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={retrieval.precision.map((d, i) => ({
                    date:      d.date,
                    precision: retrieval.precision[i]?.value,
                    recall:    retrieval.recall[i]?.value,
                    mrr:       retrieval.mrr[i]?.value,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tickFormatter={pctTick} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => pct(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="precision" name="Precision@K" stroke={TEAL}   dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="recall"    name="Recall@K"    stroke={PURPLE} dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="mrr"       name="MRR"         stroke={AMBER}  dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Response latency trend */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Clock size={16} /></div>
                  <div>
                    <Card.Title>Response Latency</Card.Title>
                    <Card.Description>Average ms per day</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {!performance?.latency?.length ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={performance.latency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="ms" />
                    <Tooltip formatter={(v) => `${Math.round(v)} ms`} />
                    <Line type="monotone" dataKey="value" name="Avg Latency" stroke={AMBER} dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Throughput + Error Rate ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Queries per day */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal"><Activity size={16} /></div>
                  <div>
                    <Card.Title>Queries per Day</Card.Title>
                    <Card.Description>Throughput trend</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {!performance?.throughput?.length ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={performance.throughput}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Queries" fill={TEAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Error rate trend */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500"><AlertTriangle size={16} /></div>
                  <div>
                    <Card.Title>Daily Error Rate</Card.Title>
                    <Card.Description>Fraction of failed requests</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {!performance?.errors?.length ? (
                <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No errors recorded.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={performance.errors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tickFormatter={pctTick} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => pct(v)} />
                    <Line type="monotone" dataKey="value" name="Error Rate" stroke={ROSE} dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ── Interpretation guide ─────────────────────────────────── */}
          <Card className="p-5">
            <Card.Header>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal/10 text-teal"><CheckCircle size={16} /></div>
                <div>
                  <Card.Title>Score Interpretation</Card.Title>
                  <Card.Description>
                    What these numbers mean for system quality
                  </Card.Description>
                </div>
              </div>
            </Card.Header>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {['Metric', 'Good', 'Acceptable', 'Needs Work', 'Source'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 font-semibold text-[var(--color-text-secondary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {[
                    ['Precision@K',     '> 75%', '50–75%', '< 50%', 'Custom IR'],
                    ['Recall@K',        '> 80%', '60–80%', '< 60%', 'Custom IR'],
                    ['MRR',             '> 85%', '60–85%', '< 60%', 'Custom IR'],
                    ['Hit@K Rate',      '> 90%', '75–90%', '< 75%', 'Custom IR'],
                    ['Faithfulness',    '> 80%', '60–80%', '< 60%', 'RAGAS'],
                    ['Answer Relevance','> 75%', '55–75%', '< 55%', 'RAGAS'],
                    ['Avg Latency',     '< 2 s', '2–4 s',  '> 4 s', 'System'],
                    ['Error Rate',      '< 2%',  '2–5%',   '> 5%',  'System'],
                  ].map(([m, g, a, b, src]) => (
                    <tr key={m}>
                      <td className="py-2 pr-4 font-medium text-[var(--color-text)]">{m}</td>
                      <td className="py-2 pr-4 text-emerald-500 font-semibold">{g}</td>
                      <td className="py-2 pr-4 text-amber-500 font-semibold">{a}</td>
                      <td className="py-2 pr-4 text-rose-500 font-semibold">{b}</td>
                      <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{src}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
