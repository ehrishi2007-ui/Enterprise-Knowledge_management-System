import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

let cachedRoles = null;

const DEFAULT_FALLBACK_ROLES = [
  {
    role_name: 'admin',
    display_name: 'Administrator',
    description: 'Full institutional and administrative access',
    can_upload: true,
    can_delete: true,
    can_manage_users: true,
    can_manage_departments: true,
    can_manage_settings: true,
    is_custom: false,
    color: 'olive'
  },
  {
    role_name: 'lecturer',
    display_name: 'Lecturer / Faculty',
    description: 'Academic faculty with document publishing rights',
    can_upload: true,
    can_delete: false,
    can_manage_users: false,
    can_manage_departments: false,
    can_manage_settings: false,
    is_custom: false,
    color: 'stone'
  },
  {
    role_name: 'student',
    display_name: 'Student',
    description: 'Student access to learning materials and query assistant',
    can_upload: false,
    can_delete: false,
    can_manage_users: false,
    can_manage_departments: false,
    can_manage_settings: false,
    is_custom: false,
    color: 'olive'
  },
  {
    role_name: 'employee',
    display_name: 'Employee / Staff',
    description: 'General institutional staff member',
    can_upload: false,
    can_delete: false,
    can_manage_users: false,
    can_manage_departments: false,
    can_manage_settings: false,
    is_custom: false,
    color: 'stone'
  },
  {
    role_name: 'staff',
    display_name: 'Support Staff',
    description: 'Departmental support staff with upload access',
    can_upload: true,
    can_delete: false,
    can_manage_users: false,
    can_manage_departments: false,
    can_manage_settings: false,
    is_custom: false,
    color: 'olive'
  }
];

export function useRoles() {
  const [roles, setRoles] = useState(cachedRoles || DEFAULT_FALLBACK_ROLES);
  const [loading, setLoading] = useState(!cachedRoles);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      if (Array.isArray(res.data) && res.data.length > 0) {
        cachedRoles = res.data;
        setRoles(res.data);
      }
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch roles from API, using defaults:', err);
      setError(err);
      if (!cachedRoles) {
        setRoles(DEFAULT_FALLBACK_ROLES);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refresh = () => {
    cachedRoles = null;
    fetchRoles();
  };

  const createRole = async (newRoleData) => {
    const res = await api.post('/roles', newRoleData);
    refresh();
    return res.data;
  };

  const updateRole = async (roleName, updateData) => {
    const res = await api.put(`/roles/${roleName}`, updateData);
    refresh();
    return res.data;
  };

  const deleteRole = async (roleName) => {
    const res = await api.delete(`/roles/${roleName}`);
    refresh();
    return res.data;
  };

  const hasUploadPermission = (roleName) => {
    if (!roleName) return false;
    const r = roles.find((item) => item.role_name.toLowerCase() === roleName.toLowerCase());
    return r ? Boolean(r.can_upload) : roleName.toLowerCase() === 'admin';
  };

  const roleNames = roles.map((r) => r.role_name);

  return {
    roles,
    roleNames,
    loading,
    error,
    refresh,
    createRole,
    updateRole,
    deleteRole,
    hasUploadPermission
  };
}
