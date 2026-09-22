import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Mail, Lock, LogIn, AlertCircle, Shield, User, ArrowRight, 
  GraduationCap, Sparkles, CheckCircle2, Sun, Moon 
} from 'lucide-react';
import { Button } from '../components/ui';

export default function Login() {
  const [roleMode, setRoleMode] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginWithDemoToken, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (email.trim() && password.trim()) {
        await login(email.trim(), password);
        // Auth state listener in AuthContext handles redirect via useEffect
      } else {
        // Fallback to one-click demo token
        loginWithDemoToken(roleMode);
        navigate(roleMode === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials or use Instant Demo.');
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (role) => {
    loginWithDemoToken(role);
    navigate(role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 relative transition-colors duration-200">
      {/* Theme Toggle Top-Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] shadow-sm transition-all"
        title="Toggle Theme"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate2" />}
      </button>

      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-fade-in">
        {/* Left Side: Modern Navy & Teal Brand Showcase */}
        <div className="bg-navy p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-teal/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-teal rounded-xl flex items-center justify-center shadow-lg shadow-teal/30">
                <GraduationCap size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">EKMS</h1>
                <p className="text-xs uppercase tracking-widest text-teal-300 font-medium">Knowledge Hub v2.0</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
              Unified Knowledge Management for Organizations & Campuses
            </h2>
            <p className="text-sm text-ice-300 mb-8 leading-relaxed">
              Retrieve policies, circulars, research manuals, and reports in seconds with verified RAG source citations.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-3.5">
              {[
                { title: 'Open-Ended Departments', desc: 'Custom departments for enterprise teams or academic faculties' },
                { title: 'RAG AI Assistant', desc: 'Grounded responses with document and page citations' },
                { title: 'Multi-Modal Ingestion', desc: 'Digital PDFs, scanned OCR documents, and hybrid charts' },
                { title: 'Database-Level RBAC', desc: 'Row-Level Security protecting sensitive documents' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-left">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-teal/20 text-teal-300 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">{item.title}</h3>
                    <p className="text-[11px] text-ice-300">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate2">
            <span>Enterprise & Academic Edition</span>
            <span>Local & Cloud Ready</span>
          </div>
        </div>
        
        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Sign In</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Select access role or enter your credentials.
            </p>
          </div>

          {/* Quick Instant Demo Access Buttons */}
          <div className="p-3.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
            <span className="block text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              ⚡ Instant One-Click Demo Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal text-white hover:bg-teal-500 shadow-sm transition-all"
              >
                <Shield size={14} />
                <span>Admin Demo</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('employee')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-teal transition-all"
              >
                <User size={14} />
                <span>Staff/Student Demo</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <hr className="w-full border-[var(--color-border)]" />
            <span className="absolute bg-[var(--color-surface)] px-3 text-[11px] text-[var(--color-text-secondary)] uppercase font-medium">
              Or with credentials
            </span>
          </div>

          {/* Admin / Employee Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setRoleMode('admin')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                roleMode === 'admin'
                  ? 'bg-[var(--color-surface)] text-teal font-semibold shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <Shield size={14} />
              <span>Administrator</span>
            </button>

            <button
              type="button"
              onClick={() => setRoleMode('employee')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                roleMode === 'employee'
                  ? 'bg-[var(--color-surface)] text-teal font-semibold shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <User size={14} />
              <span>Staff / Member</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-500 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-9 text-sm"
                  placeholder={roleMode === 'admin' ? 'admin@demo.org' : 'member@demo.org'}
                />
              </div>
            </div>

            <div>
              <label className="label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-9 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="w-full py-2.5 shadow-md shadow-teal/20"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In as {roleMode === 'admin' ? 'Administrator' : 'Staff / Member'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
