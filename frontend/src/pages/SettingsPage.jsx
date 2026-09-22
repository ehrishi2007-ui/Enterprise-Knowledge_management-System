import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge, LoadingSpinner } from '../components/ui';
import { Settings, Sliders, User, CheckCircle2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // AI settings
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/settings/');
      const settingsList = res.data?.settings || [];
      
      const promptObj = settingsList.find(s => s.key === 'system_prompt' || s.setting_key === 'system_prompt');
      const tempObj = settingsList.find(s => s.key === 'temperature' || s.setting_key === 'temperature');
      const topKObj = settingsList.find(s => s.key === 'top_k' || s.setting_key === 'top_k');

      if (promptObj) setSystemPrompt(promptObj.value || promptObj.setting_value || '');
      if (tempObj) setTemperature(parseFloat(tempObj.value || tempObj.setting_value) || 0.3);
      if (topKObj) setTopK(parseInt(topKObj.value || topKObj.setting_value, 10) || 5);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Sensible default if not yet seeded
      setSystemPrompt("You are a helpful and professional enterprise knowledge assistant. Answer questions strictly based on the retrieved context documents with accurate citations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError('');

    try {
      await api.put('/settings/', {
        settings: {
          system_prompt: systemPrompt,
          temperature: String(temperature),
          top_k: String(topK)
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.detail || 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-3">
          <Settings className="text-orange-500" size={28} />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isAdmin ? 'Configure AI RAG pipeline parameters, retrieval depth, and review your profile.' : 'View your account credentials and institutional department role.'}
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 size={20} className="shrink-0" />
          <span>RAG configuration and prompt parameters updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Admin AI Configuration */}
      {isAdmin && (
        <Card title="AI & RAG Pipeline Configuration" subtitle="Fine-tune Gemini retrieval-augmented generation parameters" icon={Sliders}>
          {loading ? (
            <div className="py-6 text-center">
              <LoadingSpinner text="Loading AI parameters..." />
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  System Instruction Prompt
                </label>
                <textarea
                  rows={4}
                  required
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 font-mono resize-none leading-relaxed"
                  placeholder="Set system level instructions for the assistant..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  Guiding rules injected into every prompt before vectorized document context.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
                    <span>Model Temperature</span>
                    <span className="text-orange-400 font-mono font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 bg-slate-900 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Lower values (0.1–0.3) provide grounded, factual policy citations.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
                    <span>Top-K Retrieved Context Chunks</span>
                    <span className="text-orange-400 font-mono font-bold">{topK}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                    className="w-full accent-orange-500 bg-slate-900 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Number of vector similarity chunks retrieved from ChromaDB.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end">
                <Button variant="primary" size="md" type="submit" loading={saving} icon={Save}>
                  Save AI Settings
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Account Profile Card */}
      <Card title="Account Profile" subtitle="Your institutional user identity in EKMS" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-0.5">Full Name</span>
            <span className="font-semibold text-slate-100">{user?.display_name || '—'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-0.5">Email Address</span>
            <span className="font-semibold text-slate-100 font-mono text-xs">{user?.email || '—'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-0.5">System Role</span>
            <div className="mt-1">
              <Badge variant={user?.role === 'admin' ? 'accent' : 'info'}>
                {user?.role || 'employee'}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60">
            <span className="text-xs text-slate-400 block mb-0.5">Assigned Department</span>
            <span className="font-semibold text-slate-100">{user?.department || 'Operations'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
