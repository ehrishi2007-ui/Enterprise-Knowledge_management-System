import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge, EmptyState, LoadingSpinner, DocumentPreviewModal } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { Search, FileText, ExternalLink, Bot, Download, Filter, Eye } from 'lucide-react';

export default function ViewDocumentsPage() {
  const navigate = useNavigate();
  const { departments, getDeptColor } = useDepartments();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 18,
        ...(search && { search }),
        ...(department !== 'All' && { department }),
      };
      const response = await api.get('/documents/', { params });
      
      const docs = Array.isArray(response.data) ? response.data : response.data.documents || [];
      setDocuments(docs);
      
      if (response.data.total_pages) {
        setTotalPages(response.data.total_pages);
      } else if (docs.length === 18) {
        setTotalPages(page + 1);
      } else {
        setTotalPages(page);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, department, page]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleView = (doc) => {
    setPreviewDoc(doc);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Document Repository</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Browse published institutional policies, circulars, and departmental resources.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 text-xs py-2 rounded-xl"
          />
        </div>
      </div>

      {/* Dynamic Department Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => { setDepartment('All'); setPage(1); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            department === 'All'
              ? 'bg-teal text-white shadow-sm'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal'
          }`}
        >
          All Departments
        </button>
        {departments.map((dept) => (
          <button
            key={dept.id || dept.name}
            onClick={() => { setDepartment(dept.name); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              department === dept.name
                ? 'bg-teal text-white shadow-sm'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color || '#599692' }} />
            <span>{dept.name}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="md" message="Loading repository files..." />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Documents Found"
          description={search ? "No documents match your query or department filter." : "The document repository is currently empty."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col justify-between p-4 h-full" hover>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {doc.department && (
                    <Badge.Custom bgColor={getDeptColor(doc.department)}>
                      {doc.department}
                    </Badge.Custom>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] px-2 py-0.5 rounded bg-[var(--color-surface-alt)]">
                    {doc.file_type || 'PDF'}
                  </span>
                </div>
                
                <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-2 leading-snug">
                  {doc.title}
                </h3>
                
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doc.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {formatFileSize(doc.file_size_bytes || doc.file_size)}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1.5 text-xs text-teal hover:bg-teal/10"
                    title="Ask AI regarding this document"
                    onClick={() => navigate(`/employee/chat?q=${encodeURIComponent('Tell me about the contents of ' + doc.title)}`)}
                  >
                    <Bot size={15} />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="text-xs px-2.5 py-1"
                    onClick={() => handleView(doc)}
                  >
                    <Eye size={13} className="mr-1 text-teal" />
                    <span>View</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && documents.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* In-App Document & PDF Viewer Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
        onAskAI={(title) => {
          setPreviewDoc(null);
          navigate(`/employee/chat?q=${encodeURIComponent('Tell me about the contents of ' + title)}`);
        }}
      />
    </div>
  );
}
