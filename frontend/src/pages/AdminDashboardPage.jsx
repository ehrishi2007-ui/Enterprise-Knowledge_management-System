import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Users, FileText, Search, Clock, ThumbsUp, ThumbsDown, Settings, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner, CardSkeleton } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/announcements/admin/dashboard');
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center bg-slate-800 border-slate-700">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-50 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={fetchDashboardData} className="bg-orange-500 hover:bg-orange-600">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  const actions = [
    { label: 'Users', icon: Users, path: '/admin/users', color: 'bg-blue-500' },
    { label: 'Documents', icon: FileText, path: '/admin/documents', color: 'bg-emerald-500' },
    { label: 'Feedback', icon: MessageSquare, path: '/admin/feedback', color: 'bg-purple-500' },
    { label: 'Settings', icon: Settings, path: '/admin/settings', color: 'bg-slate-500' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Link key={action.label} to={action.path}>
            <Card className="p-4 flex flex-col items-center justify-center hover:bg-slate-700 transition-colors border-slate-700 bg-slate-800 cursor-pointer">
              <div className={`p-3 rounded-lg ${action.color} mb-3`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-slate-50 text-sm">{action.label}</span>
            </Card>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Users</h3>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-slate-50">{data?.total_users || 0}</p>
          </Card>
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Documents</h3>
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-slate-50">{data?.total_documents || 0}</p>
          </Card>
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Queries</h3>
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-slate-50">{data?.total_queries || 0}</p>
          </Card>
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Avg Response Time</h3>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-slate-50">{data?.avg_response_time_ms ? `${Math.round(data.avg_response_time_ms)}ms` : 'N/A'}</p>
          </Card>
        </div>
      )}

      {loading ? (
        <CardSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h3 className="text-lg font-semibold text-slate-50 mb-6 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-slate-400" />
              Feedback Summary
            </h3>
            {data?.feedback_summary ? (
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-4xl font-bold text-slate-50">{data.feedback_summary.helpful_percentage}%</p>
                    <p className="text-sm text-slate-400">Helpful Rating</p>
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex items-center text-sm text-emerald-400">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {data.feedback_summary.helpful_count}
                    </div>
                    <div className="flex items-center text-sm text-red-400">
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      {data.feedback_summary.not_helpful_count}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden flex">
                  <div className="bg-emerald-500 h-2.5" style={{ width: `${data.feedback_summary.helpful_percentage}%` }}></div>
                  <div className="bg-red-500 h-2.5" style={{ width: `${100 - data.feedback_summary.helpful_percentage}%` }}></div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No feedback data available.</p>
            )}
          </Card>
          
          <Card className="p-6 bg-slate-800 border-slate-700">
            <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-400" />
              Top Documents
            </h3>
            {data?.top_documents?.length > 0 ? (
              <ul className="space-y-3">
                {data.top_documents.map((doc, i) => (
                  <li key={i} className="flex justify-between items-center p-3 rounded bg-slate-900 border border-slate-700">
                    <span className="text-sm text-slate-200 truncate pr-4">{doc.title}</span>
                    <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-full whitespace-nowrap">{doc.views || 0} views</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 py-4">No document data available.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
