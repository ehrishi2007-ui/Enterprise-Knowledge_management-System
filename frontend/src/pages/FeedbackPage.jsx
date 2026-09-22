import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, ExternalLink, Bot, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../components/ui';

export default function FeedbackPage() {
  const { user } = useAuth();
  
  const [summary, setSummary] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchFeedbackData = async () => {
        try {
          setLoading(true);
          const [summaryRes, feedbackRes] = await Promise.all([
            api.get('/feedback/summary'),
            api.get('/feedback/?limit=50')
          ]);
          setSummary(summaryRes.data);
          setFeedback(feedbackRes.data || []);
        } catch (err) {
          console.error('Failed to load feedback data', err);
        } finally {
          setLoading(false);
        }
      };
      fetchFeedbackData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Employee View
  if (user?.role !== 'admin') {
    return (
      <div className="py-12 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <MessageSquare size={28} />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Provide AI Feedback</h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            You can rate any AI response as helpful or not helpful directly inside the AI Chat interface using the thumbs up and thumbs down icons.
          </p>
          <div className="pt-2">
            <Link to="/employee/chat">
              <Button variant="primary" className="w-full" icon={Bot}>
                Open AI Chat
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const filteredFeedback = feedback.filter(item => {
    if (filterRating === 'all') return true;
    return item.rating === filterRating;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">RAG Quality & Member Feedback</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
          Review community ratings on retrieved context answers and monitor hallucination flags.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating feedback reports..." />
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5">
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Total Ratings</span>
                <p className="text-3xl font-extrabold text-[var(--color-text)] mt-1">{summary.total_feedback || 0}</p>
              </Card>

              <Card className="p-5">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                  <ThumbsUp size={13} /> Helpful Responses
                </span>
                <p className="text-3xl font-extrabold text-[var(--color-text)] mt-1">{summary.helpful_count || 0}</p>
              </Card>

              <Card className="p-5">
                <span className="text-[11px] font-semibold text-red-500 uppercase flex items-center gap-1">
                  <ThumbsDown size={13} /> Needs Improvement
                </span>
                <p className="text-3xl font-extrabold text-[var(--color-text)] mt-1">{summary.not_helpful_count || 0}</p>
              </Card>

              <Card className="p-5">
                <span className="text-[11px] font-semibold text-teal uppercase">Helpful Percentage</span>
                <p className="text-3xl font-extrabold text-teal mt-1">{summary.helpful_percentage || 0}%</p>
              </Card>
            </div>
          )}

          {/* Feedback Feed with Filter */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-alt)]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Recent Ratings Log ({filteredFeedback.length})
              </h2>

              <div className="flex gap-1.5 text-xs">
                {['all', 'helpful', 'not_helpful'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterRating(mode)}
                    className={`px-3 py-1 rounded-md capitalize font-semibold transition-all ${
                      filterRating === mode
                        ? 'bg-teal text-white shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredFeedback.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                {filteredFeedback.map((item, idx) => {
                  const isHelpful = item.rating === 'helpful';
                  return (
                    <div key={idx} className="p-4 hover:bg-[var(--color-surface-alt)] transition-colors flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${isHelpful ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {isHelpful ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[var(--color-text)] leading-relaxed">
                            {item.comment ? `"${item.comment}"` : <span className="text-[var(--color-text-secondary)] italic">No comments provided with this rating.</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                            <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
                            {item.message_id && <span>• Msg: {item.message_id.slice(0, 8)}...</span>}
                          </div>
                        </div>
                      </div>

                      <Badge color={isHelpful ? 'green' : 'red'} size="sm">
                        {isHelpful ? 'Helpful' : 'Needs Review'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState 
                  title="No feedback entries found" 
                  description="Ratings submitted by members during chat will be logged here." 
                  icon={MessageSquare} 
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
