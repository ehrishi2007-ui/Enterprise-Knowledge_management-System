import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Bot, Clock, BookmarkMinus, MessageSquare, ArrowRight } from 'lucide-react';
import { Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/conversations');
      const filtered = (res.data || []).filter(c => c.is_bookmarked);
      setBookmarks(filtered);
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (e, id) => {
    e.stopPropagation();
    try {
      await api.post(`/chat/conversations/${id}/bookmark`);
      setBookmarks(prev => prev.filter(c => c.id !== id));
      toast.success('Bookmark removed');
    } catch (err) {
      toast.error('Failed to remove bookmark');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Saved Bookmarks</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
          Pinned AI conversations and verified policy Q&A sessions.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving bookmarks..." />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No Bookmarks Saved Yet"
          description="Star conversations in the AI Assistant to access critical answers here anytime."
          action={() => navigate('/employee/chat')}
          actionLabel="Start a Chat"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((chat) => (
            <Card 
              key={chat.id} 
              hover
              className="flex flex-col justify-between h-full p-5 cursor-pointer"
              onClick={() => navigate(`/employee/chat?conversation=${chat.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-teal bg-teal/10 px-2 py-1 rounded-md text-xs font-semibold">
                    <Bot size={14} />
                    <span>AI Session</span>
                  </div>
                  <button 
                    onClick={(e) => handleRemoveBookmark(e, chat.id)}
                    className="p-1 text-[var(--color-text-secondary)] hover:text-teal rounded-lg transition-colors"
                    title="Remove Bookmark"
                  >
                    <BookmarkMinus size={16} />
                  </button>
                </div>
                
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-2 line-clamp-2 leading-snug">
                  {chat.title || 'Saved Conversation'}
                </h3>
              </div>
              
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mt-4 pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1">
                  <MessageSquare size={13} />
                  <span>{chat.message_count || 0} messages</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Clock size={12} />
                  <span>
                    {chat.updated_at 
                      ? new Date(chat.updated_at).toLocaleDateString() 
                      : new Date(chat.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
