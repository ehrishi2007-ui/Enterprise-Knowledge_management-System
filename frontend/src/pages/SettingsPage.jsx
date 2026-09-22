import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Badge, LoadingSpinner } from '../components/ui';
import { 
  Settings, Sliders, User, CheckCircle2, Save, 
  Sun, Moon, Building2, Sparkles, Cpu 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  // AI settings
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [topK, setTopK] = useState(5);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [modelName, setModelName] = useState('gemini-2.5-flash');

  // Organization settings
  const [orgName, setOrgName] = useState('Knowledge Management System');
  const [orgType, setOrgType] = useState('Academic Institution');

  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
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
      
      const getVal = (key, fallback) => {
        const item = settingsList.find(s => s.key === key || s.setting_key === key);
        return item?.value || item?.setting_value || fallback;
      };

      setSystemPrompt(getVal('system_prompt', 'You are a helpful, professional knowledge assistant. Use the provided context documents to answer the user question with exact citations.'));
      setTemperature(parseFloat(getVal('temperature', '0.3')));
      setTopK(parseInt(getVal('top_k', '5'), 10));
      setMaxTokens(parseInt(getVal('max_tokens', '1024'), 10));
      setModelName(getVal('model_name', 'gemini-2.5-flash'));
      setOrgName(getVal('org_name', 'Knowledge Management System'));
      setOrgType(getVal('org_type', 'Academic Institution'));
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSystemPrompt('You are an institutional knowledge assistant. Answer questions strictly based on the retrieved context documents with accurate citations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.put('/settings/', {
        settings: {
          system_prompt: systemPrompt,
          temperature: String(temperature),
          top_k: String(topK),
          max_tokens: String(maxTokens),
          model_name: modelName,
          org_name: orgName,
          org_type: orgType
        }
      });
      toast.success('System configuration saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      const msg = err.response?.data?.detail || 'Failed to update settings.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">System Settings</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
          {isAdmin 
            ? 'Configure AI RAG pipeline parameters, institution profile, and application theme.' 
            : 'Review your account credentials and personal preferences.'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs">
          {error}
        </div>
      )}

      {/* Admin AI Configuration Form */}
      {isAdmin && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* AI Parameters */}
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Sliders size={18} />
                </div>
                <div>
                  <Card.Title>AI & RAG Hyperparameters</Card.Title>
                  <Card.Description>Fine-tune vector search retrieval and LLM synthesis</Card.Description>
                </div>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" message="Loading settings..." />
            ) : (
              <div className="space-y-5 pt-2">
                <div>
                  <label className="label">System Instruction Prompt</label>
                  <textarea
                    rows={4}
                    required
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="input-field text-xs font-mono py-2.5 resize-none leading-relaxed"
                    placeholder="Instructions passed to LLM before context..."
                  />
                  <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
                    Defines assistant persona and enforces citation grounding rules.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Gemini Foundation Model</label>
                    <select
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="input-field text-xs py-2"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended: Fast & Multimodal)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep reasoning)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Max Response Tokens: {maxTokens}</label>
                    <input
                      type="range"
                      min="256"
                      max="2048"
                      step="128"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                      className="w-full accent-teal cursor-pointer mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-[var(--color-text-secondary)]">Temperature</span>
                      <span className="text-teal font-mono">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-teal cursor-pointer"
                    />
                    <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                      Lower values (0.1–0.3) enforce strict, factual citations without hallucination.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-[var(--color-text-secondary)]">Top-K Retrieved Chunks</span>
                      <span className="text-teal font-mono">{topK}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                      className="w-full accent-teal cursor-pointer"
                    />
                    <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                      Number of similarity chunks fetched from ChromaDB per query.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Organization Customization */}
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Building2 size={18} />
                </div>
                <div>
                  <Card.Title>Organization Identity</Card.Title>
                  <Card.Description>Adapt terminology for enterprise or university campuses</Card.Description>
                </div>
              </div>
            </Card.Header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="label">Organization / College Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="input-field text-xs py-2"
                  placeholder="e.g. HITAM Campus or Acme Corp"
                />
              </div>

              <div>
                <label className="label">Institutional Category</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="input-field text-xs py-2"
                >
                  <option value="Academic Institution">Academic Institution / College</option>
                  <option value="Corporate Enterprise">Corporate Enterprise</option>
                  <option value="Research Institute">Research Institute</option>
                  <option value="Healthcare & Hospital">Healthcare & Hospital</option>
                </select>
              </div>
            </div>

            <div className="pt-5 border-t border-[var(--color-border)] mt-5 flex justify-end">
              <Button 
                variant="primary" 
                size="md" 
                type="submit" 
                loading={saving} 
                icon={Save}
              >
                Save All Settings
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Account Profile Card */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal/10 text-teal">
              <User size={18} />
            </div>
            <div>
              <Card.Title>Account Profile</Card.Title>
              <Card.Description>Your authenticated session details</Card.Description>
            </div>
          </div>
        </Card.Header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1">Display Name</span>
            <span className="font-semibold text-sm text-[var(--color-text)]">{user?.display_name || '—'}</span>
          </div>

          <div className="p-3.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1">Email Address</span>
            <span className="font-mono text-xs text-[var(--color-text)]">{user?.email || '—'}</span>
          </div>

          <div className="p-3.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1.5">System Role</span>
            <Badge color={user?.role === 'admin' ? 'teal' : 'gray'} size="sm">
              {user?.role || 'employee'}
            </Badge>
          </div>

          <div className="p-3.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1">Assigned Department</span>
            <span className="font-semibold text-xs text-[var(--color-text)]">{user?.department || 'General'}</span>
          </div>
        </div>
      </Card>

      {/* Theme Preference Card */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal/10 text-teal">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <Card.Title>Interface Appearance</Card.Title>
              <Card.Description>Toggle between Dark and Light mode</Card.Description>
            </div>
          </div>
        </Card.Header>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text)] block">
              Current Theme: <strong className="capitalize text-teal">{theme} Mode</strong>
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {theme === 'dark' ? 'Neutral dark gray background with navy sidebar.' : 'Clean crisp light background with navy sidebar.'}
            </span>
          </div>

          <Button 
            variant="secondary" 
            size="sm"
            onClick={toggleTheme}
            icon={theme === 'dark' ? Sun : Moon}
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
        </div>
      </Card>
    </div>
  );
}
