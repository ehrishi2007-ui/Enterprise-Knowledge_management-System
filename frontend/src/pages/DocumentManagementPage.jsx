import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button, Card, Badge, Modal, TabSwitcher, EmptyState, LoadingSpinner, Table } from '../components/ui';
import { DEPARTMENTS, DEPT_COLORS } from '../lib/constants';
import { Search, Upload, Edit, Trash2, FileText } from 'lucide-react';

const DocumentManagementPage = () => {
  const [activeTab, setActiveTab] = useState('All Documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // All Documents State
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
    department: DEPARTMENTS[0],
    content_type: 'text_only',
    tags: '',
    file: null
  });
  const [uploadAllowedDepts, setUploadAllowedDepts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(department !== 'All' && { department })
      };
      const response = await api.get('/documents/', { params });
      const docs = Array.isArray(response.data) ? response.data : response.data.documents || [];
      setDocuments(docs);
      if (response.data.total_pages) {
        setTotalPages(response.data.total_pages);
      } else if (docs.length === 20) {
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
    if (activeTab === 'All Documents') {
      const delayDebounceFn = setTimeout(() => {
        fetchDocuments();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, department, page, activeTab]);

  const openTagModal = (doc) => {
    setSelectedDoc(doc);
    setEditTags((doc.tags || []).join(', '));
    setEditAllowedDepts(doc.allowed_departments || []);
    setTagModalOpen(true);
  };

  const handleSaveTags = async () => {
    try {
      setEditLoading(true);
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await api.put(`/documents/${selectedDoc.id}/tags`, {
        tags: tagsArray,
        allowed_departments: editAllowedDepts
      });
      setTagModalOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error saving tags:', err);
      alert('Failed to update tags');
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
      setDeleteModalOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting doc:', err);
      alert('Failed to delete document');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.title) return;
    
    try {
      setUploading(true);
      setUploadStatus('uploading');
      
      const formData = new FormData();
      formData.append('title', uploadData.title);
      formData.append('department', uploadData.department);
      formData.append('content_type', uploadData.content_type);
      
      const tagsArray = uploadData.tags.split(',').map(t => t.trim()).filter(Boolean);
      formData.append('tags', tagsArray.join(','));
      
      const allowedDepts = uploadAllowedDepts.length > 0 ? uploadAllowedDepts : ['All'];
      formData.append('allowed_departments', allowedDepts.join(','));
      
      formData.append('file', uploadData.file);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadStatus('done');
      setTimeout(() => {
        setUploadData({ title: '', department: DEPARTMENTS[0], content_type: 'text_only', tags: '', file: null });
        setUploadAllowedDepts([]);
        setUploading(false);
        setUploadStatus('');
        setActiveTab('All Documents');
      }, 1000);
      
    } catch (err) {
      console.error('Upload error:', err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (err.message || 'Upload failed.');
      alert(`Upload failed: ${message}`);
      setUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-50">Document Management</h1>
      </div>

      <TabSwitcher 
        tabs={['All Documents', 'Upload New']} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'All Documents' && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={department}
              onChange={e => { setDepartment(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-lg text-slate-50 px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}

          {loading ? (
            <div className="flex justify-center p-8"><LoadingSpinner size="lg" /></div>
          ) : documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents found" />
          ) : (
            <>
              <Table
                headers={['Title', 'Department', 'Type', 'Tags', 'Status', 'Created', 'Actions']}
                data={documents.map(doc => [
                  <div key="title" className="font-medium">{doc.title}</div>,
                  <Badge key="dept" variant="outline" className={DEPT_COLORS[doc.department]}>{doc.department}</Badge>,
                  <Badge key="ctype" variant="secondary" className="text-xs">
                    {doc.content_type === 'images_only' ? '📷 Scanned' : doc.content_type === 'combination' ? '📊 Hybrid' : '📄 Text'}
                  </Badge>,
                  <div key="tags" className="flex flex-wrap gap-1">{(doc.tags || []).map(t => <span key={t} className="text-xs bg-slate-800 px-1 rounded">#{t}</span>)}</div>,
                  <Badge key="status" variant={doc.processing_status === 'completed' ? 'default' : 'secondary'}>{doc.processing_status || 'unknown'}</Badge>,
                  <span key="date" className="text-sm">{new Date(doc.created_at).toLocaleDateString()}</span>,
                  <div key="actions" className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openTagModal(doc)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => openDeleteModal(doc)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ])}
              />
              <div className="flex justify-center gap-4 mt-6">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-slate-400 flex items-center">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === 'Upload New' && (
        <Card className="p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-50 mb-6">Upload Document</h2>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                required
                value={uploadData.title}
                onChange={e => setUploadData({...uploadData, title: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-50 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Content Processing Mode</label>
              <select
                value={uploadData.content_type}
                onChange={e => setUploadData({...uploadData, content_type: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-50 focus:outline-none focus:border-orange-500"
              >
                <option value="text_only">📄 Text Only (Standard digital PDFs, text files)</option>
                <option value="images_only">📷 Scanned / Images Only (Photocopies, scanned forms, OCR)</option>
                <option value="combination">📊 Combination (Digital Text + Charts, Diagrams, Slides)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Department</label>
              <select
                value={uploadData.department}
                onChange={e => setUploadData({...uploadData, department: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-50 focus:outline-none focus:border-orange-500"
              >
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={uploadData.tags}
                onChange={e => setUploadData({...uploadData, tags: e.target.value})}
                placeholder="e.g. guide, onboarding, hr"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-50 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Allowed Departments (leave empty for all)</label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map(dept => (
                  <label key={dept} className="flex items-center space-x-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={uploadAllowedDepts.includes(dept)}
                      onChange={(e) => {
                        if (e.target.checked) setUploadAllowedDepts([...uploadAllowedDepts, dept]);
                        else setUploadAllowedDepts(uploadAllowedDepts.filter(d => d !== dept));
                      }}
                      className="rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-900"
                    />
                    <span>{dept}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">File (PDF or TXT)</label>
              <input
                type="file"
                required
                accept=".pdf,.txt"
                onChange={e => setUploadData({...uploadData, file: e.target.files[0]})}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 cursor-pointer"
              />
            </div>
            <div className="pt-4">
              <Button type="submit" disabled={uploading || !uploadData.file || !uploadData.title} className="w-full flex justify-center items-center gap-2">
                {uploading ? <><LoadingSpinner size="sm" /> {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}</> : <><Upload className="w-4 h-4" /> Upload Document</>}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit Tags Modal */}
      <Modal isOpen={tagModalOpen} onClose={() => setTagModalOpen(false)} title="Edit Tags & Access">
        {selectedDoc && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-50 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Allowed Departments</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-900 border border-slate-700 rounded-lg">
                {DEPARTMENTS.map(dept => (
                  <label key={dept} className="flex items-center space-x-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={editAllowedDepts.includes(dept)}
                      onChange={(e) => {
                        if (e.target.checked) setEditAllowedDepts([...editAllowedDepts, dept]);
                        else setEditAllowedDepts(editAllowedDepts.filter(d => d !== dept));
                      }}
                      className="rounded border-slate-700 text-orange-500 focus:ring-orange-500 bg-slate-800"
                    />
                    <span>{dept}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setTagModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTags} disabled={editLoading}>
                {editLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">Are you sure you want to delete <strong>{selectedDoc?.title}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={editLoading}>
              {editLoading ? <LoadingSpinner size="sm" /> : 'Delete Document'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentManagementPage;
