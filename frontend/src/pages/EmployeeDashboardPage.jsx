import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../hooks/useDepartments';
import { 
  Search, Bot, Bookmark, FileText, Bell, Sparkles, 
  ArrowRight, Clock, ChevronRight, BookOpen, Layers
} from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../components/ui';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { getDeptColor } = useDepartments();
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    recent_chats: [],
    recent_documents: [],
    bookmarked_chats: [],
    announcements: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/chat/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/employee/chat?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-navy-900 border border-navy-800 text-white p-6 md:p-10 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/20 border border-teal/40 text-teal-300 text-xs font-semibold">
            <Sparkles size={13} />
            <span>AI-Powered Knowledge Repository</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            Welcome back, {user?.display_name || 'Member'}!
          </h1>
          <p className="text-sm md:text-base text-ice-300 max-w-2xl leading-relaxed">
            Search institutional documents, consult policies, or ask our RAG assistant for cited answers.
          </p>
          
          {/* Quick Query Input */}
          <form onSubmit={handleSearch} className="relative max-w-2xl pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question or find documents (e.g. Leave Policy, Syllabus, Lab Guidelines)..."
                className="w-full pl-12 pr-28 py-3.5 bg-navy-950/80 border border-navy-700 rounded-xl text-white text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/30 placeholder:text-slate2 transition-all shadow-inner"
              />
              <button 
                type="submit" 
                className="absolute right-2 px-5 py-2 bg-teal hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1.5"
              >
                <span>Ask AI</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-slate2 self-center mr-1">Quick actions:</span>
            <Link
              to="/employee/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navy-800/80 hover:bg-teal/20 border border-navy-700 text-xs text-ice-200 transition-colors"
            >
              <Bot size={13} className="text-teal" />
              <span>New Conversation</span>
            </Link>
            <Link
              to="/employee/search"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navy-800/80 hover:bg-teal/20 border border-navy-700 text-xs text-ice-200 transition-colors"
            >
              <Search size={13} className="text-teal" />
              <span>Semantic Search</span>
            </Link>
            <Link
              to="/employee/documents"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-navy-800/80 hover:bg-teal/20 border border-navy-700 text-xs text-ice-200 transition-colors"
            >
              <BookOpen size={13} className="text-teal" />
              <span>Browse Repository</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 cols Announcements & Documents; Right 1 col Chats & Bookmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Announcements */}
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Bell size={18} />
                </div>
                <div>
                  <Card.Title>Official Announcements</Card.Title>
                  <Card.Description>Campus and organizational circulars</Card.Description>
                </div>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" message="Loading notices..." />
            ) : data.announcements?.length > 0 ? (
              <div className="space-y-3">
                {data.announcements.map((ann) => (
                  <div 
                    key={ann.id} 
                    className="p-4 rounded-xl bg-[var(--color-surface-alt)] border-l-4 border-l-teal border border-[var(--color-border)] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-[var(--color-text)]">{ann.title}</h4>
                      {ann.created_at && (
                        <span className="text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                          {new Date(ann.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {ann.content && (
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{ann.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No Announcements" 
                description="Everything is up to date." 
                icon={Bell} 
              />
            )}
          </Card>

          {/* Recent Documents */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <FileText size={18} />
                  </div>
                  <div>
                    <Card.Title>Recent Knowledge Documents</Card.Title>
                    <Card.Description>Latest uploaded policies, reports & syllabi</Card.Description>
                  </div>
                </div>
                <Link 
                  to="/employee/documents" 
                  className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
                >
                  <span>View all</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" message="Loading documents..." />
            ) : data.recent_documents?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.recent_documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    onClick={() => navigate(`/employee/search?q=${encodeURIComponent(doc.title)}`)}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-teal/50 hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-teal/10 text-teal shrink-0 group-hover:scale-105 transition-transform">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-[var(--color-text)] truncate group-hover:text-teal transition-colors">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          {doc.department && (
                            <Badge.Custom bgColor={getDeptColor(doc.department)}>
                              {doc.department}
                            </Badge.Custom>
                          )}
                          <span className="text-[11px] text-[var(--color-text-secondary)] uppercase">
                            {doc.file_type || 'PDF'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No Recent Documents" 
                description="Uploaded documents will be listed here." 
                icon={FileText} 
              />
            )}
          </Card>
        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          {/* Recent Conversations */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <Bot size={18} />
                  </div>
                  <div>
                    <Card.Title>Recent Chats</Card.Title>
                    <Card.Description>Resume your Q&A</Card.Description>
                  </div>
                </div>
                <Link to="/employee/chat" className="text-xs font-semibold text-teal hover:underline flex items-center gap-1">
                  <span>New</span>
                </Link>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" />
            ) : data.recent_chats?.length > 0 ? (
              <div className="space-y-2">
                {data.recent_chats.map((chat) => (
                  <Link 
                    key={chat.id} 
                    to={`/employee/chat?conversation=${chat.id}`}
                    className="block p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] hover:border-teal/40 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--color-text)] truncate group-hover:text-teal transition-colors">
                        {chat.title || 'New Conversation'}
                      </p>
                      <ChevronRight size={13} className="text-[var(--color-text-secondary)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      <Clock size={11} />
                      <span>{new Date(chat.updated_at || chat.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No Chats Yet" 
                description="Ask the AI assistant any question!" 
                icon={Bot} 
                action={() => navigate('/employee/chat')}
                actionLabel="Start First Chat"
              />
            )}
          </Card>

          {/* Bookmarked Chats */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-teal/10 text-teal">
                    <Bookmark size={18} />
                  </div>
                  <div>
                    <Card.Title>Saved Bookmarks</Card.Title>
                    <Card.Description>Pinned conversations</Card.Description>
                  </div>
                </div>
                <Link to="/employee/bookmarks" className="text-xs font-semibold text-teal hover:underline flex items-center gap-1">
                  <span>All</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" />
            ) : data.bookmarked_chats?.length > 0 ? (
              <div className="space-y-2">
                {data.bookmarked_chats.map((chat) => (
                  <Link 
                    key={chat.id} 
                    to={`/employee/chat?conversation=${chat.id}`}
                    className="block p-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] hover:border-teal/40 transition-all group"
                  >
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate group-hover:text-teal transition-colors">
                      {chat.title || 'Saved Chat'}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No Bookmarks" 
                description="Bookmark chats during your AI sessions to see them here." 
                icon={Bookmark} 
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
