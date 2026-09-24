import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Download, ExternalLink, Bot, FileText, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './index';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function DocumentPreviewModal({ isOpen, onClose, doc }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const activeBlobUrlRef = useRef(null);

  const isPdf = doc?.file_type === 'pdf' || doc?.filename?.toLowerCase().endsWith('.pdf');
  const isTxt = doc?.file_type === 'txt' || doc?.filename?.toLowerCase().endsWith('.txt');

  // Clean up object URLs
  const cleanupBlob = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setPdfBlobUrl(null);
  };

  useEffect(() => {
    if (!isOpen || !doc?.id) {
      cleanupBlob();
      setTextContent('');
      setErrorMessage('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    cleanupBlob();

    if (isPdf) {
      // Fetch PDF as authenticated binary blob
      api.get(`/documents/${doc.id}/file`, { responseType: 'blob' })
        .then((res) => {
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          activeBlobUrlRef.current = url;
          setPdfBlobUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load PDF preview:', err);
          const status = err.response?.status;
          if (status === 403) {
            setErrorMessage('Access Denied: Your role does not have permission to view this document.');
          } else if (status === 404) {
            setErrorMessage('Document file was not found in institutional storage.');
          } else {
            setErrorMessage('Could not load PDF document preview. Please try downloading or opening in a new tab.');
          }
          setLoading(false);
        });
    } else if (isTxt) {
      // Fetch text content
      api.get(`/documents/${doc.id}/file`, { responseType: 'text' })
        .then((res) => {
          setTextContent(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load text preview:', err);
          const status = err.response?.status;
          if (status === 403) {
            setErrorMessage('Access Denied: Your role does not have permission to view this document.');
          } else {
            setErrorMessage('Unable to load document text content.');
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      cleanupBlob();
    };
  }, [isOpen, doc?.id, isPdf, isTxt]);

  if (!doc) return null;

  const handleAskAi = () => {
    onClose();
    navigate(`/employee/chat?q=${encodeURIComponent('Tell me about the contents and key points of ' + (doc.title || doc.filename))}`);
  };

  const handleDownload = async () => {
    try {
      if (pdfBlobUrl) {
        const a = document.createElement('a');
        a.href = pdfBlobUrl;
        a.download = doc.filename || `${doc.title || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      
      const res = await api.get(`/documents/${doc.id}/file?download=true`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename || `${doc.title || 'document'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback
      window.open(`/api/documents/${doc.id}/download`, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else {
      const token = localStorage.getItem('supabase_token') || '';
      window.open(`/api/documents/${doc.id}/file?token=${encodeURIComponent(token)}`, '_blank');
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setErrorMessage('');
    if (isPdf) {
      api.get(`/documents/${doc.id}/file`, { responseType: 'blob' })
        .then((res) => {
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          activeBlobUrlRef.current = url;
          setPdfBlobUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          setErrorMessage('Could not load PDF document preview.');
          setLoading(false);
        });
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-left align-middle shadow-2xl transition-all flex flex-col h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] shrink-0">
                  <div className="flex items-center gap-3 truncate pr-4">
                    <div className="p-2 rounded-xl bg-teal/15 text-teal shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="truncate">
                      <Dialog.Title as="h3" className="text-sm md:text-base font-bold text-[var(--color-text)] truncate">
                        {doc.title || doc.filename}
                      </Dialog.Title>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.department && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium">
                            {doc.department}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase">
                          {doc.file_type || 'PDF'}
                        </span>
                        {doc.file_size_bytes && (
                          <span className="text-[11px] text-[var(--color-text-secondary)]">
                            • {(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAskAi}
                      className="hidden sm:inline-flex text-teal hover:bg-teal/10 text-xs gap-1"
                      title="Ask AI questions about this document"
                    >
                      <Bot size={14} />
                      <span>Ask AI</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleOpenNewTab}
                      className="text-xs px-2.5 py-1 gap-1"
                      title="Open full document in separate tab"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">New Tab</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                      className="text-xs px-2.5 py-1 gap-1"
                      title="Download document file"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors ml-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Content / Preview Body */}
                <div className="flex-1 overflow-hidden relative bg-[var(--color-surface)] flex flex-col p-2 sm:p-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-[var(--color-text-secondary)]">
                      <Loader2 size={32} className="animate-spin text-teal" />
                      <span className="text-sm font-medium">Loading document preview...</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        Preparing authenticated viewer stream
                      </span>
                    </div>
                  ) : errorMessage ? (
                    <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-center p-6">
                      <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                        <AlertCircle size={32} />
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">Preview Unavailable</h4>
                      <p className="text-xs text-[var(--color-text-secondary)] max-w-md">
                        {errorMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="secondary" size="sm" onClick={handleRetry} className="gap-1.5">
                          <RefreshCw size={13} />
                          <span>Retry</span>
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleDownload} className="gap-1.5">
                          <Download size={13} />
                          <span>Download File</span>
                        </Button>
                      </div>
                    </div>
                  ) : isPdf && pdfBlobUrl ? (
                    <div className="w-full h-full flex flex-col relative rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                      <object
                        data={pdfBlobUrl}
                        type="application/pdf"
                        className="w-full h-full flex-1 rounded-lg"
                      >
                        <iframe
                          src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                          title={doc.title}
                          className="w-full h-full flex-1 rounded-lg border-0"
                        />
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                          <FileText size={40} className="text-teal mb-3" />
                          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                            Your browser could not embed this PDF natively.
                          </p>
                          <Button variant="primary" onClick={handleDownload} className="gap-2">
                            <Download size={14} />
                            Download PDF File
                          </Button>
                        </div>
                      </object>
                    </div>
                  ) : isTxt ? (
                    <div className="w-full h-full rounded-xl border border-[var(--color-border)] p-4 overflow-y-auto bg-[var(--color-surface-alt)]">
                      <pre className="font-mono text-xs text-[var(--color-text)] whitespace-pre-wrap leading-relaxed select-text">
                        {textContent}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12">
                      <FileText size={48} className="text-teal mb-3" />
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">
                        Preview not available for this file type
                      </h4>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-4">
                        You can download the file to view it on your device.
                      </p>
                      <Button variant="primary" onClick={handleDownload} className="gap-2">
                        <Download size={14} />
                        Download {doc.filename || 'File'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Ready for AI Queries & Semantic Search</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      Close Preview
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
