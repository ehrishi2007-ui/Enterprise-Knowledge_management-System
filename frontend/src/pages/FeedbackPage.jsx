import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

export default function FeedbackPage() {
  const { user } = useAuth();
  
  const [summary, setSummary] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setFeedback(feedbackRes.data);
        } catch (err) {
          setError('Failed to load feedback data.');
        } finally {
          setLoading(false);
        }
      };
      fetchFeedbackData();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center bg-slate-800 border-slate-700">
          <MessageSquare className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-50 mb-3">Provide Feedback</h2>
          <p className="text-slate-400 mb-6 text-sm">
            You can rate AI responses and provide feedback directly in the chat interface using the thumbs up/down buttons on each message.
          </p>
          <Link 
            to="/employee/chat" 
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            Go to Chat <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-900 min-h-screen">
        <Card className="p-8 text-center bg-slate-800 border-slate-700 text-red-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
          <p>{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50">System Feedback</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 bg-slate-800 border-slate-700">
                <p className="text-slate-400 text-sm font-medium mb-1">Total Feedback</p>
                <p className="text-3xl font-bold text-slate-50">{summary.total_feedback || 0}</p>
              </Card>
              <Card className="p-6 bg-slate-800 border-slate-700">
                <p className="text-emerald-400 text-sm font-medium mb-1 flex items-center"><ThumbsUp className="w-4 h-4 mr-1"/> Helpful</p>
                <p className="text-3xl font-bold text-slate-50">{summary.helpful_count || 0}</p>
              </Card>
              <Card className="p-6 bg-slate-800 border-slate-700">
                <p className="text-red-400 text-sm font-medium mb-1 flex items-center"><ThumbsDown className="w-4 h-4 mr-1"/> Not Helpful</p>
                <p className="text-3xl font-bold text-slate-50">{summary.not_helpful_count || 0}</p>
              </Card>
              <Card className="p-6 bg-slate-800 border-slate-700">
                <p className="text-slate-400 text-sm font-medium mb-1">Positive Ratio</p>
                <p className="text-3xl font-bold text-slate-50">{summary.helpful_percentage || 0}%</p>
              </Card>
            </div>
          )}

          {/* Feedback List */}
          <Card className="bg-slate-800 border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-slate-50">Recent Feedback</h2>
            </div>
            
            {feedback.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {feedback.map((item, idx) => {
                  const isHelpful = item.rating === 'helpful' || item.rating === 1;
                  return (
                    <div key={idx} className="p-6 hover:bg-slate-750 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-full ${isHelpful ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isHelpful ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm text-slate-300 mb-2">
                              {item.comment ? `"${item.comment}"` : <span className="text-slate-500 italic">No comment provided</span>}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-slate-500">
                              <span>{new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
                              {item.user_email && <span>• {item.user_email}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge variant={isHelpful ? 'success' : 'danger'}>
                          {isHelpful ? 'Helpful' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState title="No feedback yet" description="Feedback provided by users will appear here." icon={MessageSquare} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
