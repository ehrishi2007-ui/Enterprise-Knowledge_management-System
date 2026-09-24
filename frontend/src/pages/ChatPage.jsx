import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Bot, Plus, Search, Edit2, Bookmark, Trash2, 
  Check, X, ThumbsUp, ThumbsDown, FileText, Send, 
  Loader2, Copy, Sparkles, ExternalLink, ChevronRight,
  BookOpen, HelpCircle, Eye
} from 'lucide-react';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner, DocumentPreviewModal } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialQuery = searchParams.get('q');
  const initialConversationId = searchParams.get('conversation');

  const { departments } = useDepartments();
  const [chatDepartment, setChatDepartment] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Left Panel State
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convSearch, setConvSearch] = useState('');
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false);
  
  // Center Panel State
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId || null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [question, setQuestion] = useState(initialQuery || '');
  const [askLoading, setAskLoading] = useState(false);
  
  // Right Panel State (Source detail inspection)
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
      setActiveConversation({ id: 'temp', title: 'New Conversation', messages: [tempUserMsg] });
    }

    setAskLoading(true);
    try {
      const payload = { question: q };
      if (chatDepartment && chatDepartment !== 'All') {
        payload.department = chatDepartment;
      }
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
      toast.error('Failed to get answer. Please try again.');
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
      toast.success('Conversation renamed');
    } catch (err) {
      toast.error('Failed to rename conversation');
    } finally {
      setEditingConvId(null);
    }
  };

  const handleToggleBookmark = async (id) => {
    try {
      const res = await api.post(`/chat/conversations/${id}/bookmark`);
      const newStatus = res.data.is_bookmarked;
      setConversations(prev => prev.map(c => c.id === id ? { ...c, is_bookmarked: newStatus } : c));
      if (activeConversation && activeConversation.id === id) {
        setActiveConversation(prev => ({ ...prev, is_bookmarked: newStatus }));
      }
      toast.success(newStatus ? 'Conversation bookmarked' : 'Bookmark removed');
    } catch (err) {
      toast.error('Failed to update bookmark');
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
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error('Failed to delete conversation');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setConvToDelete(null);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    try {
      await api.post('/feedback/', { message_id: messageId, rating });
      setActiveConversation(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === messageId ? { ...m, user_feedback: rating } : m)
      }));
      toast.success(rating === 'helpful' ? 'Thank you for your feedback! 👍' : 'Feedback recorded. 👎');
    } catch (err) {
      toast.error('Failed to save feedback');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Response copied to clipboard');
  };

  const starterPrompts = [
    'What are the institutional policies on leaves and attendance?',
    'Summarize the lab safety regulations or equipment access steps.',
    'What are the guidelines for project submissions or thesis evaluation?',
    'Explain the expense reimbursement and procurement process.'
  ];

  const filteredConversations = conversations
    .filter(c => c.title?.toLowerCase().includes(convSearch.toLowerCase()))
    .filter(c => filterBookmarkedOnly ? c.is_bookmarked : true);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
      {/* Left Panel - Conversation History */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 border-r border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="p-4 border-b border-[var(--color-border)] space-y-3">
          <Button 
            className="w-full"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setActiveConversationId(null);
              navigate('/employee/chat');
            }}
          >
            New Conversation
          </Button>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-[var(--color-text-secondary)]" />
            <input 
              type="text" 
              placeholder="Search chat history..." 
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="input-field pl-8 py-1.5 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {filterBookmarkedOnly ? 'Bookmarked Chats' : 'All Sessions'} ({filteredConversations.length})
            </span>
            <button
              onClick={() => setFilterBookmarkedOnly(!filterBookmarkedOnly)}
              className={`p-1 rounded text-xs transition-colors ${filterBookmarkedOnly ? 'text-teal font-bold' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}
              title="Filter by bookmarks"
            >
              <Bookmark size={14} className={filterBookmarkedOnly ? 'fill-teal' : ''} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convLoading ? (
            <LoadingSpinner size="sm" message="Loading sessions..." />
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-secondary)]">
              {convSearch ? 'No chats match your search.' : 'No conversations yet. Start a new chat!'}
            </div>
          ) : (
            filteredConversations.map(c => (
              <div 
                key={c.id} 
                onClick={() => {
                  setActiveConversationId(c.id);
                  navigate(`/employee/chat?conversation=${c.id}`);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                  activeConversationId === c.id 
                    ? 'bg-teal/15 text-teal border border-teal/30 font-medium' 
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  {editingConvId === c.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="input-field py-0.5 px-1 text-xs"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(c.id);
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                      />
                      <button onClick={() => handleRenameSubmit(c.id)} className="text-teal p-1"><Check size={13}/></button>
                      <button onClick={() => setEditingConvId(null)} className="text-[var(--color-text-secondary)] p-1"><X size={13}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Bot size={15} className={`shrink-0 ${c.is_bookmarked ? 'text-teal' : 'text-[var(--color-text-secondary)]'}`} />
                      <span className="truncate text-xs">{c.title}</span>
                    </div>
                  )}
                </div>
                
                {editingConvId !== c.id && (
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => { setEditTitle(c.title); setEditingConvId(c.id); }} 
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 rounded" 
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleToggleBookmark(c.id)} 
                      className="text-[var(--color-text-secondary)] hover:text-teal p-1 rounded" 
                      title="Bookmark"
                    >
                      <Bookmark size={12} className={c.is_bookmarked ? "fill-teal text-teal" : ""} />
                    </button>
                    <button 
                      onClick={() => { setConvToDelete(c); setDeleteModalOpen(true); }} 
                      className="text-[var(--color-text-secondary)] hover:text-red-500 p-1 rounded" 
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center Panel - Main Chat Stream */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)]">
        {/* Chat Header */}
        <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5 truncate">
            <div className="p-1.5 rounded-md bg-teal/10 text-teal shrink-0">
              <Bot size={18} />
            </div>
            <h2 className="text-sm font-bold text-[var(--color-text)] truncate">
              {activeConversation ? activeConversation.title : 'New AI Session'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={chatDepartment}
              onChange={(e) => setChatDepartment(e.target.value)}
              className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs px-2.5 py-1 text-[var(--color-text)] focus:outline-none focus:border-teal"
              title="Filter knowledge base scope"
            >
              <option value="All">Scope: All Documents</option>
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>

            {activeConversation && (
              <button
                onClick={() => handleToggleBookmark(activeConversation.id)}
                className={`p-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeConversation.is_bookmarked ? 'text-teal bg-teal/10 border-teal/30' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
                title="Bookmark conversation"
              >
                <Bookmark size={14} className={activeConversation.is_bookmarked ? 'fill-teal' : ''} />
                <span className="hidden sm:inline">Bookmark</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messagesLoading ? (
            <div className="flex justify-center h-full items-center">
              <LoadingSpinner size="md" message="Retrieving conversation..." />
            </div>
          ) : !activeConversation || !activeConversation.messages || activeConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center shadow-md">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  Ask Anything About Your Organization
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                  Answers are grounded strictly in your repository documents with exact page citations.
                </p>
              </div>

              {/* Starter Questions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(prompt)}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-teal hover:shadow-sm text-xs text-[var(--color-text)] transition-all flex items-start gap-2"
                  >
                    <ChevronRight size={14} className="text-teal shrink-0 mt-0.5" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeConversation.messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] sm:max-w-[70%] bg-teal text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[95%] sm:max-w-[85%] bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm text-[var(--color-text)]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center text-[10px] font-bold">
                          AI
                        </div>
                        <span className="text-xs font-semibold text-teal">EKMS Assistant</span>
                        {msg.response_time_ms && (
                          <span className="text-[10px] text-[var(--color-text-secondary)]">
                            • ⚡ {msg.response_time_ms}ms
                          </span>
                        )}
                      </div>

                      <div className="text-sm whitespace-pre-wrap leading-relaxed space-y-2">
                        {msg.content}
                      </div>
                      
                      {/* Citations / Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-2">
                            Verified Source Citations ({msg.sources.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedSource(src)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-teal text-xs text-[var(--color-text)] transition-all group"
                              >
                                <FileText size={12} className="text-teal group-hover:scale-110 transition-transform" />
                                <span className="font-medium truncate max-w-[160px]">{src.title || src.document_title}</span>
                                {src.page && (
                                  <span className="text-[10px] px-1 rounded bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-semibold">
                                    p.{src.page}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Response Footer: Copy & Feedback Actions */}
                      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 mt-3">
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-teal flex items-center gap-1 transition-colors"
                          title="Copy Answer"
                        >
                          <Copy size={13} />
                          <span>Copy</span>
                        </button>
                        
                        {!msg.id?.startsWith('temp') && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--color-text-secondary)]">Was this helpful?</span>
                            <button 
                              onClick={() => handleFeedback(msg.id, 'helpful')}
                              className={`p-1 rounded hover:bg-[var(--color-surface)] transition-colors ${msg.user_feedback === 'helpful' ? 'text-emerald-500 font-bold' : 'text-[var(--color-text-secondary)]'}`}
                              title="Helpful"
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button 
                              onClick={() => handleFeedback(msg.id, 'not_helpful')}
                              className={`p-1 rounded hover:bg-[var(--color-surface)] transition-colors ${msg.user_feedback === 'not_helpful' ? 'text-red-500 font-bold' : 'text-[var(--color-text-secondary)]'}`}
                              title="Not helpful"
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Live retrieval animation */}
              {askLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-teal" />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      Scanning vector embeddings & synthesizing answer...
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Query Input Box */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAsk(question); }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about documents, policies, or procedures..."
              disabled={askLoading}
              className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl py-3 pl-4 pr-12 text-sm text-[var(--color-text)] focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/30 disabled:opacity-50 transition-all placeholder:text-[var(--color-text-secondary)]"
            />
            <button 
              type="submit" 
              disabled={!question.trim() || askLoading}
              className="absolute right-2 p-2 bg-teal text-white rounded-lg hover:bg-teal-500 disabled:opacity-40 transition-colors"
              aria-label="Send Query"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-[var(--color-text-secondary)]">
            <span>Powered by RAG & Google Gemini</span>
            <span>Grounded on uploaded PDF/TXT sources</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Source Details Drawer */}
      {selectedSource && (
        <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface-alt)] flex flex-col animate-slide-in">
          <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-4">
            <h3 className="font-semibold text-xs text-[var(--color-text)] flex items-center gap-1.5">
              <FileText size={15} className="text-teal" />
              <span>Citation Inspector</span>
            </h3>
            <button 
              onClick={() => setSelectedSource(null)}
              className="p-1 hover:bg-[var(--color-surface)] rounded text-[var(--color-text-secondary)]"
            >
              <X size={15} />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Source Document</span>
              <p className="font-semibold text-[var(--color-text)] mt-1">{selectedSource.title || selectedSource.document_title}</p>
              {selectedSource.document_id && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2 text-xs flex items-center justify-center gap-1.5"
                  onClick={() => setPreviewDoc({
                    id: selectedSource.document_id,
                    title: selectedSource.title || selectedSource.document_title || 'Document'
                  })}
                >
                  <Eye size={13} className="text-teal" />
                  <span>Preview Document</span>
                </Button>
              )}
            </div>
            {selectedSource.page && (
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Reference Page</span>
                <p className="font-medium text-teal mt-0.5">Page {selectedSource.page}</p>
              </div>
            )}
            <div>
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">Extracted Chunk Snippet</span>
              <div className="mt-1.5 bg-[var(--color-surface)] rounded-lg p-3 text-[11px] text-[var(--color-text)] border border-[var(--color-border)] leading-relaxed whitespace-pre-wrap font-mono">
                {selectedSource.snippet || selectedSource.chunk_text || "No snippet text available."}
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
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to delete <strong className="text-[var(--color-text)]">"{convToDelete?.title}"</strong>? All associated messages will be removed permanently.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} loading={deleting}>
              Delete Chat
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document PDF/Text Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
