import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import InstitutionAdminDashboard from './pages/admin/InstitutionAdminDashboard';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import RegisterInstitution from './pages/public/RegisterInstitution';
import WardenDashboard from './pages/warden/WardenDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ErrorPage from './pages/error/ErrorPage';

// Role-based Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, role, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading CampusHome Portal...</div>
        </div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'super_admin')       return <Navigate to="/super-admin" replace />;
    if (role === 'institution_admin') return <Navigate to="/institution-admin" replace />;
    if (role === 'admin')             return <Navigate to="/admin" replace />;
    if (role === 'warden')            return <Navigate to="/warden" replace />;
    if (role === 'student')           return <Navigate to="/student" replace />;
    return <Navigate to="/403" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register-institution" element={<RegisterInstitution />} />

            {/* Error Pages */}
            <Route path="/403" element={<ErrorPage status={403} />} />
            <Route path="/404" element={<ErrorPage status={404} />} />
            <Route path="/429" element={<ErrorPage status={429} />} />
            <Route path="/500" element={<ErrorPage status={500} />} />

            {/* Super Admin */}
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Institution Admin — dedicated dashboard */}
            <Route path="/institution-admin" element={
              <ProtectedRoute allowedRoles={['institution_admin']}>
                <InstitutionAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Legacy Platform Admin (non-SaaS) */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Warden */}
            <Route path="/warden" element={
              <ProtectedRoute allowedRoles={['warden']}>
                <WardenDashboard />
              </ProtectedRoute>
            } />

            {/* Student */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />

            {/* 404 Catch-All */}
            <Route path="*" element={<ErrorPage status={404} />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
