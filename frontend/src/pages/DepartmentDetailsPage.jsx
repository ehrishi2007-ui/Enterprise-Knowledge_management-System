import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Card, Badge, EmptyState, LoadingSpinner, Button, Modal } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { 
  Building2, Users, FileText, Plus, Edit2, Trash2, 
  Calendar, Palette, Check, GraduationCap, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#599692', '#3b82f6', '#f97316', '#22c55e', 
  '#a855f7', '#06b6d4', '#ec4899', '#eab308'
];

export default function DepartmentDetailsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { departments, loading: deptsLoading, refresh: refreshDepts, getDeptColor } = useDepartments();

  const activeDeptName = searchParams.get('dept') || (departments[0]?.name || 'Engineering');

  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Department form state
  const [formState, setFormState] = useState({
    name: '',
    color: '#599692',
    description: ''
  });
  const [selectedDeptForAction, setSelectedDeptForAction] = useState(null);

  const fetchDepartmentData = async (deptName) => {
    if (!deptName) return;
    try {
      setLoading(true);
      const [usersRes, docsRes] = await Promise.all([
        api.get('/users/', { params: { department: deptName } }),
        api.get('/documents/', { params: { department: deptName, limit: 50 } })
      ]);

      const uList = usersRes.data?.users || usersRes.data || [];
      const dList = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.documents || [];

      setUsers(uList);
      setDocuments(dList);
    } catch (err) {
      console.error('Error fetching department details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDeptName) {
      fetchDepartmentData(activeDeptName);
    }
  }, [activeDeptName]);

  const handleSelectDept = (deptName) => {
    setSearchParams({ dept: deptName });
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!formState.name.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/departments/', formState);
      toast.success(`Department "${formState.name}" created!`);
      setAddModalOpen(false);
      setFormState({ name: '', color: '#599692', description: '' });
      refreshDepts();
      handleSelectDept(formState.name.trim());
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create department';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (dept) => {
    setSelectedDeptForAction(dept);
    setFormState({
      name: dept.name,
      color: dept.color || '#599692',
      description: dept.description || ''
    });
    setEditModalOpen(true);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!selectedDeptForAction) return;

    setSubmitting(true);
    try {
      await api.put(`/departments/${selectedDeptForAction.id}`, formState);
      toast.success('Department updated successfully');
      setEditModalOpen(false);
      refreshDepts();
      handleSelectDept(formState.name.trim());
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDeptForAction) return;
    setSubmitting(true);
    try {
      await api.delete(`/departments/${selectedDeptForAction.id}`);
      toast.success('Department removed');
      setDeleteModalOpen(false);
      refreshDepts();
      const remaining = departments.filter(d => d.id !== selectedDeptForAction.id);
      if (remaining.length > 0) {
        handleSelectDept(remaining[0].name);
      }
    } catch (err) {
      toast.error('Failed to remove department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPreset = async (presetType) => {
    const enterprisePresets = [
      { name: 'Engineering', color: '#3b82f6', description: 'Technical & Development' },
      { name: 'Human Resources', color: '#f97316', description: 'People & Onboarding' },
      { name: 'Finance & Accounts', color: '#22c55e', description: 'Financial & Payroll' },
      { name: 'Legal & Compliance', color: '#a855f7', description: 'Contracts & Regulatory' },
      { name: 'Operations', color: '#06b6d4', description: 'Logistics & Facilities' },
    ];

    const collegePresets = [
      { name: 'Computer Science', color: '#3b82f6', description: 'CSE Faculty & Labs' },
      { name: 'Mechanical Eng.', color: '#f97316', description: 'Mechanical Workshops & Guides' },
      { name: 'Physics & Sciences', color: '#22c55e', description: 'Applied Sciences & Research' },
      { name: 'Administration', color: '#a855f7', description: 'Registrar & Dean Office' },
      { name: 'Central Library', color: '#06b6d4', description: 'Journals, Catalogues & Books' },
      { name: 'Examination Cell', color: '#ec4899', description: 'Evaluations & Grading Policies' },
    ];

    const chosen = presetType === 'college' ? collegePresets : enterprisePresets;

    try {
      for (const item of chosen) {
        try {
          await api.post('/departments/', item);
        } catch {
          // Ignore duplicates
        }
      }
      toast.success(`Applied ${presetType === 'college' ? 'Academic' : 'Enterprise'} department template!`);
      refreshDepts();
    } catch {
      toast.error('Failed to apply template');
    }
  };

  const currentDeptObj = departments.find(d => d.name === activeDeptName);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department & Unit Management</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Configure custom departments for your company teams or university academic faculties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            icon={Briefcase}
            onClick={() => handleApplyPreset('enterprise')}
            title="Seed Corporate Departments"
          >
            Enterprise Template
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            icon={GraduationCap}
            onClick={() => handleApplyPreset('college')}
            title="Seed University Faculties"
          >
            College Template
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            icon={Plus} 
            onClick={() => {
              setFormState({ name: '', color: '#599692', description: '' });
              setAddModalOpen(true);
            }}
          >
            New Department
          </Button>
        </div>
      </div>

      {/* Dynamic Department Tabs / Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {departments.map((dept) => {
          const isActive = activeDeptName === dept.name;
          return (
            <button
              key={dept.id || dept.name}
              onClick={() => handleSelectDept(dept.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-teal text-white shadow-sm'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color || '#599692' }} />
              <span>{dept.name}</span>
            </button>
          );
        })}
      </div>

      {deptsLoading ? (
        <LoadingSpinner message="Loading departments..." />
      ) : (
        <>
          {/* Active Department Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm text-lg"
                  style={{ backgroundColor: getDeptColor(activeDeptName) }}
                >
                  {activeDeptName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)]">Active Department</span>
                  <h3 className="text-base font-bold text-[var(--color-text)]">{activeDeptName}</h3>
                </div>
              </div>

              {currentDeptObj && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(currentDeptObj)}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
                    title="Edit Name & Color"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDeptForAction(currentDeptObj);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </Card>

            <Card className="flex items-center gap-3.5 p-5">
              <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)]">Assigned Members</span>
                <h3 className="text-2xl font-bold text-[var(--color-text)]">{users.length}</h3>
              </div>
            </Card>

            <Card className="flex items-center gap-3.5 p-5">
              <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                <FileText size={22} />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)]">Department Documents</span>
                <h3 className="text-2xl font-bold text-[var(--color-text)]">{documents.length}</h3>
              </div>
            </Card>
          </div>

          {/* Members & Documents Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Assigned Members */}
            <div className="lg:col-span-7">
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                    <Users size={16} className="text-teal" />
                    <span>{activeDeptName} Members ({users.length})</span>
                  </h3>
                </div>

                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : users.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={Users}
                      title="No Assigned Members"
                      description={`Assign staff or students to ${activeDeptName} from the User Management page.`}
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-semibold border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-3 pl-4">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-[var(--color-surface-alt)] transition-colors">
                            <td className="p-3 pl-4 font-semibold text-[var(--color-text)]">{u.display_name}</td>
                            <td className="p-3 font-mono text-[var(--color-text-secondary)]">{u.email}</td>
                            <td className="p-3">
                              <Badge color={u.role === 'admin' ? 'teal' : 'gray'} size="sm">
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-3 pr-4">
                              <span className={`font-semibold ${u.is_active ? 'text-emerald-500' : 'text-slate2'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Right 5 cols: Department Documents */}
            <div className="lg:col-span-5">
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                    <FileText size={16} className="text-teal" />
                    <span>{activeDeptName} Documents ({documents.length})</span>
                  </h3>
                </div>

                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : documents.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No Documents"
                    description={`No repository files uploaded specifically for ${activeDeptName}.`}
                  />
                ) : (
                  <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl hover:border-teal/50 transition-colors space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-[var(--color-text)] line-clamp-1">
                            {doc.title}
                          </h4>
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                            {doc.file_type || 'PDF'}
                          </span>
                        </div>
                        {doc.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.tags.slice(0, 3).map((t, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                        {doc.created_at && (
                          <span className="text-[10px] text-[var(--color-text-secondary)] block pt-1">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create New Department / Unit"
        size="md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="label">Department / Faculty Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Computer Science, Research & Development, HR"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Badge Accent Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formState.color}
                onChange={(e) => setFormState({ ...formState, color: e.target.value })}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] cursor-pointer p-0.5 bg-transparent"
              />
              <div className="flex flex-wrap gap-1.5 flex-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormState({ ...formState, color: c })}
                    className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 flex items-center justify-center text-white"
                    style={{ backgroundColor: c }}
                  >
                    {formState.color === c && <Check size={11} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Description / Scope (Optional)</label>
            <textarea
              rows={3}
              placeholder="Brief description of this unit's institutional purpose..."
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="input-field text-xs py-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Department"
        size="md"
      >
        <form onSubmit={handleUpdateDepartment} className="space-y-4">
          <div>
            <label className="label">Department Name *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Badge Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formState.color}
                onChange={(e) => setFormState({ ...formState, color: e.target.value })}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] cursor-pointer p-0.5 bg-transparent"
              />
              <div className="flex flex-wrap gap-1.5 flex-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormState({ ...formState, color: c })}
                    className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 flex items-center justify-center text-white"
                    style={{ backgroundColor: c }}
                  >
                    {formState.color === c && <Check size={11} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={3}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="input-field text-xs py-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Department Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Department Removal"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to delete <strong className="text-[var(--color-text)]">"{selectedDeptForAction?.name}"</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteDepartment} loading={submitting}>
              Remove Department
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
