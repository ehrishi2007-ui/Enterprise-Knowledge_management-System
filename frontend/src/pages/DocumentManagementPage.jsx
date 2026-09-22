import React, { useState, useEffect } from 'react';
import api, { uploadApi } from '../lib/api';
import { Button, Card, Badge, Modal, TabSwitcher, EmptyState, LoadingSpinner, Table } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { CONTENT_TYPES } from '../lib/constants';
import { 
  Search, Upload, Edit, Trash2, FileText, CheckCircle2, 
  AlertCircle, Sparkles, Layers, Shield, Clock, FileUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentManagementPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const { departments, getDeptColor } = useDepartments();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modals state
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Tag edit form state
  const [editTags, setEditTags] = useState('');
  const [editAllowedDepts, setEditAllowedDepts] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Upload state
  const [uploadData, setUploadData] = useState({
    title: '',
    department: '',
    content_type: 'text_only',
    tags: '',
    file: null
  });
  const [uploadAllowedDepts, setUploadAllowedDepts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'uploading' | 'processing' | 'done'

  // Initialize department selection when departments load
  useEffect(() => {
    if (departments.length > 0 && !uploadData.department) {
      setUploadData(prev => ({ ...prev, department: departments[0].name }));
    }
  }, [departments]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 15,
        ...(search && { search }),
        ...(department !== 'All' && { department })
      };
      const response = await api.get('/documents/', { params });
      const docs = Array.isArray(response.data) ? response.data : response.data.documents || [];
      setDocuments(docs);
      if (response.data.total_pages) {
        setTotalPages(response.data.total_pages);
      } else if (docs.length === 15) {
        setTotalPages(page + 1);
      } else {
        setTotalPages(page);
      }
    } catch (err) {
      console.error('Fetch docs error:', err);
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents') {
      const delayDebounceFn = setTimeout(() => {
        fetchDocuments();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, department, page, activeTab]);

  const openTagModal = (doc) => {
    setSelectedDoc(doc);
    setEditTags((doc.tags || []).join(', '));
    setEditAllowedDepts(doc.allowed_departments || ['All']);
    setTagModalOpen(true);
  };

  const handleSaveTags = async () => {
    try {
      setEditLoading(true);
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await api.put(`/documents/${selectedDoc.id}/tags`, {
        tags: tagsArray,
        allowed_departments: editAllowedDepts.length > 0 ? editAllowedDepts : ['All']
      });
      toast.success('Document tags updated');
      setTagModalOpen(false);
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to update tags');
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteModal = (doc) => {
    setSelectedDoc(doc);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setEditLoading(true);
      await api.delete(`/documents/${selectedDoc.id}`);
      toast.success('Document deleted successfully');
      setDeleteModalOpen(false);
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setEditLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 50MB
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('File exceeds 50MB limit. Please select a smaller file.');
      return;
    }

    setUploadData(prev => ({
      ...prev,
      file,
      title: prev.title ? prev.title : file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.title.trim()) {
      toast.error('Please enter a title and select a file.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadStage('Uploading document to server...');
      
      const formData = new FormData();
      formData.append('title', uploadData.title.trim());
      formData.append('department', uploadData.department || (departments[0]?.name || 'General'));
      formData.append('content_type', uploadData.content_type);
      
      const tagsArray = uploadData.tags.split(',').map(t => t.trim()).filter(Boolean);
      formData.append('tags', tagsArray.join(','));
      
      const allowedDepts = uploadAllowedDepts.length > 0 ? uploadAllowedDepts : ['All'];
      formData.append('allowed_departments', allowedDepts.join(','));
      formData.append('file', uploadData.file);

      // Key fix: use uploadApi with onUploadProgress
      await uploadApi.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(percent, 90));
            if (percent >= 90) {
              setUploadStage('Processing text chunks & generating vector embeddings...');
            }
          }
        }
      });
      
      setUploadProgress(100);
      setUploadStage('Done! Document ingested into knowledge base.');
      toast.success('Document uploaded and indexed successfully!');

      setTimeout(() => {
        setUploadData({
          title: '',
          department: departments[0]?.name || 'General',
          content_type: 'text_only',
          tags: '',
          file: null
        });
        setUploadAllowedDepts([]);
        setUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setActiveTab('documents');
      }, 1200);
      
    } catch (err) {
      console.error('Upload error:', err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (err.message || 'Network error during upload.');
      toast.error(`Upload error: ${message}`);
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  const columns = [
    {
      header: 'Title / File',
      accessor: 'title',
      render: (doc) => (
        <div>
          <span className="font-semibold text-xs text-[var(--color-text)] block truncate max-w-xs">
            {doc.title}
          </span>
          <span className="text-[11px] text-[var(--color-text-secondary)] truncate block max-w-xs">
            {doc.filename}
          </span>
        </div>
      )
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (doc) => (
        doc.department ? (
          <Badge.Custom bgColor={getDeptColor(doc.department)}>
            {doc.department}
          </Badge.Custom>
        ) : (
          <Badge color="gray" size="sm">All</Badge>
        )
      )
    },
    {
      header: 'Mode',
      accessor: 'content_type',
      render: (doc) => {
        const modeMap = {
          text_only: { label: 'Text', color: 'teal' },
          images_only: { label: 'OCR', color: 'purple' },
          combination: { label: 'Hybrid', color: 'blue' }
        };
        const conf = modeMap[doc.content_type] || modeMap.text_only;
        return <Badge color={conf.color} size="sm">{conf.label}</Badge>;
      }
    },
    {
      header: 'Tags',
      accessor: 'tags',
      render: (doc) => (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {(doc.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-medium">
              #{t}
            </span>
          ))}
          {(doc.tags || []).length > 3 && (
            <span className="text-[10px] text-[var(--color-text-secondary)]">+{doc.tags.length - 3}</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'processing_status',
      render: (doc) => (
        <Badge 
          color={doc.processing_status === 'completed' ? 'green' : doc.processing_status === 'processing' ? 'orange' : 'gray'}
          size="sm"
          dot
        >
          {doc.processing_status || 'completed'}
        </Badge>
      )
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (doc) => (
        <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
          {new Date(doc.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (doc) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openTagModal(doc)}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
            title="Edit Tags & Permissions"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => openDeleteModal(doc)}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
            title="Delete Document"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Document Management</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Upload policies, syllabus guides, or circulars for real-time vectorization into ChromaDB.
          </p>
        </div>

        <TabSwitcher 
          tabs={[
            { value: 'documents', label: 'All Documents', icon: FileText },
            { value: 'upload', label: 'Upload New', icon: Upload }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'documents' && (
        <Card className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder="Search uploaded documents..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-9 text-xs py-2 rounded-xl"
              />
            </div>
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-teal"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingSpinner message="Loading document table..." />
          ) : documents.length === 0 ? (
            <EmptyState 
              icon={FileText} 
              title="No documents uploaded"
              description="Upload PDF or TXT documents to power the RAG assistant."
              action={() => setActiveTab('upload')}
              actionLabel="Upload First File"
            />
          ) : (
            <>
              <Table 
                columns={columns}
                data={documents}
              />
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 pt-4 border-t border-[var(--color-border)]">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-[var(--color-text-secondary)]">Page {page} of {totalPages}</span>
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
            </>
          )}
        </Card>
      )}

      {activeTab === 'upload' && (
        <Card className="max-w-2xl mx-auto p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-teal/10 text-teal">
              <FileUp size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Upload & Index Document</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Files are chunked and embedded for RAG search automatically.
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {/* File Drag & Drop Zone */}
            <div>
              <label className="label">
                Select File (PDF or TXT, max 50MB) *
              </label>
              <div className="relative border-2 border-dashed border-[var(--color-border)] hover:border-teal rounded-2xl p-6 text-center transition-colors bg-[var(--color-surface-alt)]">
                <input
                  type="file"
                  required
                  accept=".pdf,.txt"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="w-8 h-8 text-teal mb-2" />
                  {uploadData.file ? (
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-text)] block">
                        {uploadData.file.name}
                      </span>
                      <span className="text-[11px] text-teal mt-0.5 block">
                        {(uploadData.file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-text)] block">
                        Click or drag a file to upload
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">
                        Supports PDF policies, handbooks, research papers, and plain text files
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Document Display Title *</label>
              <input
                type="text"
                required
                value={uploadData.title}
                onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="e.g. Employee Handbook 2026 or Academic Regulations"
                className="input-field text-xs py-2.5"
              />
            </div>

            {/* Ingestion Mode */}
            <div>
              <label className="label">Processing Pipeline Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CONTENT_TYPES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, content_type: mode.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadData.content_type === mode.value
                        ? 'border-teal bg-teal/10 shadow-sm'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[var(--color-text)] block">{mode.label}</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] block mt-1 leading-snug">
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Department Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Department</label>
                <select
                  value={uploadData.department}
                  onChange={e => setUploadData({ ...uploadData, department: e.target.value })}
                  className="input-field text-xs py-2.5"
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
                  value={uploadData.tags}
                  onChange={e => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="e.g. policy, onboarding, regulations"
                  className="input-field text-xs py-2.5"
                />
              </div>
            </div>

            {/* Allowed Access Departments */}
            <div>
              <label className="label">Access Permissions (Who can view?)</label>
              <p className="text-[11px] text-[var(--color-text-secondary)] mb-2">
                Leave unchecked for public organization-wide access ('All').
              </p>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                {departments.map((dept) => (
                  <label key={dept.id || dept.name} className="flex items-center gap-1.5 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadAllowedDepts.includes(dept.name)}
                      onChange={(e) => {
                        if (e.target.checked) setUploadAllowedDepts([...uploadAllowedDepts, dept.name]);
                        else setUploadAllowedDepts(uploadAllowedDepts.filter(d => d !== dept.name));
                      }}
                      className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                    />
                    <span>{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="space-y-2 p-4 rounded-xl bg-[var(--color-surface-alt)] border border-teal/30 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text)]">
                  <span>{uploadStage}</span>
                  <span className="text-teal">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-teal h-2 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={uploading || !uploadData.file || !uploadData.title.trim()} 
              loading={uploading}
              variant="primary"
              className="w-full py-3 text-sm shadow-md"
              icon={Upload}
            >
              Start Upload & Vectorize
            </Button>
          </form>
        </Card>
      )}

      {/* Edit Tags & Permissions Modal */}
      <Modal isOpen={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Edit Tags & Permissions">
        {selectedDoc && (
          <div className="space-y-4">
            <div>
              <label className="label">Tags (comma separated)</label>
              <input
                type="text"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="label">Allowed Departments</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                {departments.map((dept) => (
                  <label key={dept.id || dept.name} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAllowedDepts.includes(dept.name)}
                      onChange={(e) => {
                        if (e.target.checked) setEditAllowedDepts([...editAllowedDepts, dept.name]);
                        else setEditAllowedDepts(editAllowedDepts.filter(d => d !== dept.name));
                      }}
                      className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                    />
                    <span>{dept.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <Button variant="ghost" size="sm" onClick={() => setTagModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveTags} loading={editLoading}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to delete <strong className="text-[var(--color-text)]">"{selectedDoc?.title}"</strong>? This will remove the file from storage and delete all chunk embeddings from ChromaDB.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={editLoading}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
