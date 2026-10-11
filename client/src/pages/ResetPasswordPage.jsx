import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/common/Navbar';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError('Password reset token is missing or invalid. Please request a new reset email.');
      return;
    }

    if (password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });

      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: success ? '#ECFDF5' : '#EEF2FF',
              border: `1px solid ${success ? '#A7F3D0' : '#C7D2FE'}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              {success ? (
                <CheckCircle2 size={32} color="var(--success)" />
              ) : (
                <KeyRound size={32} color="var(--primary)" />
              )}
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              {success ? 'Password Reset Complete' : 'Reset Your Password'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {success
                ? 'Your password has been securely updated. You can now log in.'
                : 'Enter and confirm your new password below.'}
            </p>
          </div>

          {!token && !success && (
            <div className="alert-danger" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Missing Reset Token</strong>
                <span>This password reset link is invalid or incomplete. Please request a new link from the login screen.</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert-danger" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div>
              <div className="alert-success" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <span>Password changed successfully. You may now log in with your new password.</span>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
              >
                Proceed to Login <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            token && (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin-anim" /> Updating Password...
                    </>
                  ) : (
                    'Set New Password'
                  )}
                </button>
              </form>
            )
          )}

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
