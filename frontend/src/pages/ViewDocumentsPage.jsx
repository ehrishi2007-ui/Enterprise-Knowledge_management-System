import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge, EmptyState, LoadingSpinner, CardSkeleton } from '../components/ui';
import { DEPARTMENTS, DEPT_COLORS } from '../lib/constants';
import { Search, FileText, Download } from 'lucide-react';

const ViewDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(department !== 'All' && { department }),
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
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
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

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (dept) => {
    setDepartment(dept);
    setPage(1);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = async (doc) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      return;
    }
    if (doc.storage_path) {
      try {
        const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      } catch (err) {
        console.error('Error opening document:', err);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-50">Documents</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-50 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDepartmentChange('All')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            department === 'All'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            onClick={() => handleDepartmentChange(dept)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              department === dept
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col h-full">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={DEPT_COLORS[doc.department] || 'text-slate-300 border-slate-600'}>
                      {doc.department}
                    </Badge>
                    {doc.file_type && (
                      <Badge variant="secondary">{doc.file_type.toUpperCase()}</Badge>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-50 mb-2 line-clamp-2">
                  {doc.title}
                </h3>
                
                <div className="flex flex-wrap gap-1 mb-4 mt-auto pt-4">
                  {(doc.tags || []).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 mt-2 border-t border-slate-700 pt-3">
                  <span>{formatFileSize(doc.file_size_bytes || doc.file_size || 0)}</span>
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-700 bg-slate-800/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full flex justify-center items-center gap-2"
                  onClick={() => handleView(doc)}
                >
                  <Download className="w-4 h-4" /> View Document
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ViewDocumentsPage;
