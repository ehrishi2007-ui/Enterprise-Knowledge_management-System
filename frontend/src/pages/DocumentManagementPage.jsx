import React, { useState, useEffect } from 'react';
import api, { uploadApi } from '../lib/api';
import { Button, Card, Badge, Modal, TabSwitcher, EmptyState, LoadingSpinner, Table, DocumentPreviewModal } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { useRoles } from '../hooks/useRoles';
import { 
  Search, Upload, Edit, Trash2, FileText, CheckCircle2, 
  AlertCircle, Layers, Shield, Clock, FileUp, Sparkles, Eye, Users, X, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentManagementPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const { departments, getDeptColor } = useDepartments();
  const { roles } = useRoles();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reprocessingDocId, setReprocessingDocId] = useState(null);
  const [reprocessingAll, setReprocessingAll] = useState(false);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modals state
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Tag & Role edit form state
  const [editTags, setEditTags] = useState('');
  const [editAllowedDepts, setEditAllowedDepts] = useState([]);
  const [editAllowedRoles, setEditAllowedRoles] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Upload state
  const [uploadData, setUploadData] = useState({
    title: '',
    department: '',
    content_type: 'auto',
    tags: ''
  });
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadAllowedDepts, setUploadAllowedDepts] = useState([]);
  const [uploadAllowedRoles, setUploadAllowedRoles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');


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
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocessDocument = async (doc) => {
    try {
      setReprocessingDocId(doc.id);
      toast.loading(`Running Vision OCR on "${doc.title}"...`, { id: `ocr-${doc.id}` });
      await api.post(`/documents/${doc.id}/reprocess`);
      toast.success(`"${doc.title}" successfully re-indexed!`, { id: `ocr-${doc.id}` });
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to re-index: ' + (err.response?.data?.detail || err.message), { id: `ocr-${doc.id}` });
    } finally {
      setReprocessingDocId(null);
    }
  };

  const handleReprocessAllUnindexed = async () => {
    try {
      setReprocessingAll(true);
      toast.loading('Scanning for unindexed scanned documents...', { id: 'ocr-all' });
      const resp = await api.post('/documents/admin/reprocess-unindexed');
      toast.success(resp.data?.message || 'Reprocessing complete!', { id: 'ocr-all' });
      fetchDocuments();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.detail || err.message), { id: 'ocr-all' });
    } finally {
      setReprocessingAll(false);
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
    setEditAllowedRoles(doc.allowed_roles || ['All']);
    setTagModalOpen(true);
  };

  const handleSaveTags = async () => {
    try {
      setEditLoading(true);
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await api.put(`/documents/${selectedDoc.id}/tags`, {
        tags: tagsArray,
        allowed_departments: editAllowedDepts.length > 0 ? editAllowedDepts : ['All'],
        allowed_roles: editAllowedRoles.length > 0 ? editAllowedRoles : ['All']
      });
      toast.success('Document updated');
      setTagModalOpen(false);
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to update details');
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
      toast.success('Document deleted');
      setDeleteModalOpen(false);
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setEditLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const maxBytes = 50 * 1024 * 1024;
    const validFiles = [];
    for (const file of selected) {
      if (file.size > maxBytes) {
        toast.error(`File "${file.name}" exceeds 50MB limit.`);
      } else {
        validFiles.push(file);
      }
    }
    if (!validFiles.length) return;

    setUploadFiles(prev => {
      const updated = [...prev, ...validFiles];
      if (updated.length === 1 && !uploadData.title) {
        setUploadData(ud => ({ ...ud, title: updated[0].name.replace(/\.[^/.]+$/, "") }));
      }
      return updated;
    });
  };

  const removeFile = (index) => {
    setUploadFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 1 && !uploadData.title) {
        setUploadData(ud => ({ ...ud, title: updated[0].name.replace(/\.[^/.]+$/, "") }));
      }
      return updated;
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one document to upload.');
      return;
    }
    if (uploadFiles.length === 1 && !uploadData.title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    let stageTimer = null;
    const isBatch = uploadFiles.length > 1;

    try {
      setUploading(true);
      let simulatedProgress = 15;
      setUploadProgress(15);
      setUploadStage(isBatch ? `Preparing to process ${uploadFiles.length} documents...` : 'Uploading document to institutional repository...');
      
      stageTimer = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + Math.floor(Math.random() * 5) + 3, 95);
        setUploadProgress(simulatedProgress);
        if (simulatedProgress < 35) {
          setUploadStage(isBatch ? `Uploading batch of ${uploadFiles.length} files...` : 'Uploading document binary file...');
        } else if (simulatedProgress < 60) {
          setUploadStage('Extracting text & auto-detecting layout structures...');
        } else if (simulatedProgress < 85) {
          setUploadStage('Computing 384-dimensional semantic embeddings...');
        } else {
          setUploadStage('Indexing chunks into ChromaDB vector knowledge base...');
        }
      }, 550);

      const formData = new FormData();
      formData.append('department', uploadData.department || (departments[0]?.name || 'General'));
      formData.append('content_type', uploadData.content_type);
      
      const tagsArray = uploadData.tags.split(',').map(t => t.trim()).filter(Boolean);
      formData.append('tags', tagsArray.join(','));
      
      const allowedDepts = uploadAllowedDepts.length > 0 ? uploadAllowedDepts : ['All'];
      formData.append('allowed_departments', allowedDepts.join(','));

      const allowedRoles = uploadAllowedRoles.length > 0 ? uploadAllowedRoles : ['All'];
      formData.append('allowed_roles', allowedRoles.join(','));

      if (isBatch) {
        uploadFiles.forEach(f => {
          formData.append('files', f);
        });
        await uploadApi.post('/documents/batch-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        formData.append('title', uploadData.title.trim());
        formData.append('file', uploadFiles[0]);
        await uploadApi.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (stageTimer) clearInterval(stageTimer);
      setUploadProgress(100);
      setUploadStage('Done! All documents indexed and ready for AI questions.');
      toast.success(isBatch ? `Successfully uploaded ${uploadFiles.length} documents!` : 'Document uploaded and ready!');

      setTimeout(() => {
        setUploadData({
          title: '',
          department: departments[0]?.name || 'General',
          content_type: 'auto',
          tags: ''
        });
        setUploadFiles([]);
        setUploadAllowedDepts([]);
        setUploadAllowedRoles([]);
        setUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setActiveTab('documents');
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

  const documentTypes = [
    { value: 'auto', label: 'Auto-Detect', desc: 'Auto-scans text, OCR scans & tables (Recommended)' },
    { value: 'text_only', label: 'Standard Document', desc: 'Digital PDF with selectable text' },
    { value: 'images_only', label: 'Scanned Document', desc: 'Photocopies and scanned papers' },
    { value: 'combination', label: 'Document with Charts', desc: 'Contains diagrams, tables, and text' },
  ];

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
      header: 'Visible To (Roles)',
      accessor: 'allowed_roles',
      render: (doc) => {
        const docRoles = doc.allowed_roles || ['All'];
        const isAll = docRoles.includes('All') || docRoles.length === 0;
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {isAll ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                All Roles
              </span>
            ) : (
              docRoles.slice(0, 2).map((r) => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium capitalize">
                  {r}
                </span>
              ))
            )}
            {!isAll && docRoles.length > 2 && (
              <span className="text-[10px] text-[var(--color-text-secondary)] font-medium self-center">
                +{docRoles.length - 2}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessor: 'content_type',
      render: (doc) => {

        const typeLabels = {
          text_only: 'Standard',
          images_only: 'Scanned',
          combination: 'Charts'
        };
        return <Badge color="teal" size="sm">{typeLabels[doc.content_type] || 'Standard'}</Badge>;
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
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'processing_status',
      render: (doc) => (
        <Badge 
          color={doc.chunk_count > 0 && doc.processing_status === 'completed' ? 'green' : (doc.chunk_count === 0 ? 'orange' : 'teal')}
          size="sm"
          dot
        >
          {doc.chunk_count > 0 && doc.processing_status === 'completed' 
            ? `${doc.chunk_count} Chunks` 
            : (doc.chunk_count === 0 ? '0 Chunks (Unread)' : (doc.processing_status || 'Pending'))}
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
            onClick={() => setPreviewDoc(doc)}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
            title="Preview PDF / Document"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleReprocessDocument(doc)}
            disabled={reprocessingDocId === doc.id}
            className={`p-1.5 rounded hover:bg-[var(--color-surface-alt)] transition-colors ${
              doc.chunk_count === 0 ? 'text-amber-400 hover:text-amber-300 animate-pulse' : 'text-[var(--color-text-secondary)] hover:text-teal'
            }`}
            title={doc.chunk_count === 0 ? "Document has 0 chunks! Click to run OCR" : "Re-run OCR & Re-index"}
          >
            <RefreshCw size={14} className={reprocessingDocId === doc.id ? "animate-spin text-teal" : ""} />
          </button>
          <button
            onClick={() => openTagModal(doc)}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
            title="Edit Details"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Documents</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Upload institutional policies, syllabi, handbooks, and guidelines.
          </p>
        </div>

        <TabSwitcher 
          tabs={[
            { value: 'documents', label: 'All Documents', icon: FileText },
            { value: 'upload', label: 'Upload New File', icon: Upload }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'documents' && (
        <Card className="space-y-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocessAllUnindexed}
              disabled={reprocessingAll}
              className="flex items-center gap-1.5 text-xs text-teal hover:bg-teal/10 border-teal/30 whitespace-nowrap"
              title="Automatically find any scanned documents with 0 chunks and run Vision OCR"
            >
              <RefreshCw size={13} className={reprocessingAll ? "animate-spin" : ""} />
              {reprocessingAll ? "Indexing Scans..." : "Sync / OCR All"}
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading documents..." />
          ) : documents.length === 0 ? (
            <EmptyState 
              icon={FileText} 
              title="No documents yet"
              description="Upload PDF or text documents to allow AI answering and search."
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
              <h2 className="text-lg font-bold text-[var(--color-text)]">Upload a Document</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                The document will be processed and become searchable immediately.
              </p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Picker */}
            <div>
              <label className="label">Select Document(s) (PDF, Word DOCX/DOC, TXT, or Scanned Images up to 50MB each) *</label>
              <div className="relative border-2 border-dashed border-[var(--color-border)] hover:border-teal rounded-2xl p-6 text-center transition-colors bg-[var(--color-surface-alt)]">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="w-8 h-8 text-teal mb-2" />
                  <span className="text-xs font-semibold text-[var(--color-text)] block">
                    Click or drag files to upload (single or multiple)
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">
                    PDF policies, Word documents (DOCX/DOC), handbooks, photocopies, or scanned images (PNG, JPG, WEBP)
                  </span>
                </div>
              </div>

              {/* Selected Files List */}
              {uploadFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] px-1">
                    <span className="font-semibold text-[var(--color-text)]">{uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} selected</span>
                    <button
                      type="button"
                      onClick={() => { setUploadFiles([]); setUploadData(prev => ({ ...prev, title: '' })); }}
                      className="text-red-400 hover:text-red-300 text-[11px] underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-teal flex-shrink-0" />
                          <span className="truncate font-medium text-[var(--color-text)]">{file.name}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 text-[var(--color-text-secondary)] hover:text-red-400 rounded transition-colors"
                          title="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Title or Batch Info */}
            {uploadFiles.length <= 1 ? (
              <div>
                <label className="label">Document Title *</label>
                <input
                  type="text"
                  required={uploadFiles.length === 1}
                  value={uploadData.title}
                  onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="e.g. Leave Policy 2026 or Course Syllabus"
                  className="input-field text-xs py-2"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-teal/5 border border-teal/20 text-xs text-[var(--color-text-secondary)]">
                <div className="font-semibold text-teal flex items-center gap-1.5 mb-1">
                  <Sparkles size={14} /> Batch Upload Mode Active
                </div>
                Each of the <span className="text-[var(--color-text)] font-semibold">{uploadFiles.length} documents</span> will be indexed with its individual file name as the title, automatically analyzing content type and applying permissions across the batch.
              </div>
            )}

            {/* Document Type Picker */}
            <div>
              <label className="label">Document Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documentTypes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, content_type: mode.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      uploadData.content_type === mode.value
                        ? 'border-teal bg-teal/10 shadow-sm ring-1 ring-teal/30'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[var(--color-text)] block">{mode.label}</span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] block mt-0.5">
                      {mode.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Department Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Department</label>
                <select
                  value={uploadData.department}
                  onChange={e => setUploadData({ ...uploadData, department: e.target.value })}
                  className="input-field text-xs py-2"
                >
                  {departments.map((d) => (
                    <option key={d.id || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tags (Optional, separated by commas)</label>
                <input
                  type="text"
                  value={uploadData.tags}
                  onChange={e => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="e.g. guide, leave, syllabus"
                  className="input-field text-xs py-2"
                />
              </div>
            </div>

            {/* Department Permissions */}
            <div>
              <label className="label">Who Can View This Document? (By Department)</label>
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
              <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                Leave unchecked to make visible to all departments.
              </span>
            </div>

            {/* Role Permissions */}
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
                        else setUploadAllowedRoles(uploadAllowedRoles.filter(item => item !== r.role_name));
                      }}
                      className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                    />
                    <span>{r.display_name}</span>
                  </label>
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                Leave unchecked to make visible to all roles (Students, Lecturers, Employees, Staff, etc.).
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

            <Button 
              type="submit" 
              disabled={uploading || uploadFiles.length === 0 || (uploadFiles.length === 1 && !uploadData.title.trim())} 
              loading={uploading}
              variant="primary"
              className="w-full py-2.5 text-xs shadow-md"
              icon={Upload}
            >
              {uploadFiles.length > 1 ? `Upload & Index ${uploadFiles.length} Documents` : 'Upload Document'}
            </Button>
          </form>
        </Card>
      )}

      {/* Edit Tags & Permissions Modal */}
      <Modal isOpen={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Edit Document Details">
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
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
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
              <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                Leave empty or select all to make visible to all departments.
              </span>
            </div>

            <div>
              <label className="label">Allowed Roles (Who Can View)</label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                {roles.map((r) => (
                  <label key={r.role_name} className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAllowedRoles.includes(r.role_name)}
                      onChange={(e) => {
                        if (e.target.checked) setEditAllowedRoles([...editAllowedRoles, r.role_name]);
                        else setEditAllowedRoles(editAllowedRoles.filter(item => item !== r.role_name));
                      }}
                      className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                    />
                    <span>{r.display_name}</span>
                  </label>
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                Leave empty or select all to make visible to all roles.
              </span>
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
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Document">
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to delete <strong className="text-[var(--color-text)]">"{selectedDoc?.title}"</strong>? It will no longer be available for search or questions.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={editLoading}>
              Delete
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
