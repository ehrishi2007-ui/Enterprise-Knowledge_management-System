import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, MessageSquare, Clock, BookmarkMinus } from 'lucide-react';
import { Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import api from '../lib/api';

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
      const filtered = res.data.filter(c => c.is_bookmarked);
      setBookmarks(filtered);
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (e, id) => {
    e.stopPropagation(); // prevent navigation
    try {
      await api.post(`/chat/conversations/${id}/bookmark`);
      setBookmarks(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold">Bookmarked Chats</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-12 h-12 text-slate-500" />}
          title="No bookmarks yet"
          description="Star conversations in the AI Chat to save them here for quick reference."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((chat) => (
            <Card 
              key={chat.id} 
              className="p-5 cursor-pointer hover:border-orange-500 transition-colors flex flex-col h-full"
              onClick={() => navigate(`/employee/chat?conversation=${chat.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 text-orange-500 bg-slate-900 px-2 py-1 rounded">
                  <MessageSquare size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Chat</span>
                </div>
                <button 
                  onClick={(e) => handleRemoveBookmark(e, chat.id)}
                  className="p-1.5 text-orange-500 hover:bg-slate-700 rounded transition-colors"
                  title="Remove Bookmark"
                >
                  <BookmarkMinus size={18} />
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-100 mb-3 flex-1 line-clamp-2">
                {chat.title}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-4 border-t border-slate-700">
                <div className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  <span>{chat.message_count || 0} messages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
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
