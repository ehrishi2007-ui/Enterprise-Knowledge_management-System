import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Plus, Search, MoreVertical, Edit2, 
  Bookmark, Trash2, Check, X, ThumbsUp, ThumbsDown, 
  FileText, Send, Loader2 
} from 'lucide-react';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner } from '../components/ui';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const initialQuery = searchParams.get('q');
  const initialConversationId = searchParams.get('conversation');

  // Left Panel State
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convSearch, setConvSearch] = useState('');
  
  // Center Panel State
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId || null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState(initialQuery || '');
  const [askLoading, setAskLoading] = useState(false);
  
  // Right Panel State
  const [selectedSource, setSelectedSource] = useState(null);

  // Modal / Actions State
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchConversationDetail(activeConversationId);
    } else {
      setActiveConversation(null);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (initialQuery && !activeConversationId) {
      handleAsk(initialQuery);
      setSearchParams(new URLSearchParams());
    }
  }, [initialQuery]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, askLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setConvLoading(true);
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setConvLoading(false);
    }
  };

  const fetchConversationDetail = async (id) => {
    try {
      setMessagesLoading(true);
      const res = await api.get(`/chat/conversations/${id}`);
      setActiveConversation(res.data);
    } catch (err) {
      console.error('Failed to fetch conversation details', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleAsk = async (queryToAsk) => {
    if (!queryToAsk.trim()) return;

    const q = queryToAsk.trim();
    setQuestion('');
    
    // Optimistic user message
    const tempUserMsg = { id: 'temp-' + Date.now(), role: 'user', content: q };
    if (activeConversation) {
      setActiveConversation(prev => ({
        ...prev,
        messages: [...(prev.messages || []), tempUserMsg]
      }));
    } else {
      setActiveConversation({ id: 'temp', title: 'New Chat', messages: [tempUserMsg] });
    }

    setAskLoading(true);
    try {
      const payload = { question: q };
      if (activeConversationId && activeConversationId !== 'temp') {
        payload.conversation_id = activeConversationId;
      }
      
      const res = await api.post('/chat/ask', payload);
      
      if (!activeConversationId || activeConversationId === 'temp') {
        setActiveConversationId(res.data.conversation_id);
        navigate(`/employee/chat?conversation=${res.data.conversation_id}`, { replace: true });
        fetchConversations();
      } else {
        fetchConversationDetail(activeConversationId);
      }
    } catch (err) {
      console.error('Failed to ask question', err);
      // Remove temp message on error
      if (activeConversation) {
        setActiveConversation(prev => ({
          ...prev,
          messages: prev.messages.filter(m => m.id !== tempUserMsg.id)
        }));
      }
    } finally {
      setAskLoading(false);
    }
  };

  const handleRenameSubmit = async (id) => {
    if (!editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      await api.put(`/chat/conversations/${id}/rename`, { title: editTitle.trim() });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c));
      if (activeConversation && activeConversation.id === id) {
        setActiveConversation(prev => ({ ...prev, title: editTitle.trim() }));
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    } finally {
      setEditingConvId(null);
    }
  };

  const handleToggleBookmark = async (id, currentStatus) => {
    try {
      const res = await api.post(`/chat/conversations/${id}/bookmark`);
      const newStatus = res.data.is_bookmarked;
      setConversations(prev => prev.map(c => c.id === id ? { ...c, is_bookmarked: newStatus } : c));
      if (activeConversation && activeConversation.id === id) {
        setActiveConversation(prev => ({ ...prev, is_bookmarked: newStatus }));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };

  const confirmDelete = async () => {
    if (!convToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/chat/conversations/${convToDelete.id}`);
      setConversations(prev => prev.filter(c => c.id !== convToDelete.id));
      if (activeConversationId === convToDelete.id) {
        setActiveConversationId(null);
        navigate('/employee/chat', { replace: true });
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setConvToDelete(null);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    try {
      await api.post('/feedback/', { message_id: messageId, rating });
      // Update local state to show feedback given
      setActiveConversation(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === messageId ? { ...m, user_feedback: rating } : m)
      }));
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  const filteredConversations = conversations.filter(c => c.title?.toLowerCase().includes(convSearch.toLowerCase()));

  return (
    <div className="flex h-full bg-slate-900 text-slate-50 overflow-hidden">
      {/* Left Panel - Conversations List */}
      <div className="hidden md:flex flex-col w-72 bg-slate-800 border-r border-slate-700">
        <div className="p-4 border-b border-slate-700 space-y-4">
          <Button 
            className="w-full flex items-center justify-center gap-2"
            onClick={() => {
              setActiveConversationId(null);
              navigate('/employee/chat');
            }}
          >
            <Plus size={16} /> New Chat
          </Button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="p-4 flex justify-center"><LoadingSpinner /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">No conversations found.</div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map(c => (
                <div 
                  key={c.id} 
                  className={`group flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-slate-700 transition-colors ${activeConversationId === c.id ? 'bg-slate-700' : ''}`}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    navigate(`/employee/chat?conversation=${c.id}`);
                  }}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    {editingConvId === c.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-sm"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameSubmit(c.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                        />
                        <button onClick={() => handleRenameSubmit(c.id)} className="text-orange-500"><Check size={14}/></button>
                        <button onClick={() => setEditingConvId(null)} className="text-slate-400"><X size={14}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className={c.is_bookmarked ? 'text-orange-500' : 'text-slate-400'} />
                        <div className="truncate text-sm font-medium">{c.title}</div>
                      </div>
                    )}
                  </div>
                  
                  {editingConvId !== c.id && (
                    <div className="hidden group-hover:flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => {
                        setEditTitle(c.title);
                        setEditingConvId(c.id);
                      }} className="text-slate-400 hover:text-slate-200" title="Rename">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleToggleBookmark(c.id, c.is_bookmarked)} className="text-slate-400 hover:text-orange-500" title="Bookmark">
                        <Bookmark size={14} className={c.is_bookmarked ? "fill-orange-500 text-orange-500" : ""} />
                      </button>
                      <button onClick={() => {
                        setConvToDelete(c);
                        setDeleteModalOpen(true);
                      }} className="text-slate-400 hover:text-red-500" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-slate-700 flex items-center px-6">
          <h1 className="text-lg font-semibold truncate">
            {activeConversation ? activeConversation.title : 'New Chat'}
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messagesLoading ? (
            <div className="flex justify-center h-full items-center"><LoadingSpinner size="lg" /></div>
          ) : !activeConversation || !activeConversation.messages || activeConversation.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState 
                icon={<MessageSquare className="w-12 h-12 text-slate-500" />}
                title="How can I help you today?"
                description="Ask any question about company policies, technical documents, or operational guidelines."
              />
            </div>
          ) : (
            <>
              {activeConversation.messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[75%] bg-orange-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[85%] bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                      <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap mb-4">
                        {msg.content}
                      </div>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedSource(src)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-orange-500 text-xs transition-colors"
                              >
                                <FileText size={12} className="text-orange-500" />
                                <span className="truncate max-w-[150px]">{src.title}</span>
                                {src.page && <span className="text-slate-500">p.{src.page}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between border-t border-slate-700 pt-3 mt-2">
                        {msg.response_time_ms && (
                          <span className="text-xs text-slate-500">{msg.response_time_ms}ms</span>
                        )}
                        
                        {!msg.id?.startsWith('temp') && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleFeedback(msg.id, 'helpful')}
                              className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${msg.user_feedback === 'helpful' ? 'text-green-500' : 'text-slate-400'}`}
                              title="Helpful"
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button 
                              onClick={() => handleFeedback(msg.id, 'not_helpful')}
                              className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${msg.user_feedback === 'not_helpful' ? 'text-red-500' : 'text-slate-400'}`}
                              title="Not helpful"
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {askLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-orange-500" />
                    <span className="text-sm text-slate-400">Searching knowledge base...</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 pt-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAsk(question); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={askLoading}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-5 pr-14 shadow-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 text-sm"
            />
            <button 
              type="submit" 
              disabled={!question.trim() || askLoading}
              className="absolute right-3 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-slate-500">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>

      {/* Right Panel - Source Details */}
      {selectedSource && (
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
          <div className="h-16 border-b border-slate-700 flex items-center justify-between px-4">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <FileText size={16} className="text-orange-500" />
              Source Details
            </h2>
            <button 
              onClick={() => setSelectedSource(null)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Document</div>
              <div className="font-medium text-sm">{selectedSource.title}</div>
            </div>
            {selectedSource.page && (
              <div>
                <div className="text-xs text-slate-400 mb-1">Page</div>
                <div className="text-sm">{selectedSource.page}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-2">Matched Content</div>
              <div className="bg-slate-900 rounded p-3 text-sm text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-700">
                {selectedSource.snippet || "No snippet available."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteModalOpen} 
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title="Delete Conversation"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete the chat "{convToDelete?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
