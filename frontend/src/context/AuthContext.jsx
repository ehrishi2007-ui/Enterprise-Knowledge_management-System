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
    const token = role === 'employee' ? 'demo-token-employee' : 'demo-token-admin';
    localStorage.setItem('supabase_token', token);
    setUser({
      id: role === 'employee' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
      email: role === 'employee' ? 'employee@demo.org' : 'admin@demo.org',
      display_name: role === 'employee' ? 'Alex Morgan' : 'Rachel Collins',
      role: role,
      department: role === 'employee' ? 'Engineering' : 'Operations',
      is_active: true,
    });
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
