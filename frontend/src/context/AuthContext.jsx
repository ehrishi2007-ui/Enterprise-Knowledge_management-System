import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext();

export const DEMO_ADMIN = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@hitam.edu.in',
  display_name: 'Rachel Collins',
  role: 'admin',
  department: 'Operations',
  avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
};

export const DEMO_EMPLOYEE = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'employee@hitam.edu.in',
  display_name: 'Alex Morgan',
  role: 'employee',
  department: 'Engineering',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ekms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password, roleMode = 'admin') => {
    setLoading(true);
    try {
      // Attempt real Supabase login if configured
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.session) {
          localStorage.setItem('supabase_token', data.session.access_token);
          // Fetch user profile from FastAPI backend
          const res = await api.get('/users/me');
          const loggedInUser = res.data;
          setUser(loggedInUser);
          localStorage.setItem('ekms_user', JSON.stringify(loggedInUser));
          setLoading(false);
          return { success: true, user: loggedInUser };
        }
      }
    } catch (e) {
      console.warn("Supabase auth not connected or failed, using demo role switch mode", e);
    }

    // Role-based demo profile fallback
    const baseUser = roleMode === 'admin' ? DEMO_ADMIN : DEMO_EMPLOYEE;
    const demoUser = {
      ...baseUser,
      email: email.trim() || baseUser.email,
      display_name: email.trim() ? (email.split('@')[0].replace('.', ' ') || baseUser.display_name) : baseUser.display_name,
      role: roleMode
    };

    setUser(demoUser);
    localStorage.setItem('ekms_user', JSON.stringify(demoUser));
    localStorage.setItem('supabase_token', roleMode === 'admin' ? 'demo-token-admin' : 'demo-token-employee');
    setLoading(false);
    return { success: true, user: demoUser };
  };

  const switchRole = (newRole) => {
    const updatedUser = newRole === 'admin' ? DEMO_ADMIN : DEMO_EMPLOYEE;
    setUser(updatedUser);
    localStorage.setItem('ekms_user', JSON.stringify(updatedUser));
    localStorage.setItem('supabase_token', newRole === 'admin' ? 'demo-token-admin' : 'demo-token-employee');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ekms_user');
    localStorage.removeItem('supabase_token');
    try {
      supabase.auth.signOut();
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
