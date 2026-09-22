import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { DEFAULT_DEPT_COLORS } from '../lib/constants';

let cachedDepartments = null;

export function useDepartments() {
  const [departments, setDepartments] = useState(cachedDepartments || []);
  const [loading, setLoading] = useState(!cachedDepartments);
  const [error, setError] = useState(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/departments');
      const depts = res.data.map(d => ({
        ...d,
        color: d.color || DEFAULT_DEPT_COLORS[d.name] || '#599692',
      }));
      cachedDepartments = depts;
      setDepartments(depts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError(err);
      // Use fallback if cache is empty
      if (!cachedDepartments) {
        const fallback = Object.entries(DEFAULT_DEPT_COLORS).slice(0, 5).map(([name, color], i) => ({
          id: `fallback-${i}`,
          name,
          color,
          is_active: true,
        }));
        setDepartments(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const refresh = () => {
    cachedDepartments = null;
    fetchDepartments();
  };

  // Helper: get department names as a simple string array
  const departmentNames = departments.map(d => d.name);

  // Helper: get color for a department name
  const getDeptColor = (name) => {
    const dept = departments.find(d => d.name === name);
    return dept?.color || DEFAULT_DEPT_COLORS[name] || '#599692';
  };

  return { departments, departmentNames, loading, error, refresh, getDeptColor };
}
