import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, Search, User } from 'lucide-react';

export default function TopBar({ onMenuClick, pageTitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (user?.role === 'admin') {
        navigate(`/admin/documents?search=${encodeURIComponent(searchQuery)}`);
      } else {
        navigate(`/employee/search?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <header className="h-14 bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-20 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden text-slate-400 hover:text-slate-50 focus:outline-none"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-slate-50 font-semibold">{pageTitle || 'HITAM EKMS'}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-slate-900 border border-slate-700 text-slate-50 text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 placeholder:text-slate-500"
          />
        </div>
        
        <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-50 leading-tight">{user?.display_name || 'User'}</span>
            <span className="text-[10px] uppercase font-semibold text-orange-400 leading-tight bg-orange-500/10 px-1.5 py-0.5 rounded mt-0.5">{user?.role}</span>
          </div>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
              {user?.display_name ? (
                <span className="text-slate-50 text-xs font-medium">
                  {user.display_name.charAt(0)}
                </span>
              ) : (
                <User size={16} className="text-slate-400" />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
