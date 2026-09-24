import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner, Table } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { ROLES, ROLE_CONFIG } from '../lib/constants';
import { UserPlus, Edit2, Trash2, Shield, Users, CheckCircle2, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const { departments, getDeptColor } = useDepartments();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'employee',
    department: ''
  });
  const [editForm, setEditForm] = useState({
    display_name: '',
    role: 'employee',
    department: '',
    is_active: true
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (departments.length > 0 && !createForm.department) {
      setCreateForm(prev => ({ ...prev, department: departments[0].name }));
    }
  }, [departments]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (roleFilter !== 'All') params.role = roleFilter;
      if (deptFilter !== 'All') params.department = deptFilter;
      if (statusFilter !== 'All') params.is_active = statusFilter === 'Active';

      const res = await api.get('/users/', { params });
      setUsers(res.data?.users || res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, deptFilter, statusFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      await api.post('/users/', {
        ...createForm,
        department: createForm.department || departments[0]?.name || 'General'
      });
      toast.success('User created successfully');
      setAddModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        display_name: '',
        role: 'employee',
        department: departments[0]?.name || 'General'
      });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create user account';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      display_name: user.display_name || '',
      role: user.role || 'employee',
      department: user.department || (departments[0]?.name || 'General'),
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setFormError('');
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setFormError('');
    try {
      await api.put(`/users/${selectedUser.id}`, editForm);
      toast.success('User updated successfully');
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update user profile';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      toast.success('User deactivated');
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.department?.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      header: 'Name',
      accessor: 'display_name',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal/15 text-teal font-bold flex items-center justify-center text-xs">
            {u.display_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="font-semibold text-xs text-[var(--color-text)]">
            {u.display_name}
          </span>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (u) => (
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
          {u.email}
        </span>
      )
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (u) => (
        u.department ? (
          <Badge.Custom bgColor={getDeptColor(u.department)}>
            {u.department}
          </Badge.Custom>
        ) : (
          <span className="text-xs text-[var(--color-text-secondary)]">—</span>
        )
      )
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (u) => (
        <Badge 
          color={ROLE_CONFIG[u.role]?.color || 'teal'} 
          size="sm"
        >
          {ROLE_CONFIG[u.role]?.label || u.role}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (u) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          u.is_active ? 'text-emerald-500' : 'text-slate2'
        }`}>
          {u.is_active ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle size={13} className="text-slate2" />
              <span>Inactive</span>
            </>
          )}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(u)}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
            title="Edit User"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => {
              setSelectedUser(u);
              setDeleteModalOpen(true);
            }}
            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
            title="Deactivate Account"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">User Directory & Permissions</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Provision staff, faculty, or employee accounts and assign department visibility.
          </p>
        </div>

        <Button 
          variant="primary" 
          icon={UserPlus} 
          size="sm"
          onClick={() => {
            setFormError('');
            setAddModalOpen(true);
          }}
        >
          Add New User
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search by name, email, or dept..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="input-field pl-9 text-xs py-1.5 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs px-2.5 py-1.5 text-[var(--color-text)] focus:outline-none focus:border-teal"
            >
              <option value="All">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs px-2.5 py-1.5 text-[var(--color-text)] focus:outline-none focus:border-teal"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg text-xs px-2.5 py-1.5 text-[var(--color-text)] focus:outline-none focus:border-teal"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table / States */}
      {loading ? (
        <LoadingSpinner message="Loading user directory..." />
      ) : error ? (
        <Card className="p-6 text-center border-red-500/30">
          <p className="text-red-500 text-xs mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchUsers}>Retry</Button>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="No user profiles match your filter criteria."
          action={() => { setRoleFilter('All'); setDeptFilter('All'); setStatusFilter('All'); setSearchFilter(''); }}
          actionLabel="Reset Filters"
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table 
            columns={columns}
            data={filteredUsers}
          />
        </Card>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New User Account"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Full / Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Jane Doe or Alex Morgan"
              value={createForm.display_name}
              onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Email Address *</label>
            <input
              type="email"
              required
              placeholder="user@organization.edu"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Initial Password *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">System Role *</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="input-field text-xs py-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Assigned Department *</label>
              <select
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                className="input-field text-xs py-2"
              >
                {departments.map((d) => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Profile"
        size="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
              {formError}
            </div>
          )}

          <div>
            <label className="label">Display Name *</label>
            <input
              type="text"
              required
              value={editForm.display_name}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role *</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="input-field text-xs py-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Department *</label>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="input-field text-xs py-2"
              >
                {departments.map((d) => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
            />
            <label htmlFor="is_active_edit" className="text-xs text-[var(--color-text)] font-medium cursor-pointer">
              Account Active (User can authenticate and consult documents)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deactivation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to deactivate <strong className="text-[var(--color-text)]">{selectedUser?.display_name}</strong> ({selectedUser?.email})?
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteUser} loading={actionLoading}>
              Deactivate User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
