import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/common/Navbar';
import {
  MailCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryToken = searchParams.get('token') || '';
  const queryEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(Boolean(queryToken));
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Automatic verification if token is present in URL
  useEffect(() => {
    if (queryToken) {
      setVerifyingLink(true);
      setError('');
      api.post('/auth/verify-email', { token: queryToken })
        .then((res) => {
          if (res.data.success) {
            setSuccess(true);
            setStatusMsg(res.data.message || 'Email verified successfully!');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Verification link is invalid or expired. You can use your 6-digit OTP below.');
        })
        .finally(() => {
          setVerifyingLink(false);
        });
    }
  }, [queryToken]);

  // Resend countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter a complete 6-digit numeric OTP code.');
      return;
    }
    if (!email || !email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setError('');
    setStatusMsg('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-email', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (res.data.success) {
        setSuccess(true);
        setStatusMsg(res.data.message || 'Email verified successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !email.trim()) {
      setError('Please enter your email address to resend verification.');
      return;
    }

    setError('');
    setStatusMsg('');
    setResendLoading(true);

    try {
      const res = await api.post('/auth/resend-verification', {
        email: email.trim().toLowerCase(),
      });

      setStatusMsg(res.data.message || 'A new verification code has been dispatched.');
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      if (err.response?.data?.retryAfterSeconds) {
        setResendCooldown(err.response.data.retryAfterSeconds);
      }
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-mesh" />
      <Navbar />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem 2rem', position: 'relative' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              border: `1px solid ${success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              {success ? (
                <CheckCircle2 size={32} color="#10b981" />
              ) : (
                <MailCheck size={32} color="#818cf8" />
              )}
            </div>

            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
              {success ? 'Email Verified!' : 'Verify Your Email'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {success
                ? 'Your email has been confirmed. You may now sign in to your dashboard.'
                : 'Confirm your email via the link sent to your inbox or enter your 6-digit code below.'}
            </p>
          </div>

          {/* Verifying Link Progress */}
          {verifyingLink && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem'
            }}>
              <RefreshCw size={28} className="spin-anim" style={{ color: '#818cf8', marginBottom: '1rem' }} />
              <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Verifying your secure link...</p>
            </div>
          )}

          {/* Success Screen */}
          {success && (
            <div>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem' }}>{statusMsg || 'Your account is ready for sign in!'}</span>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/login')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Proceed to Login <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* OTP Verification Form */}
          {!success && !verifyingLink && (
            <div>
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.9rem'
                }}>
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {statusMsg && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  color: '#a5b4fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.9rem'
                }}>
                  <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                  <span>{statusMsg}</span>
                </div>
              )}

              <form onSubmit={handleOtpSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.edu"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      outline: 'none',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      6-Digit Verification Code (OTP)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valid 15 mins</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      color: '#38bdf8',
                      letterSpacing: '8px',
                      textAlign: 'center',
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    opacity: (loading || otp.length !== 6) ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin-anim" /> Verifying Code...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Confirm Verification
                    </>
                  )}
                </button>
              </form>

              {/* Resend actions */}
              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Didn't receive the email? Check your spam folder or resend.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--text-muted)' : '#818cf8',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={14} className={resendLoading ? 'spin-anim' : ''} />
                  {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Verification Code'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.85rem'
                  }}
                >
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
