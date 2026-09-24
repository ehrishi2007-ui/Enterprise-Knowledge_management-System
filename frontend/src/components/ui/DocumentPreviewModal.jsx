import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Download, ExternalLink, Bot, FileText, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button, Badge } from './index';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function DocumentPreviewModal({ isOpen, onClose, doc }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState('');
  const [textError, setTextError] = useState('');

  if (!doc) return null;

  const isPdf = doc.file_type === 'pdf' || doc.filename?.toLowerCase().endsWith('.pdf');
  const isTxt = doc.file_type === 'txt' || doc.filename?.toLowerCase().endsWith('.txt');

  // Retrieve auth token for query param iframe authentication
  const storedUser = localStorage.getItem('ekms_user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const token = localStorage.getItem('ekms_token') || (user?.role ? `demo-token-${user.role}` : 'demo-token-employee');

  const streamUrl = `/api/documents/${doc.id}/file?token=${encodeURIComponent(token)}`;
  const downloadUrl = `/api/documents/${doc.id}/download?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (isOpen && isTxt && doc.id) {
      setLoading(true);
      setTextError('');
      api.get(`/documents/${doc.id}/file`, { responseType: 'text' })
        .then(res => {
          setTextContent(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching text file content:', err);
          setTextError('Unable to load document text content.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isOpen, doc?.id, isTxt]);

  const handleAskAi = () => {
    onClose();
    navigate(`/employee/chat?q=${encodeURIComponent('Tell me about the contents and key points of ' + doc.title)}`);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.filename || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    window.open(streamUrl, '_blank', 'noopener,noreferrer');
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 md:p-6 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-left align-middle shadow-2xl transition-all flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
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

                  {/* Top Action Buttons */}
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
                <div className="flex-1 overflow-hidden relative bg-[var(--color-surface)] flex flex-col p-2 md:p-4">
                  {isPdf ? (
                    <div className="w-full h-full min-h-[60vh] md:min-h-[72vh] flex flex-col relative rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                      <iframe
                        src={`${streamUrl}#toolbar=1&navpanes=0`}
                        title={doc.title}
                        className="w-full h-full flex-1 rounded-lg border-0"
                        onLoad={() => setLoading(false)}
                      />
                      <noscript>
                        <div className="p-8 text-center">
                          <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                            Your browser does not support embedded PDF frames.
                          </p>
                          <Button variant="primary" onClick={handleDownload}>
                            Download PDF File
                          </Button>
                        </div>
                      </noscript>
                    </div>
                  ) : isTxt ? (
                    <div className="w-full h-full min-h-[60vh] md:min-h-[72vh] rounded-xl border border-[var(--color-border)] p-4 overflow-y-auto bg-[var(--color-surface-alt)]">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-[var(--color-text-secondary)]">
                          <Loader2 size={24} className="animate-spin text-teal" />
                          <span className="text-xs">Loading text content...</span>
                        </div>
                      ) : textError ? (
                        <div className="p-6 text-center text-xs text-red-500">
                          {textError}
                        </div>
                      ) : (
                        <pre className="font-mono text-xs text-[var(--color-text)] whitespace-pre-wrap leading-relaxed select-text">
                          {textContent}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
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
                <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>
                    Indexed for AI queries & search
                  </span>
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
