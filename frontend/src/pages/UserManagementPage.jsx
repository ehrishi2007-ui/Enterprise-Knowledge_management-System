import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner, Table } from '../components/ui';
import { DEPARTMENTS, ROLES } from '../lib/constants';
import { UserPlus, Edit2, Trash2, Shield, Users, CheckCircle2, XCircle } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    department: 'Engineering'
  });
  const [editForm, setEditForm] = useState({
    display_name: '',
    role: 'employee',
    department: 'Engineering',
    is_active: true
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

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
      setError('Unable to load user accounts. Please check your backend connection.');
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
      await api.post('/users/', createForm);
      setAddModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        display_name: '',
        role: 'employee',
        department: 'Engineering'
      });
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      display_name: user.display_name || '',
      role: user.role || 'employee',
      department: user.department || 'Engineering',
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
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to update user profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      alert(err.response?.data?.detail || 'Failed to deactivate user account');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-3">
            <Users className="text-orange-500" size={28} />
            <span>User Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage user accounts, roles, departments, and access permissions.
          </p>
        </div>
        <Button 
          variant="primary" 
          icon={UserPlus} 
          onClick={() => {
            setFormError('');
            setAddModalOpen(true);
          }}
        >
          Add User
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
            >
              <option value="All">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500"
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
        <Card className="p-8 text-center">
          <LoadingSpinner text="Loading user directory..." />
        </Card>
      ) : error ? (
        <Card className="p-6 text-center border-red-500/30">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchUsers}>Retry</Button>
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          message="No user profiles match your filter criteria."
          action={
            <Button variant="secondary" size="sm" onClick={() => { setRoleFilter('All'); setDeptFilter('All'); setStatusFilter('All'); }}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4 font-medium text-slate-100">{u.display_name}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{u.email}</td>
                    <td className="p-4">{u.department || '—'}</td>
                    <td className="p-4">
                      <Badge variant={u.role === 'admin' ? 'accent' : 'info'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        u.is_active ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {u.is_active ? (
                          <>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} className="text-slate-500" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Deactivate / Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New User Account"
        icon={UserPlus}
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Jane Doe"
              value={createForm.display_name}
              onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="name@hitam.edu.in"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role *</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
              <select
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
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
        icon={Edit2}
        size="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name *</label>
            <input
              type="text"
              required
              value={editForm.display_name}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role *</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-orange-500 w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-slate-200">
              Account Active (User can authenticate and access EKMS)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deactivation"
        icon={Trash2}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to deactivate <strong className="text-slate-100">{selectedUser?.display_name}</strong> ({selectedUser?.email})?
          </p>
          <p className="text-xs text-slate-400">
            This will suspend user login rights and revoke access to internal institutional resources.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
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
