import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Search, MessageSquare, Bookmark, FileText, Bell, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner, CardSkeleton } from '../components/ui/LoadingSpinner';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    recent_chats: [],
    recent_documents: [],
    bookmarked_chats: [],
    announcements: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/chat/dashboard');
        setData(res.data);
      } catch (err) {
        setError('Failed to load your dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/employee/chat?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (error) {
    return (
      <div className="p-8 bg-slate-900 min-h-screen">
        <Card className="p-8 text-center bg-slate-800 border-slate-700">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-50 font-semibold">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      {/* Hero Section */}
      <div className="bg-slate-800 border-b border-slate-700 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
            Welcome back, {user?.display_name || 'User'}!
          </h1>
          <p className="text-slate-400 text-lg">What do you need help with today?</p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative mt-8">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question or search for documents..."
                className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-slate-700 rounded-full text-slate-50 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors shadow-lg"
              />
              <button 
                type="submit" 
                className="absolute right-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium transition-colors"
              >
                Ask
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Announcements */}
          <section>
            <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-orange-500" /> Announcements
            </h2>
            {loading ? <CardSkeleton /> : (
              data.announcements?.length > 0 ? (
                <div className="space-y-4">
                  {data.announcements.map((ann) => (
                    <Card key={ann.id} className="p-5 bg-slate-800 border-slate-700 border-l-4 border-l-orange-500">
                      <h3 className="font-semibold text-slate-50 mb-1">{ann.title}</h3>
                      <p className="text-sm text-slate-400">{ann.content}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <EmptyState title="No Announcements" description="You're all caught up!" icon={Bell} />
                </Card>
              )
            )}
          </section>

          {/* Recent Documents */}
          <section>
            <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-emerald-500" /> Recent Documents
            </h2>
            {loading ? <CardSkeleton /> : (
              data.recent_documents?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.recent_documents.map((doc) => (
                    <Card key={doc.id} className="p-4 bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-slate-900 rounded text-emerald-500">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-200 line-clamp-1">{doc.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{doc.department}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-800 border-slate-700">
                  <EmptyState title="No Recent Documents" description="Documents added recently will appear here." icon={FileText} />
                </Card>
              )
            )}
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Recent Chats */}
          <section>
            <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-500" /> Recent Chats
            </h2>
            <Card className="p-0 bg-slate-800 border-slate-700 overflow-hidden">
              {loading ? <div className="p-4"><LoadingSpinner /></div> : (
                data.recent_chats?.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {data.recent_chats.map((chat) => (
                      <Link key={chat.id} to={`/employee/chat?conversation=${chat.id}`} className="block p-4 hover:bg-slate-700 transition-colors">
                        <p className="text-sm font-medium text-slate-200 line-clamp-1">{chat.title || 'New Chat'}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(chat.updated_at || chat.created_at).toLocaleDateString()}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No Recent Chats" description="Start asking questions!" icon={MessageSquare} />
                )
              )}
            </Card>
          </section>

          {/* Bookmarked Chats */}
          <section>
            <h2 className="text-xl font-bold text-slate-50 mb-4 flex items-center">
              <Bookmark className="w-5 h-5 mr-2 text-purple-500" /> Bookmarks
            </h2>
            <Card className="p-0 bg-slate-800 border-slate-700 overflow-hidden">
              {loading ? <div className="p-4"><LoadingSpinner /></div> : (
                data.bookmarked_chats?.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {data.bookmarked_chats.map((chat) => (
                      <Link key={chat.id} to={`/employee/chat?conversation=${chat.id}`} className="block p-4 hover:bg-slate-700 transition-colors">
                        <p className="text-sm font-medium text-slate-200 line-clamp-1">{chat.title || 'Saved Chat'}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No Bookmarks" description="Save important chats for later." icon={Bookmark} />
                )
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
