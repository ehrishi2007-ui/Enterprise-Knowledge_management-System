import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { uploadApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../hooks/useRoles';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner, DocumentPreviewModal } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { Search, FileText, ExternalLink, Bot, Download, Filter, Eye, Upload, FileUp, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ViewDocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { departments, getDeptColor } = useDepartments();
  const { roles, hasUploadPermission } = useRoles();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Upload modal for permitted users (e.g. Lecturers, Staff, Custom roles)
  const canUpload = hasUploadPermission(user?.role);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    department: '',
    content_type: 'text_only',
    tags: '',
    file: null
  });
  const [uploadAllowedDepts, setUploadAllowedDepts] = useState([]);
  const [uploadAllowedRoles, setUploadAllowedRoles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('File exceeds 50MB limit. Please select a smaller file.');
      return;
    }

    setUploadData((prev) => ({
      ...prev,
      file,
      title: prev.title ? prev.title : file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.title.trim()) {
      toast.error('Please enter a document title and pick a file.');
      return;
    }

    let stageTimer = null;
    try {
      setUploading(true);
      let simulatedProgress = 15;
      setUploadProgress(15);
      setUploadStage('Uploading document to repository...');
      
      stageTimer = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + Math.floor(Math.random() * 5) + 3, 95);
        setUploadProgress(simulatedProgress);
        if (simulatedProgress < 35) {
          setUploadStage('Uploading document file...');
        } else if (simulatedProgress < 60) {
          setUploadStage('Extracting text & analyzing structure...');
        } else if (simulatedProgress < 85) {
          setUploadStage('Computing semantic embeddings...');
        } else {
          setUploadStage('Indexing chunks into ChromaDB knowledge base...');
        }
      }, 550);

      const formData = new FormData();
      formData.append('title', uploadData.title.trim());
      formData.append('department', uploadData.department || (user?.department || departments[0]?.name || 'General'));
      formData.append('content_type', uploadData.content_type);
      
      const tagsArray = uploadData.tags.split(',').map((t) => t.trim()).filter(Boolean);
      formData.append('tags', tagsArray.join(','));
      
      const allowedDepts = uploadAllowedDepts.length > 0 ? uploadAllowedDepts : ['All'];
      formData.append('allowed_departments', allowedDepts.join(','));

      const allowedRoles = uploadAllowedRoles.length > 0 ? uploadAllowedRoles : ['All'];
      formData.append('allowed_roles', allowedRoles.join(','));

      formData.append('file', uploadData.file);

      await uploadApi.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (stageTimer) clearInterval(stageTimer);
      setUploadProgress(100);
      setUploadStage('Done! Document indexed and ready.');
      toast.success('Document uploaded successfully!');

      setTimeout(() => {
        setUploadData({
          title: '',
          department: user?.department || departments[0]?.name || 'General',
          content_type: 'text_only',
          tags: '',
          file: null
        });
        setUploadAllowedDepts([]);
        setUploadAllowedRoles([]);
        setUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setUploadModalOpen(false);
        fetchDocuments();
      }, 900);
      
    } catch (err) {
      if (stageTimer) clearInterval(stageTimer);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (err.message || 'Upload failed.');
      toast.error(`Upload error: ${message}`);
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
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

        <div className="flex items-center gap-2">
          {canUpload && (
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => {
                setUploadData({
                  title: '',
                  department: user?.department || departments[0]?.name || 'General',
                  content_type: 'text_only',
                  tags: '',
                  file: null
                });
                setUploadModalOpen(true);
              }}
            >
              Upload Document
            </Button>
          )}

          <div className="relative w-full sm:w-64">
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
          {documents.map((doc) => {
            const docRoles = doc.allowed_roles || ['All'];
            const isAllRoles = docRoles.includes('All') || docRoles.length === 0;

            return (
              <Card key={doc.id} className="flex flex-col justify-between p-4 h-full" hover>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {doc.department && (
                        <Badge.Custom bgColor={getDeptColor(doc.department)}>
                          {doc.department}
                        </Badge.Custom>
                      )}
                      {!isAllRoles ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium capitalize">
                          {docRoles.slice(0, 2).join(', ')}{docRoles.length > 2 ? ` +${docRoles.length - 2}` : ''}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] px-2 py-0.5 rounded bg-[var(--color-surface-alt)] shrink-0">
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
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && documents.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Upload Document Modal (for Permitted Roles) */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Institutional Document"
        size="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="label">Select File (PDF or TXT, up to 50MB) *</label>
            <div className="relative border-2 border-dashed border-[var(--color-border)] hover:border-teal rounded-xl p-4 text-center transition-colors bg-[var(--color-surface-alt)]">
              <input
                type="file"
                required
                accept=".pdf,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <Upload className="w-7 h-7 text-teal mb-1" />
                {uploadData.file ? (
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {uploadData.file.name} ({(uploadData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    Click or drag a file to upload
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. CS101 Course Syllabus or Staff Guidelines"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Department</label>
              <select
                value={uploadData.department}
                onChange={(e) => setUploadData({ ...uploadData, department: e.target.value })}
                className="input-field text-xs py-2"
              >
                {departments.map((d) => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. syllabus, lecture, 2026"
                value={uploadData.tags}
                onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          {/* Role visibility */}
          <div>
            <label className="label">Who Can View This Document? (By Role)</label>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              {roles.map((r) => (
                <label key={r.role_name} className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadAllowedRoles.includes(r.role_name)}
                    onChange={(e) => {
                      if (e.target.checked) setUploadAllowedRoles([...uploadAllowedRoles, r.role_name]);
                      else setUploadAllowedRoles(uploadAllowedRoles.filter((item) => item !== r.role_name));
                    }}
                    className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                  />
                  <span>{r.display_name}</span>
                </label>
              ))}
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
              Leave unchecked to make visible to all roles.
            </span>
          </div>

          {/* Live Progress Bar */}
          {uploading && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-teal/30">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text)]">
                <span>{uploadStage}</span>
                <span className="text-teal font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-teal h-2 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={uploading}>
              Upload Document
            </Button>
          </div>
        </form>
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
