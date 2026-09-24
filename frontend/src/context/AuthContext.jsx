import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadProfile(session);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session);
      }
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (session) => {
    try {
      // Store token for API calls
      localStorage.setItem('supabase_token', session.access_token);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          ...profile,
        });
      } else {
        // Fallback if profile doesn't exist yet
        setUser({
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          role: session.user.user_metadata?.role || 'employee',
          department: session.user.user_metadata?.department || 'General',
          is_active: true,
        });
      }
    } catch (err) {
      console.error('Profile load error:', err);
      setUser({
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.email?.split('@')[0] || 'User',
        role: 'employee',
        department: 'General',
        is_active: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const loginWithDemoToken = (role = 'admin') => {
    let token = 'demo-token-admin';
    let userObj = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@demo.org',
      display_name: 'Rachel Collins',
      role: 'admin',
      department: 'Operations',
      is_active: true,
    };

    if (role === 'lecturer') {
      token = 'demo-token-lecturer';
      userObj = {
        id: 'd946a8cb-c9d6-42ef-bbd1-15fb67dffcf7',
        email: 'lecturer@demo.edu',
        display_name: 'Prof. Alan Turing',
        role: 'lecturer',
        department: 'Engineering',
        is_active: true,
      };
    } else if (role === 'student') {
      token = 'demo-token-student';
      userObj = {
        id: 'deee83ee-5369-4464-862b-7366c5f74b70',
        email: 'student@demo.edu',
        display_name: 'Sam Student',
        role: 'student',
        department: 'Engineering',
        is_active: true,
      };
    } else if (role === 'employee' || role === 'staff') {
      token = 'demo-token-employee';
      userObj = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'employee@demo.org',
        display_name: 'Alex Morgan',
        role: 'employee',
        department: 'Engineering',
        is_active: true,
      };
    }

    localStorage.setItem('supabase_token', token);
    setUser(userObj);
  };

  const logout = async () => {
    localStorage.removeItem('supabase_token');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Ignore errors on signout
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithDemoToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
