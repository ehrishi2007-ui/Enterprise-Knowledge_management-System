import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
    if (parts.length < 2) return 'HITAM EKMS';
    const page = parts[parts.length - 1];
    return page.charAt(0).toUpperCase() + page.slice(1);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
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
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
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

      {/* Default Routes */}
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
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
