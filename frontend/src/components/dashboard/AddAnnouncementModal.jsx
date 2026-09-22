import React, { useState } from 'react';
import api from '../../lib/api';
import { Modal, Button } from '../ui';
import { Megaphone, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddAnnouncementModal({ isOpen, onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/announcements/', { title, content });
      toast.success('Announcement published');
      if (onAdded) onAdded(res.data);
      setTitle('');
      setContent('');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to publish announcement';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Organization Announcement"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
            {error}
          </div>
        )}

        <div>
          <label className="label">
            Announcement Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Revised Policy Guidelines or Academic Calendar Notice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field text-sm"
          />
        </div>

        <div>
          <label className="label">
            Details / Full Message
          </label>
          <textarea
            rows={4}
            placeholder="Enter announcement description..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field text-sm resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={loading} icon={Send}>
            Publish Notice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
