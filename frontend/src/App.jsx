import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

// Pages
import Login from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import ViewDocumentsPage from './pages/ViewDocumentsPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import DepartmentDetailsPage from './pages/DepartmentDetailsPage';
import BookmarksPage from './pages/BookmarksPage';
import FeedbackPage from './pages/FeedbackPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Derive title from pathname
  const getPageTitle = (path) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) return 'Knowledge Hub';
    const page = parts[parts.length - 1];
    const titles = {
      dashboard: 'Overview Dashboard',
      chat: 'AI Knowledge Assistant',
      search: 'Document & Knowledge Search',
      documents: 'Document Repository',
      bookmarks: 'Saved Bookmarks',
      users: 'User & Access Management',
      departments: 'Departments & Units',
      feedback: 'Feedback & Analytics',
      settings: 'System Configuration',
    };
    return titles[page] || (page.charAt(0).toUpperCase() + page.slice(1));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar 
          onMenuClick={() => setMobileOpen(true)} 
          pageTitle={getPageTitle(location.pathname)}
        />
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Loading EKMS...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${user.role}/dashboard`} replace />} />
      
      {/* Protected Admin Routes */}
      <Route 
        path="/admin/*" 
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role !== 'admin' ? (
            <Navigate to="/employee/dashboard" replace />
          ) : (
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="documents" element={<DocumentManagementPage />} />
                <Route path="departments" element={<DepartmentDetailsPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AppLayout>
          )
        } 
      />

      {/* Protected Employee Routes (Accessible to both Employee and Admin) */}
      <Route 
        path="/employee/*" 
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <AppLayout>
              <Routes>
                <Route path="dashboard" element={<EmployeeDashboardPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="documents" element={<ViewDocumentsPage />} />
                <Route path="bookmarks" element={<BookmarksPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AppLayout>
          )
        } 
      />

      {/* Default Fallback Routes */}
      <Route 
        path="/" 
        element={
          user 
            ? <Navigate to={`/${user.role}/dashboard`} replace /> 
            : <Navigate to="/login" replace />
        } 
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
              }
            }}
          />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
