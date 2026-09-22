import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, FileText, Building2, MessageSquare, 
  Settings, Bot, Search, BookOpen, Bookmark, LogOut, 
  ChevronLeft, ChevronRight, GraduationCap
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();

  const adminLinks = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'AI Chat', to: '/employee/chat', icon: Bot },
    { name: 'Search', to: '/employee/search', icon: Search },
    { name: 'Document Management', to: '/admin/documents', icon: FileText },
    { name: 'User Management', to: '/admin/users', icon: Users },
    { name: 'Departments', to: '/admin/departments', icon: Building2 },
    { name: 'Feedback & Audits', to: '/admin/feedback', icon: MessageSquare },
    { name: 'System Settings', to: '/admin/settings', icon: Settings },
  ];

  const employeeLinks = [
    { name: 'Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'AI Knowledge Chat', to: '/employee/chat', icon: Bot },
    { name: 'Search Knowledge', to: '/employee/search', icon: Search },
    { name: 'Document Repository', to: '/employee/documents', icon: BookOpen },
    { name: 'Saved Bookmarks', to: '/employee/bookmarks', icon: Bookmark },
    { name: 'Feedback & Help', to: '/employee/feedback', icon: MessageSquare },
    { name: 'Preferences', to: '/employee/settings', icon: Settings },
  ];

  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  const content = (
    <div className={`flex flex-col h-full bg-navy text-ice-100 border-r border-navy-800 transition-all duration-300 shadow-xl ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Brand Header */}
      <div className="flex items-center h-16 shrink-0 px-4 border-b border-navy-800/80">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal text-white font-bold shadow-md shadow-teal/20 shrink-0">
          <GraduationCap size={20} />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden whitespace-nowrap">
            <h1 className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
              <span>EKMS</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-teal/20 text-teal-200">v2.0</span>
            </h1>
            <p className="text-slate2 text-xs truncate">Knowledge Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1.5 overflow-y-auto px-2.5">
        {!collapsed && (
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate2">
            {user?.role === 'admin' ? 'Administration' : 'Knowledge Portal'}
          </div>
        )}
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
              <Icon size={19} className="shrink-0 transition-transform group-hover:scale-105" />
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
                  {user?.role || 'employee'}
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
            <LogOut size={17} />
            {!collapsed && <span className="ml-2 text-xs font-medium">Sign Out</span>}
          </button>
          
          <button
            onClick={onToggle}
            aria-label="Toggle Sidebar"
            className="hidden md:flex items-center justify-center text-slate2 hover:text-white hover:bg-navy-800 p-2 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
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
