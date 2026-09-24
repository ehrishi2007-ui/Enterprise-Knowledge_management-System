import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Button, Card, Badge, Modal, EmptyState, LoadingSpinner, Table, TabSwitcher } from '../components/ui';
import { useDepartments } from '../hooks/useDepartments';
import { useRoles } from '../hooks/useRoles';
import { 
  UserPlus, Edit2, Trash2, Shield, Users, CheckCircle2, 
  XCircle, Search, Plus, Check, Lock, Sparkles, UploadCloud, FileText, Settings as SettingsIcon, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_COLORS = [
  'teal', 'purple', 'blue', 'emerald', 'orange', 'rose', 'indigo', 'gray'
];

export default function UserManagementPage() {
  const [mainTab, setMainTab] = useState('users');
  const { departments, getDeptColor } = useDepartments();
  const { 
    roles, 
    loading: rolesLoading, 
    createRole, 
    updateRole, 
    deleteRole 
  } = useRoles();

  // User list state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // User Filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // User Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // User Form states
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

  // Role Management State
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState('');

  const [roleForm, setRoleForm] = useState({
    role_name: '',
    display_name: '',
    description: '',
    color: 'teal',
    can_upload: false,
    can_delete: false,
    can_manage_users: false,
    can_manage_departments: false,
    can_manage_settings: false,
  });

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

  // User actions
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
        role: roles[0]?.role_name || 'employee',
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
      display_name: user.display_name,
      role: user.role,
      department: user.department || departments[0]?.name || 'General',
      is_active: user.is_active
    });
    setFormError('');
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
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
    setActionLoading(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      toast.success('User account deactivated');
      setDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to deactivate account');
    } finally {
      setActionLoading(false);
    }
  };

  // Role actions
  const handleTogglePermission = async (role, permissionKey) => {
    if (role.role_name === 'admin' && permissionKey === 'can_upload') {
      toast.error('Administrator upload permission is required');
      return;
    }
    const currentVal = Boolean(role[permissionKey]);
    const updatedVal = !currentVal;
    try {
      await updateRole(role.role_name, { [permissionKey]: updatedVal });
      const label = permissionKey.replace('can_', '').replace(/_/g, ' ');
      toast.success(`${role.display_name}: ${label} ${updatedVal ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update role permission');
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!roleForm.role_name.trim() || !roleForm.display_name.trim()) {
      setRoleError('Role identifier and display name are required');
      return;
    }
    try {
      setRoleSubmitting(true);
      setRoleError('');
      await createRole({
        role_name: roleForm.role_name.trim().toLowerCase().replace(/\s+/g, '_'),
        display_name: roleForm.display_name.trim(),
        description: roleForm.description.trim(),
        color: roleForm.color || 'teal',
        can_upload: Boolean(roleForm.can_upload),
        can_delete: Boolean(roleForm.can_delete),
        can_manage_users: Boolean(roleForm.can_manage_users),
        can_manage_departments: Boolean(roleForm.can_manage_departments),
        can_manage_settings: Boolean(roleForm.can_manage_settings),
      });
      toast.success(`Role '${roleForm.display_name}' created successfully`);
      setAddRoleModalOpen(false);
      setRoleForm({
        role_name: '',
        display_name: '',
        description: '',
        color: 'teal',
        can_upload: false,
        can_delete: false,
        can_manage_users: false,
        can_manage_departments: false,
        can_manage_settings: false,
      });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create custom role';
      setRoleError(msg);
      toast.error(msg);
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleOpenEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      role_name: role.role_name,
      display_name: role.display_name,
      description: role.description || '',
      color: role.color || 'teal',
      can_upload: Boolean(role.can_upload),
      can_delete: Boolean(role.can_delete),
      can_manage_users: Boolean(role.can_manage_users),
      can_manage_departments: Boolean(role.can_manage_departments),
      can_manage_settings: Boolean(role.can_manage_settings),
    });
    setRoleError('');
    setEditRoleModalOpen(true);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      setRoleSubmitting(true);
      setRoleError('');
      await updateRole(selectedRole.role_name, {
        display_name: roleForm.display_name.trim(),
        description: roleForm.description.trim(),
        color: roleForm.color,
        can_upload: Boolean(roleForm.can_upload),
        can_delete: Boolean(roleForm.can_delete),
        can_manage_users: Boolean(roleForm.can_manage_users),
        can_manage_departments: Boolean(roleForm.can_manage_departments),
        can_manage_settings: Boolean(roleForm.can_manage_settings),
      });
      toast.success(`Role '${roleForm.display_name}' updated`);
      setEditRoleModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update role';
      setRoleError(msg);
      toast.error(msg);
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || !selectedRole.is_custom) return;
    try {
      setRoleSubmitting(true);
      await deleteRole(selectedRole.role_name);
      toast.success(`Role '${selectedRole.display_name}' deleted`);
      setDeleteRoleModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete role');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.department?.toLowerCase().includes(term)
    );
  });

  const userColumns = [
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
      render: (u) => {
        const rObj = roles.find((r) => r.role_name === u.role);
        return (
          <Badge 
            color={rObj?.color || 'teal'} 
            size="sm"
          >
            {rObj?.display_name || u.role}
          </Badge>
        );
      }
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
      {/* Page Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">User Directory & Roles</h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1">
            Provision user accounts, configure role permissions, and customize institutional access controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TabSwitcher 
            tabs={[
              { value: 'users', label: 'User Directory', icon: Users },
              { value: 'roles', label: 'Roles & Permissions', icon: Shield }
            ]}
            activeTab={mainTab}
            onChange={setMainTab}
          />
          {mainTab === 'users' ? (
            <Button 
              variant="primary" 
              icon={UserPlus} 
              size="sm"
              onClick={() => {
                setFormError('');
                setAddModalOpen(true);
              }}
            >
              Add User
            </Button>
          ) : (
            <Button 
              variant="primary" 
              icon={Plus} 
              size="sm"
              onClick={() => {
                setRoleError('');
                setRoleForm({
                  role_name: '',
                  display_name: '',
                  description: '',
                  color: 'teal',
                  can_upload: false,
                  can_delete: false,
                  can_manage_users: false,
                  can_manage_departments: false,
                  can_manage_settings: false,
                });
                setAddRoleModalOpen(true);
              }}
            >
              Add Custom Role
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: USER ACCOUNTS */}
      {mainTab === 'users' && (
        <>
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
                  {roles.map((r) => (
                    <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
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
                columns={userColumns}
                data={filteredUsers}
              />
            </Card>
          )}
        </>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {mainTab === 'roles' && (
        <div className="space-y-4">
          <Card className="p-4 bg-teal/5 border-teal/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal/15 text-teal shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                  Role-Based Access Control & Upload Permissions
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Admins can toggle upload controls for any role below (e.g. Lecturer, Staff, or custom roles). Roles with upload access can publish documents directly.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Can Upload</th>
                    <th className="px-4 py-3 text-center">Can Delete</th>
                    <th className="px-4 py-3 text-center">Manage Users</th>
                    <th className="px-4 py-3 text-center">Manage Depts</th>
                    <th className="px-4 py-3 text-center">Settings</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {roles.map((r) => (
                    <tr key={r.role_name} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Badge color={r.color || 'teal'} size="sm">
                            {r.display_name}
                          </Badge>
                          {r.is_custom ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">
                              Custom
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-[var(--color-text-secondary)] font-medium">
                              Built-in
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 max-w-xs">
                          {r.description}
                        </p>
                      </td>

                      {/* Can Upload Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, 'can_upload')}
                          disabled={r.role_name === 'admin'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.can_upload ? 'bg-teal' : 'bg-[var(--color-border)]'
                          } ${r.role_name === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={r.can_upload ? 'Upload allowed: Click to disable' : 'Upload disabled: Click to enable'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              r.can_upload ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Can Delete Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, 'can_delete')}
                          disabled={r.role_name === 'admin'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.can_delete ? 'bg-teal' : 'bg-[var(--color-border)]'
                          } ${r.role_name === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={r.can_delete ? 'Delete allowed' : 'Delete disabled'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              r.can_delete ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Can Manage Users Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, 'can_manage_users')}
                          disabled={r.role_name === 'admin'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.can_manage_users ? 'bg-teal' : 'bg-[var(--color-border)]'
                          } ${r.role_name === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              r.can_manage_users ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Can Manage Depts Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, 'can_manage_departments')}
                          disabled={r.role_name === 'admin'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.can_manage_departments ? 'bg-teal' : 'bg-[var(--color-border)]'
                          } ${r.role_name === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              r.can_manage_departments ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Can Manage Settings Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(r, 'can_manage_settings')}
                          disabled={r.role_name === 'admin'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            r.can_manage_settings ? 'bg-teal' : 'bg-[var(--color-border)]'
                          } ${r.role_name === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              r.can_manage_settings ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditRole(r)}
                            className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-teal transition-colors"
                            title="Edit Role Details"
                          >
                            <Edit2 size={14} />
                          </button>
                          {r.is_custom ? (
                            <button
                              onClick={() => {
                                setSelectedRole(r);
                                setDeleteRoleModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                              title="Delete Custom Role"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="p-1.5 text-[var(--color-text-secondary)]/40" title="Built-in role cannot be deleted">
                              <Lock size={13} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
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
                {roles.map((r) => (
                  <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
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
                {roles.map((r) => (
                  <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
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

      {/* Deactivate User Confirmation Modal */}
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

      {/* Add Custom Role Modal */}
      <Modal
        isOpen={addRoleModalOpen}
        onClose={() => setAddRoleModalOpen(false)}
        title="Create Custom Institutional Role"
        size="md"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          {roleError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
              {roleError}
            </div>
          )}

          <div>
            <label className="label">Role Title / Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Teaching Assistant, Research Fellow"
              value={roleForm.display_name}
              onChange={(e) => {
                const name = e.target.value;
                setRoleForm({
                  ...roleForm,
                  display_name: name,
                  role_name: roleForm.role_name ? roleForm.role_name : name.toLowerCase().replace(/[^a-z0-9]/g, '_')
                });
              }}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Role Identifier (Key) *</label>
            <input
              type="text"
              required
              placeholder="e.g. teaching_assistant"
              value={roleForm.role_name}
              onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="input-field font-mono text-xs py-2"
            />
            <span className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 block">
              Unique identifier used in access control checks.
            </span>
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              placeholder="e.g. Graduate assistants with grading and syllabus upload rights"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Badge Color</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRoleForm({ ...roleForm, color: c })}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-all ${
                    roleForm.color === c
                      ? 'border-teal bg-teal/15 text-teal font-bold'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Granted Permissions</label>
            <div className="space-y-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_upload}
                  onChange={(e) => setRoleForm({ ...roleForm, can_upload: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span className="font-semibold text-teal">Can Upload Documents</span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">— Publish documents to knowledge base</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_delete}
                  onChange={(e) => setRoleForm({ ...roleForm, can_delete: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Delete Documents</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_manage_users}
                  onChange={(e) => setRoleForm({ ...roleForm, can_manage_users: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Manage Users</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_manage_departments}
                  onChange={(e) => setRoleForm({ ...roleForm, can_manage_departments: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Manage Departments</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={roleSubmitting}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        title={`Edit Role: ${selectedRole?.display_name || ''}`}
        size="md"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          {roleError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500">
              {roleError}
            </div>
          )}

          <div>
            <label className="label">Role Title / Display Name *</label>
            <input
              type="text"
              required
              value={roleForm.display_name}
              onChange={(e) => setRoleForm({ ...roleForm, display_name: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input
              type="text"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="input-field text-xs py-2"
            />
          </div>

          <div>
            <label className="label">Badge Color</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRoleForm({ ...roleForm, color: c })}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-all ${
                    roleForm.color === c
                      ? 'border-teal bg-teal/15 text-teal font-bold'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2">Granted Permissions</label>
            <div className="space-y-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_upload}
                  disabled={selectedRole?.role_name === 'admin'}
                  onChange={(e) => setRoleForm({ ...roleForm, can_upload: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span className="font-semibold text-teal">Can Upload Documents</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_delete}
                  disabled={selectedRole?.role_name === 'admin'}
                  onChange={(e) => setRoleForm({ ...roleForm, can_delete: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Delete Documents</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_manage_users}
                  disabled={selectedRole?.role_name === 'admin'}
                  onChange={(e) => setRoleForm({ ...roleForm, can_manage_users: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Manage Users</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_manage_departments}
                  disabled={selectedRole?.role_name === 'admin'}
                  onChange={(e) => setRoleForm({ ...roleForm, can_manage_departments: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Manage Departments</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleForm.can_manage_settings}
                  disabled={selectedRole?.role_name === 'admin'}
                  onChange={(e) => setRoleForm({ ...roleForm, can_manage_settings: e.target.checked })}
                  className="rounded border-[var(--color-border)] text-teal focus:ring-teal"
                />
                <span>Can Manage Settings</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={roleSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Custom Role Confirmation Modal */}
      <Modal
        isOpen={deleteRoleModalOpen}
        onClose={() => setDeleteRoleModalOpen(false)}
        title="Delete Custom Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Are you sure you want to delete the custom role <strong className="text-[var(--color-text)]">{selectedRole?.display_name}</strong>? Users assigned to this role may need to be reassigned.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={() => setDeleteRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteRole} loading={roleSubmitting}>
              Delete Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
