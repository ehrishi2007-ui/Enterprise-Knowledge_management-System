import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, Search, Sun, Moon, Sparkles } from 'lucide-react';

export default function TopBar({ onMenuClick, pageTitle }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/employee/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile trigger & Page Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] focus:outline-none"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 className="text-base md:text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
            {pageTitle || 'Knowledge Management System'}
          </h2>
        </div>
      </div>

      {/* Right: Search, Theme Toggle, User Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Quick Search */}
        <div className="relative hidden sm:block w-56 md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search documents or policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal placeholder:text-[var(--color-text-secondary)] transition-all"
          />
        </div>

        {/* Quick Ask AI button */}
        <button
          onClick={() => navigate('/employee/chat')}
          className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-teal hover:text-white bg-teal/10 hover:bg-teal px-3 py-1.5 rounded-full border border-teal/20 transition-all shadow-sm"
          title="Start AI Chat"
        >
          <Sparkles size={14} />
          <span>Ask AI</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark/Light Mode"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] transition-colors"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-slate2" />
          )}
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--color-border)]">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-[var(--color-text)] leading-tight truncate max-w-[120px]">
              {user?.display_name || 'Guest'}
            </span>
            <span className="text-[10px] uppercase font-bold text-teal leading-tight mt-0.5">
              {user?.role || 'User'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
