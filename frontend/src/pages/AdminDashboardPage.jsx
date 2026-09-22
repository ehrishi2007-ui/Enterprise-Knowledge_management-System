import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Users, FileText, Search, Clock, ThumbsUp, ThumbsDown, 
  Settings, MessageSquare, AlertTriangle, RefreshCw, 
  Plus, Building2, TrendingUp, HelpCircle
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../components/ui';
import AddAnnouncementModal from '../components/dashboard/AddAnnouncementModal';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/announcements/admin/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard metrics. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quickNav = [
    { label: 'Documents', icon: FileText, path: '/admin/documents', desc: 'Manage & Ingest PDFs' },
    { label: 'Departments', icon: Building2, path: '/admin/departments', desc: 'Units & Categories' },
    { label: 'User Directory', icon: Users, path: '/admin/users', desc: 'Accounts & Roles' },
    { label: 'AI Configuration', icon: Settings, path: '/admin/settings', desc: 'Prompts & Hyperparams' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Title and Announcement Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Admin Console & Analytics</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            System health, RAG usage metrics, and institutional repository stats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsNoticeModalOpen(true)}
            variant="primary"
            icon={Plus}
            size="sm"
          >
            Post Announcement
          </Button>
          <Button 
            onClick={fetchDashboardData}
            variant="secondary"
            icon={RefreshCw}
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickNav.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.path}>
              <Card hover className="h-full flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-lg bg-teal/10 text-teal">
                    <Icon size={18} />
                  </div>
                  <span className="font-semibold text-sm text-[var(--color-text)]">{action.label}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{action.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">Metrics Unavailable</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">{error}</p>
          <Button onClick={fetchDashboardData} size="sm" variant="secondary">
            Retry Connection
          </Button>
        </Card>
      ) : loading ? (
        <LoadingSpinner message="Calculating analytics..." />
      ) : (
        <>
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <div className="flex items-center justify-between text-[var(--color-text-secondary)] mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--color-text)]">{data?.total_users || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">Active directory profiles</span>
            </Card>

            <Card>
              <div className="flex items-center justify-between text-[var(--color-text-secondary)] mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Indexed Documents</span>
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <FileText size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--color-text)]">{data?.total_documents || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">Vectorized into ChromaDB</span>
            </Card>

            <Card>
              <div className="flex items-center justify-between text-[var(--color-text-secondary)] mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">AI Q&A Queries</span>
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Search size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--color-text)]">{data?.total_queries || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">Total answered questions</span>
            </Card>

            <Card>
              <div className="flex items-center justify-between text-[var(--color-text-secondary)] mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--color-text)]">
                {data?.avg_response_time_ms ? `${Math.round(data.avg_response_time_ms)}ms` : '< 1.2s'}
              </p>
              <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">RAG pipeline turnaround</span>
            </Card>
          </div>

          {/* Feedback & Usage Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Satisfaction Card */}
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <Card.Title>Answer Quality & Satisfaction</Card.Title>
                    <Card.Description>Member ratings on RAG AI responses</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {data?.feedback_summary ? (
                <div className="space-y-6 pt-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-4xl font-extrabold text-teal">
                        {data.feedback_summary.helpful_percentage}%
                      </span>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-medium">
                        Positive feedback ratio
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ThumbsUp size={15} />
                        <span>{data.feedback_summary.helpful_count} Helpful</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                        <ThumbsDown size={15} />
                        <span>{data.feedback_summary.not_helpful_count} Needs review</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-[var(--color-surface-alt)] rounded-full h-3 overflow-hidden flex border border-[var(--color-border)]">
                    <div 
                      className="bg-teal h-3 transition-all duration-500" 
                      style={{ width: `${data.feedback_summary.helpful_percentage || 50}%` }}
                    />
                    <div 
                      className="bg-red-400 h-3 transition-all duration-500" 
                      style={{ width: `${100 - (data.feedback_summary.helpful_percentage || 50)}%` }}
                    />
                  </div>

                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    Higher ratings indicate well-chunked documents and precise prompt alignment. Check the{' '}
                    <Link to="/admin/feedback" className="text-teal font-semibold hover:underline">
                      Feedback Log
                    </Link>{' '}
                    to inspect individual query feedback.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)] py-4">No feedback ratings received yet.</p>
              )}
            </Card>
            
            {/* Top Documents Card */}
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <Card.Title>Most Consulted Documents</Card.Title>
                    <Card.Description>Top referenced files in vector searches</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {data?.top_documents?.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {data.top_documents.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2.5 truncate pr-3">
                        <span className="text-xs font-bold text-teal">#{i + 1}</span>
                        <span className="text-xs font-semibold text-[var(--color-text)] truncate">{doc.title}</span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium whitespace-nowrap">
                        {doc.views || doc.count || 0} citations
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="No Documents Indexed" 
                  description="Upload institutional PDFs to start seeing citation analytics."
                  icon={FileText}
                  action={() => window.location.href = '/admin/documents'}
                  actionLabel="Upload First Document"
                />
              )}
            </Card>
          </div>
        </>
      )}

      {/* Modal for creating announcement */}
      <AddAnnouncementModal 
        isOpen={isNoticeModalOpen} 
        onClose={() => setIsNoticeModalOpen(false)}
        onAdded={() => fetchDashboardData()}
      />
    </div>
  );
}
