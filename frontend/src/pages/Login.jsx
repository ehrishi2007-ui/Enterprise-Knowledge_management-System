import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Shield, User, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [roleMode, setRoleMode] = useState('admin'); // 'admin' | 'employee'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, allow auto-redirect or quick switch
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const targetEmail = email.trim() || (roleMode === 'admin' ? 'admin@hitam.edu.in' : 'employee@hitam.edu.in');
    
    try {
      const res = await login(targetEmail, password || 'password123', roleMode);
      if (res?.success) {
        navigate(roleMode === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
      } else {
        setError(res?.error || 'Invalid credentials');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden shadow-2xl p-0 border-slate-700">
        {/* Left Side: Branding & Info */}
        <div className="bg-slate-850 p-8 md:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-700 space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-4xl font-extrabold text-white">H</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50 tracking-tight">HITAM EKMS</h1>
            <p className="text-xs uppercase tracking-widest text-orange-400 font-semibold mt-1">
              Knowledge Hub & AI Assistant
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Enterprise Knowledge Management System powered by Retrieval-Augmented Generation (RAG) for academic & institutional resources.
          </p>
        </div>
        
        {/* Right Side: Login Form with Role Selection */}
        <div className="p-8 md:p-10 bg-slate-800 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-50">Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">Choose your portal access role and enter credentials.</p>
          </div>

          {/* Admin / Employee Role Switcher Tab */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Portal Role:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setRoleMode('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  roleMode === 'admin'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Shield size={16} />
                <span>Admin Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleMode('employee')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  roleMode === 'employee'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <User size={16} />
                <span>Employee Portal</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500"
                  placeholder={roleMode === 'admin' ? 'admin@hitam.edu.in' : 'employee@hitam.edu.in'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/10"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Enter as {roleMode === 'admin' ? 'Admin' : 'Employee'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center border-t border-slate-700/60">
            <span className="text-[11px] text-slate-400">
              Entering demo access mode as <strong className="text-orange-400 capitalize">{roleMode}</strong>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
