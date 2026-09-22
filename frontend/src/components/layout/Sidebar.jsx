import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, FileText, Building2, MessageSquare, 
  Settings, Bot, Search, BookOpen, Bookmark, LogOut, 
  ChevronLeft, ChevronRight
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();

  const adminLinks = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', to: '/admin/users', icon: Users },
    { name: 'Documents', to: '/admin/documents', icon: FileText },
    { name: 'Departments', to: '/admin/departments', icon: Building2 },
    { name: 'Feedback', to: '/admin/feedback', icon: MessageSquare },
    { name: 'Settings', to: '/admin/settings', icon: Settings },
  ];

  const employeeLinks = [
    { name: 'Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'AI Chat', to: '/employee/chat', icon: Bot },
    { name: 'Search', to: '/employee/search', icon: Search },
    { name: 'Documents', to: '/employee/documents', icon: BookOpen },
    { name: 'Bookmarks', to: '/employee/bookmarks', icon: Bookmark },
    { name: 'Feedback', to: '/employee/feedback', icon: MessageSquare },
    { name: 'Settings', to: '/employee/settings', icon: Settings },
  ];

  const links = user?.role === 'admin' ? adminLinks : employeeLinks;

  const content = (
    <div className={`flex flex-col h-full bg-slate-850 border-r border-slate-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex items-center h-16 shrink-0 px-4">
        <div className="flex items-center justify-center bg-orange-500 rounded p-1">
          <span className="text-white font-bold text-xl leading-none">H</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden whitespace-nowrap">
            <h1 className="text-slate-50 font-bold tracking-tight">HITAM EKMS</h1>
            <p className="text-slate-400 text-xs">Knowledge Hub</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-2">
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
                `flex items-center rounded-md px-2.5 py-2.5 transition-colors group ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-500 rounded-l-none'
                    : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800'
                }`
              }
              title={collapsed ? link.name : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden">
                  {link.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center mb-3 px-1">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <span className="text-slate-50 text-xs font-medium">
                {user?.display_name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="ml-3 overflow-hidden whitespace-nowrap">
              <p className="text-sm font-medium text-slate-50 truncate">{user?.display_name || 'User'}</p>
              <span className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold">{user?.role}</span>
            </div>
          )}
        </div>
        <div className={`flex ${collapsed ? 'flex-col gap-2' : 'flex-row gap-2'}`}>
          <button 
            onClick={logout}
            title={collapsed ? "Sign Out" : undefined}
            className={`flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 p-2 rounded-md transition-colors ${!collapsed ? 'flex-1' : ''}`}
          >
            <LogOut size={18} />
            {!collapsed && <span className="ml-2 text-sm font-medium">Sign Out</span>}
          </button>
          
          <button
            onClick={onToggle}
            className="hidden md:flex items-center justify-center text-slate-400 hover:text-slate-50 hover:bg-slate-800 p-2 rounded-md transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar container */}
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
