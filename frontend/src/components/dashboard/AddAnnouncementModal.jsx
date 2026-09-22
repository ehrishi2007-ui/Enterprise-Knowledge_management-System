import React, { useState } from 'react';
import api from '../../lib/api';
import { Modal, Button } from '../ui';
import { Megaphone, Send } from 'lucide-react';

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
      if (onAdded) onAdded(res.data);
      setTitle('');
      setContent('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Campus Announcement"
      icon={Megaphone}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Announcement Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Revised Lab Guidelines or Campus Maintenance Notice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Details / Full Message
          </label>
          <textarea
            rows={4}
            placeholder="Enter announcement description..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500 placeholder-slate-500 resize-none leading-relaxed"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
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
