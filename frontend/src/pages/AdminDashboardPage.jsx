import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Users, FileText, Search, Clock, ThumbsUp, ThumbsDown, 
  Settings, MessageSquare, AlertTriangle, RefreshCw, 
  Plus, Building2, TrendingUp
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
      setError('Unable to load dashboard data. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quickNav = [
    { label: 'Documents', icon: FileText, path: '/admin/documents', desc: 'Upload & view files' },
    { label: 'Members', icon: Users, path: '/admin/users', desc: 'Accounts & access' },
    { label: 'Departments', icon: Building2, path: '/admin/settings', desc: 'Manage in Settings' },
    { label: 'Settings', icon: Settings, path: '/admin/settings', desc: 'Customize AI assistant' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Admin Dashboard</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Overview of your organization's documents, members, and question activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {quickNav.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.path}>
              <Card hover className="h-full p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <Icon size={16} />
                  </div>
                  <span className="font-semibold text-xs text-[var(--color-text)]">{action.label}</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">{action.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Server Reconnecting</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">{error}</p>
          <Button onClick={fetchDashboardData} size="sm" variant="secondary">
            Retry Now
          </Button>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Total Members</span>
              <p className="text-3xl font-bold text-[var(--color-text)] mt-1">{data?.total_users || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">Registered accounts</span>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Total Documents</span>
              <p className="text-3xl font-bold text-[var(--color-text)] mt-1">{data?.total_documents || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">Available for AI & search</span>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Questions Asked</span>
              <p className="text-3xl font-bold text-[var(--color-text)] mt-1">{data?.total_queries || 0}</p>
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">Answered by AI</span>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Response Speed</span>
              <p className="text-3xl font-bold text-[var(--color-text)] mt-1">
                {data?.avg_response_time_ms ? `${Math.round(data.avg_response_time_ms)}ms` : '< 1s'}
              </p>
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">Average answer time</span>
            </Card>
          </div>

          {/* Feedback & Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Member Satisfaction Card */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <Card.Title>Member Satisfaction</Card.Title>
                    <Card.Description>Helpful ratings from users on AI answers</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {data?.feedback_summary ? (
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-teal">
                      {data.feedback_summary.helpful_percentage}%
                    </span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ThumbsUp size={13} /> {data.feedback_summary.helpful_count} Helpful
                      </span>
                      <span className="text-red-500 font-semibold flex items-center gap-1">
                        <ThumbsDown size={13} /> {data.feedback_summary.not_helpful_count} Unhelpful
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-[var(--color-surface-alt)] rounded-full h-2.5 overflow-hidden flex border border-[var(--color-border)]">
                    <div 
                      className="bg-teal h-2.5 transition-all duration-500" 
                      style={{ width: `${data.feedback_summary.helpful_percentage || 50}%` }}
                    />
                    <div 
                      className="bg-red-400 h-2.5 transition-all duration-500" 
                      style={{ width: `${100 - (data.feedback_summary.helpful_percentage || 50)}%` }}
                    />
                  </div>

                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Users can rate any answer as helpful or unhelpful in the chat.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)] py-2">No feedback received yet.</p>
              )}
            </Card>
            
            {/* Top Documents Card */}
            <Card className="p-5">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <Card.Title>Most Consulted Documents</Card.Title>
                    <Card.Description>Frequently referenced files in answers</Card.Description>
                  </div>
                </div>
              </Card.Header>

              {data?.top_documents?.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {data.top_documents.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-bold text-teal">#{i + 1}</span>
                        <span className="font-semibold text-[var(--color-text)] truncate">{doc.title}</span>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-secondary)] shrink-0">
                        {doc.views || doc.count || 0} citations
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  title="No Documents Yet" 
                  description="Uploaded documents will appear here once referenced in answers."
                  icon={FileText}
                  action={() => window.location.href = '/admin/documents'}
                  actionLabel="Upload a Document"
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
