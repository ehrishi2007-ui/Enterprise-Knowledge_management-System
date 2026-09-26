import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/constants';
import { 
  LayoutDashboard, Users, FileText, 
  Settings, Bot, Search, BookOpen, Bookmark, LogOut, 
  ChevronLeft, ChevronRight, GraduationCap, BarChart2
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();

  const adminLinks = [
    { name: 'Dashboard',   to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Ask AI',      to: '/employee/chat',   icon: Bot },
    { name: 'Search',      to: '/employee/search', icon: Search },
    { name: 'Documents',   to: '/admin/documents', icon: FileText },
    { name: 'Members',     to: '/admin/users',     icon: Users },
    { name: 'AI Metrics',  to: '/admin/metrics',   icon: BarChart2 },
    { name: 'Settings',    to: '/admin/settings',  icon: Settings },
  ];

  const employeeLinks = [
    { name: 'Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'Ask AI', to: '/employee/chat', icon: Bot },
    { name: 'Search', to: '/employee/search', icon: Search },
    { name: 'Documents', to: '/employee/documents', icon: BookOpen },
    { name: 'Saved Bookmarks', to: '/employee/bookmarks', icon: Bookmark },
    { name: 'Preferences', to: '/employee/settings', icon: Settings },
  ];

  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  const content = (
    <div className={`flex flex-col h-full bg-navy text-ice-100 border-r border-navy-800 transition-all duration-300 shadow-xl ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Brand Header */}
      <div className="flex items-center h-16 shrink-0 px-4 border-b border-navy-800/80">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal text-white font-bold shadow-md shadow-teal/20 shrink-0">
          <GraduationCap size={20} />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden whitespace-nowrap">
            <h1 className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
              <span>Knowledge Hub</span>
            </h1>
            <p className="text-slate2 text-[11px] truncate">Document & AI Portal</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1.5 overflow-y-auto px-2.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => {
                if (window.innerWidth < 768 && onMobileClose) {
                  onMobileClose();
                }
              }}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 transition-all group ${
                  isActive
                    ? 'bg-teal text-white shadow-sm shadow-teal/30 font-medium'
                    : 'text-ice-300 hover:text-white hover:bg-navy-800/60'
                }`
              }
              title={collapsed ? link.name : undefined}
            >
              <Icon size={18} className="shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && (
                <span className="ml-3 text-sm whitespace-nowrap overflow-hidden truncate">
                  {link.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Footer Actions */}
      <div className="p-3 border-t border-navy-800/80 bg-navy-950/40">
        <div className="flex items-center mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/40 flex items-center justify-center shrink-0 text-teal-300 font-semibold text-xs">
            {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden whitespace-nowrap">
              <p className="text-sm font-medium text-white truncate">{user?.display_name || 'User'}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-teal-300 font-bold bg-teal/15 px-1.5 py-0.5 rounded">
                  {ROLE_CONFIG[user?.role]?.label || user?.role || 'Member'}
                </span>
                {user?.department && (
                  <span className="text-[10px] text-slate2 truncate">
                    • {user.department}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`flex ${collapsed ? 'flex-col gap-2' : 'flex-row gap-2'}`}>
          <button 
            onClick={logout}
            title={collapsed ? "Sign Out" : undefined}
            className={`flex items-center justify-center text-slate2 hover:text-red-400 hover:bg-navy-800 p-2 rounded-lg transition-colors ${!collapsed ? 'flex-1' : ''}`}
          >
            <LogOut size={16} />
            {!collapsed && <span className="ml-2 text-xs font-medium">Sign Out</span>}
          </button>
          
          <button
            onClick={onToggle}
            aria-label="Toggle Sidebar"
            className="hidden md:flex items-center justify-center text-slate2 hover:text-white hover:bg-navy-800 p-2 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      
      <div 
        className={`fixed top-0 bottom-0 left-0 z-50 md:sticky h-screen transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </div>
    </>
  );
}
