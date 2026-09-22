import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDepartments } from '../hooks/useDepartments';
import { Button, Card, Badge, LoadingSpinner, Modal } from '../components/ui';
import { 
  Settings, Sliders, User, CheckCircle2, Save, 
  Sun, Moon, Building2, Sparkles, Plus, Edit2, Trash2, 
  Briefcase, GraduationCap, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#599692', '#3b82f6', '#f97316', '#22c55e', 
  '#a855f7', '#06b6d4', '#ec4899', '#eab308'
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { departments, loading: deptsLoading, refresh: refreshDepts } = useDepartments();
  const isAdmin = user?.role === 'admin';

  // AI settings
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [topK, setTopK] = useState(5);
  const [modelName, setModelName] = useState('gemini-2.5-flash');

  // Organization settings
  const [orgName, setOrgName] = useState('Knowledge Management System');
  const [orgType, setOrgType] = useState('Academic Institution');

  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Department Management inside Settings
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#599692');
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Edit Department Modal
  const [editingDept, setEditingDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptColor, setEditDeptColor] = useState('#599692');
  const [editModalOpen, setEditModalOpen] = useState(false);

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

      setSystemPrompt(getVal('system_prompt', 'You are a helpful knowledge assistant. Use the provided documents to answer questions accurately with citations.'));
      setTemperature(parseFloat(getVal('temperature', '0.3')));
      setTopK(parseInt(getVal('top_k', '5'), 10));
      setModelName(getVal('model_name', 'gemini-2.5-flash'));
      setOrgName(getVal('org_name', 'Knowledge Hub'));
      setOrgType(getVal('org_type', 'Academic Institution'));
    } catch (err) {
      console.error('Failed to load settings:', err);
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
          model_name: modelName,
          org_name: orgName,
          org_type: orgType
        }
      });
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setDeptSubmitting(true);
    try {
      await api.post('/departments/', {
        name: newDeptName.trim(),
        color: newDeptColor
      });
      toast.success(`Department "${newDeptName.trim()}" added!`);
      setNewDeptName('');
      refreshDepts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add department');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditDeptColor(dept.color || '#599692');
    setEditModalOpen(true);
  };

  const handleSaveEditDept = async (e) => {
    e.preventDefault();
    if (!editingDept || !editDeptName.trim()) return;

    try {
      await api.put(`/departments/${editingDept.id}`, {
        name: editDeptName.trim(),
        color: editDeptColor
      });
      toast.success('Department updated');
      setEditModalOpen(false);
      refreshDepts();
    } catch (err) {
      toast.error('Failed to update department');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      toast.success('Department deleted');
      refreshDepts();
    } catch (err) {
      toast.error('Failed to delete department');
    }
  };

  const handleApplyPreset = async (presetType) => {
    const presets = presetType === 'college' ? [
      { name: 'Computer Science', color: '#3b82f6' },
      { name: 'Mechanical Eng.', color: '#f97316' },
      { name: 'Applied Sciences', color: '#22c55e' },
      { name: 'Administration', color: '#a855f7' },
      { name: 'Central Library', color: '#06b6d4' },
      { name: 'Examination Cell', color: '#ec4899' },
    ] : [
      { name: 'Engineering', color: '#3b82f6' },
      { name: 'Human Resources', color: '#f97316' },
      { name: 'Finance', color: '#22c55e' },
      { name: 'Legal', color: '#a855f7' },
      { name: 'Operations', color: '#06b6d4' },
    ];

    try {
      for (const p of presets) {
        try { await api.post('/departments/', p); } catch {}
      }
      toast.success(`Loaded ${presetType === 'college' ? 'College' : 'Company'} departments!`);
      refreshDepts();
    } catch {
      toast.error('Failed to load preset departments');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Settings</h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
          {isAdmin 
            ? 'Manage your departments, AI settings, organization profile, and theme.' 
            : 'View your account information and preferences.'}
        </p>
      </div>

      {/* 1. SIMPLE DEPARTMENTS MANAGEMENT (ADMIN ONLY) */}
      {isAdmin && (
        <Card className="space-y-5">
          <Card.Header>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal/10 text-teal">
                <Building2 size={18} />
              </div>
              <div>
                <Card.Title>Departments & Units</Card.Title>
                <Card.Description>Manage the departments used across documents and users</Card.Description>
              </div>
            </div>
            
            {/* Quick Templates */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('college')}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--color-surface-alt)] hover:bg-teal/15 text-[var(--color-text)] border border-[var(--color-border)] hover:border-teal transition-all flex items-center gap-1"
                title="Populate College / University Departments"
              >
                <GraduationCap size={13} className="text-teal" />
                <span>Load College Presets</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('corporate')}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--color-surface-alt)] hover:bg-teal/15 text-[var(--color-text)] border border-[var(--color-border)] hover:border-teal transition-all flex items-center gap-1"
                title="Populate Corporate Departments"
              >
                <Briefcase size={13} className="text-teal" />
                <span>Load Company Presets</span>
              </button>
            </div>
          </Card.Header>

          {/* Quick Add Department Form */}
          <form onSubmit={handleAddDepartment} className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <input
              type="text"
              required
              placeholder="Enter new department name (e.g. Physics, Marketing, Admissions)..."
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="input-field text-xs py-2 flex-1"
            />
            
            {/* Color Swatch Picker */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[var(--color-surface-alt)] p-1.5 rounded-lg border border-[var(--color-border)]">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewDeptColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center text-white"
                  style={{ backgroundColor: c }}
                >
                  {newDeptColor === c && <Check size={10} />}
                </button>
              ))}
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              size="sm" 
              loading={deptSubmitting}
              icon={Plus}
              className="w-full sm:w-auto shrink-0 text-xs"
            >
              Add Department
            </Button>
          </form>

          {/* Department List Chips */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
              Current Departments ({departments.length})
            </span>

            {deptsLoading ? (
              <LoadingSpinner size="sm" />
            ) : departments.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-2">No departments created yet. Add one above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <div 
                    key={dept.id || dept.name}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs text-[var(--color-text)] shadow-sm"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color || '#599692' }} />
                    <span className="font-semibold">{dept.name}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDept(dept)}
                      className="text-[var(--color-text-secondary)] hover:text-teal ml-1"
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDept(dept)}
                      className="text-[var(--color-text-secondary)] hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 2. AI ASSISTANT SETTINGS (ADMIN ONLY) */}
      {isAdmin && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal/10 text-teal">
                  <Sliders size={18} />
                </div>
                <div>
                  <Card.Title>AI Assistant Settings</Card.Title>
                  <Card.Description>Tune how the AI answers questions based on your documents</Card.Description>
                </div>
              </div>
            </Card.Header>

            {loading ? (
              <LoadingSpinner size="sm" message="Loading settings..." />
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="label">AI Instructions</label>
                  <textarea
                    rows={3}
                    required
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="input-field text-xs py-2 resize-none"
                    placeholder="Instructions that guide how the AI answers..."
                  />
                  <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
                    Tells the AI how to behave (e.g. be friendly, always cite the page number, answer clearly).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-[var(--color-text-secondary)]">Answer Accuracy vs. Creativity</span>
                      <span className="text-teal font-mono">{temperature <= 0.3 ? 'Strictly Factual' : 'Balanced'}</span>
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
                      Lower values ensure answers stay 100% faithful to uploaded documents.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-[var(--color-text-secondary)]">Document Sources per Answer</span>
                      <span className="text-teal font-mono">{topK} pages/sections</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                      className="w-full accent-teal cursor-pointer"
                    />
                    <span className="text-[10px] text-[var(--color-text-secondary)] mt-1 block">
                      Number of relevant sections retrieved from documents to generate the answer.
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex justify-end">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    type="submit" 
                    loading={saving} 
                    icon={Save}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </form>
      )}

      {/* 3. ACCOUNT PROFILE */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal/10 text-teal">
              <User size={18} />
            </div>
            <div>
              <Card.Title>Account Profile</Card.Title>
              <Card.Description>Your current login profile details</Card.Description>
            </div>
          </div>
        </Card.Header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-0.5">Name</span>
            <span className="font-semibold text-sm text-[var(--color-text)]">{user?.display_name || 'User'}</span>
          </div>

          <div className="p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-0.5">Email</span>
            <span className="font-mono text-xs text-[var(--color-text)]">{user?.email || '—'}</span>
          </div>

          <div className="p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1">Access Role</span>
            <Badge color={user?.role === 'admin' ? 'teal' : 'gray'} size="sm">
              {user?.role === 'admin' ? 'Administrator' : 'Staff / Member'}
            </Badge>
          </div>

          <div className="p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
            <span className="text-[11px] text-[var(--color-text-secondary)] block mb-1">Department</span>
            <span className="font-semibold text-xs text-[var(--color-text)]">{user?.department || 'General'}</span>
          </div>
        </div>
      </Card>

      {/* 4. THEME TOGGLE */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal/10 text-teal">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <Card.Title>Appearance</Card.Title>
              <Card.Description>Choose your preferred screen mode</Card.Description>
            </div>
          </div>
        </Card.Header>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-[var(--color-text)] block">
              Currently using <strong className="capitalize text-teal">{theme} Mode</strong>
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

      {/* Edit Department Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Department"
        size="sm"
      >
        <form onSubmit={handleSaveEditDept} className="space-y-4">
          <div>
            <label className="label">Department Name</label>
            <input
              type="text"
              required
              value={editDeptName}
              onChange={(e) => setEditDeptName(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 mt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditDeptColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center text-white"
                  style={{ backgroundColor: c }}
                >
                  {editDeptColor === c && <Check size={11} />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
