import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Role-based Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#818cf8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontWeight: 600 }}>Loading CampusHome Portal...</div>
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
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register-institution" element={<RegisterInstitution />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
