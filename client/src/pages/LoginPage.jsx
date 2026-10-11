import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import api from '../api/axios';
import {
  Building2,
  Shield,
  UserCheck,
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Phone,
  MapPin,
  Compass
} from 'lucide-react';

const LoginPage = () => {
  const { user, login, loginWithGoogle, setAuthData } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student'); // 'student' | 'warden' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailUnverified, setEmailUnverified] = useState(false);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState(null); // { mfa_token, message }
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Register Student Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    full_name: '',
    email: '',
    roll_number: '',
    drcc_id: '',
    department: 'Computer Science & Engineering',
    phone: '',
    password: '',
    parent_name: '',
    parent_phone: '',
    address: '',
    emergency_contact: '',
    hostel_id: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [publicHostels, setPublicHostels] = useState([]);

  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin')       navigate('/super-admin');
      else if (user.role === 'institution_admin') navigate('/institution-admin');
      else if (user.role === 'admin')        navigate('/admin');
      else if (user.role === 'warden')       navigate('/warden');
      else if (user.role === 'student')      navigate('/student');
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get('/public/hostels').then((res) => {
      if (res.data.success && res.data.hostels?.length > 0) {
        setPublicHostels(res.data.hostels);
        setRegForm((prev) => ({ ...prev, hostel_id: res.data.hostels[0]._id }));
      }
    }).catch(() => {});
  }, []);

  // Google Sign-In Initializer
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const renderGoogleButton = () => {
      const container = document.getElementById('googleLoginBtn');
      if (window.google?.accounts?.id && container) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (!response?.credential) return;
              try {
                setLoading(true);
                setError('');
                const res = await loginWithGoogle(response.credential);
                if (res.success) {
                  navigate(res.user?.role === 'super_admin' ? '/super-admin' : res.user?.role === 'institution_admin' ? '/institution-admin' : res.user?.role === 'warden' ? '/warden' : '/student');
                }
              } catch (err) {
                setError(err.response?.data?.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            },
          });
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: container.offsetWidth || 340,
            text: 'continue_with',
            shape: 'rectangular',
          });
        } catch (e) {
          // ignore
        }
      }
    };

    renderGoogleButton();
    const interval = setInterval(renderGoogleButton, 1000);
    return () => clearInterval(interval);
  }, [loginWithGoogle, navigate, isRegisterOpen]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
    setEmailUnverified(false);
    setMfaChallenge(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailUnverified(false);
    setLoading(true);

    try {
      const res = await login(email, password, role);

      // Check if MFA is required for this admin account
      if (res.mfa_required) {
        setMfaChallenge({
          mfa_token: res.mfa_token,
          message: res.message || 'Enter the 6-digit verification code sent to your email.'
        });
        setLoading(false);
        return;
      }

      if (res.success) {
        const returnedRole = res.user?.role;
        if (returnedRole === 'super_admin')            navigate('/super-admin');
        else if (returnedRole === 'institution_admin') navigate('/institution-admin');
        else if (returnedRole === 'admin')             navigate('/admin');
        else if (returnedRole === 'warden')            navigate('/warden');
        else if (returnedRole === 'student')           navigate('/student');
        else                                           navigate('/');
      }
    } catch (err) {
      if (err.response?.data?.email_unverified) {
        setEmailUnverified(true);
      }
      setError(err.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.trim().length !== 6) {
      setMfaError('Please enter a 6-digit code.');
      return;
    }

    setMfaError('');
    setMfaLoading(true);

    try {
      const res = await api.post('/auth/verify-mfa', {
        mfa_token: mfaChallenge.mfa_token,
        otp: mfaCode.trim()
      });

      if (res.data.success) {
        setAuthData(res.data.user, res.data.token);
        const r = res.data.user?.role;
        if (r === 'super_admin') navigate('/super-admin');
        else if (r === 'institution_admin') navigate('/institution-admin');
        else navigate('/admin');
      }
    } catch (err) {
      setMfaError(err.response?.data?.message || 'Invalid two-factor authentication code.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    try {
      const formData = new FormData();
      Object.keys(regForm).forEach((key) => {
        formData.append(key, regForm[key]);
      });

      const res = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setRegSuccess('Registration submitted! A verification email with a code has been dispatched.');
        setTimeout(() => {
          setIsRegisterOpen(false);
          setRegSuccess('');
          navigate(`/verify-email?email=${encodeURIComponent(regForm.email)}`);
        }, 1800);
      }
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed. Please check form fields.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your account email address.');
      return;
    }
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', {
        email: forgotEmail.trim().toLowerCase(),
      });
      setForgotSuccess(res.data.message || 'If an account is associated with this email, password reset instructions have been sent.');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header className="app-header">
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
            }}>
              <Building2 size={20} color="#FFFFFF" />
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Campus<span style={{ color: 'var(--accent-primary)' }}>Home</span>
              </span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>
                Secure Access Portal
              </p>
            </div>
          </Link>

          <Link to="/" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Split Layout */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem' }}>
        <div style={{
          width: '100%',
          maxWidth: '1040px',
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          overflow: 'hidden'
        }}>
          
          {/* Left Column: Visual & Trust Showcase */}
          <div style={{
            background: 'var(--bg-sidebar)',
            color: '#FFFFFF',
            padding: '3rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(79, 70, 229, 0.2)',
                border: '1px solid rgba(79, 70, 229, 0.4)',
                color: '#C7D2FE',
                fontSize: '0.78rem',
                fontWeight: 600,
                marginBottom: '1.5rem'
              }}>
                <Sparkles size={14} />
                <span>Enterprise Multi-Tenant Hostel SaaS</span>
              </div>

              <h2 style={{ fontSize: '1.9rem', color: '#FFFFFF', lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                Unified Campus Residential Management
              </h2>
              <p style={{ color: 'var(--text-sidebar)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                Streamlined hostel supervision with institutional role-based separation for students, wardens, and campus administrators.
              </p>

              {/* Feature Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>Smart Room Allocation</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-sidebar)' }}>Atomic bed vacancy control and automated transfer workflows</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(79, 70, 229, 0.25)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Compass size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>GPS Geofenced Attendance</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-sidebar)' }}>Perimeter-verified daily check-in and instant audit logs</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>24/7 Rapid SOS Emergency Response</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-sidebar)' }}>Instant room locator alerts broadcast directly to wardens</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Security Note */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-sidebar)', fontSize: '0.78rem' }}>
              <Shield size={16} color="var(--accent-teal)" />
              <span>OWASP Top 10 Hardened • Multi-Tenant Data Isolation</span>
            </div>
          </div>

          {/* Right Column: Clean Form Container */}
          <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* Form Header */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Welcome to CampusHome
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Select your role and enter credentials to sign in.
              </p>
            </div>

            {/* If in MFA Step */}
            {mfaChallenge ? (
              <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="alert-box alert-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <KeyRound size={18} />
                    <span>{mfaChallenge.message}</span>
                  </div>
                </div>

                {mfaError && (
                  <div className="alert-box alert-error">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} />
                      <span>{mfaError}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Two-Factor Authentication Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.4rem', fontWeight: 700 }}
                    autoFocus
                    required
                  />
                  <span className="form-hint">Check your administrator registered email address.</span>
                </div>

                <button
                  type="submit"
                  disabled={mfaLoading || mfaCode.length !== 6}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {mfaLoading ? 'Verifying Code...' : 'Confirm 2FA & Access Dashboard'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMfaChallenge(null); setMfaCode(''); }}
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'center', marginTop: '0.5rem' }}
                >
                  Cancel and Return to Login
                </button>
              </form>
            ) : (
              <>
                {/* Role Tabs */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.35rem',
                  background: '#F1F5F9',
                  padding: '0.3rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem'
                }}>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('student')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: role === 'student' ? '#FFFFFF' : 'transparent',
                      color: role === 'student' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: role === 'student' ? 'var(--shadow-xs)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <GraduationCap size={16} />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('warden')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: role === 'warden' ? '#FFFFFF' : 'transparent',
                      color: role === 'warden' ? 'var(--warning-text)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: role === 'warden' ? 'var(--shadow-xs)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Shield size={16} />
                    <span>Warden</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: role === 'admin' ? '#FFFFFF' : 'transparent',
                      color: role === 'admin' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: role === 'admin' ? 'var(--shadow-xs)' : 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <UserCheck size={16} />
                    <span>Admin</span>
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="alert-box alert-error">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Email Unverified Warning */}
                {emailUnverified && (
                  <div className="alert-box alert-warning">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>Email verification is required before login.</span>
                      <Link to={`/verify-email?email=${encodeURIComponent(email)}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>
                        Verify Now →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label className="form-label">
                      {role === 'admin' ? 'Email or Admin Username' : 'Email Address'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={role === 'admin' ? 'text' : 'email'}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={role === 'admin' ? 'admin@university.edu or username' : 'student@university.edu'}
                        className="form-input"
                        style={{ paddingLeft: '2.4rem' }}
                      />
                      <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Password</label>
                      <button
                        type="button"
                        onClick={() => { setIsForgotOpen(true); setForgotEmail(email); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="form-input"
                        style={{ paddingLeft: '2.4rem' }}
                      />
                      <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                  >
                    {loading ? 'Authenticating...' : `Sign in as ${role === 'admin' ? 'Administrator' : role === 'warden' ? 'Warden' : 'Student'}`}
                  </button>
                </form>

                {/* Google Sign In Divider (Students only) */}
                {role === 'student' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>or</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>

                    <div id="googleLoginBtn" style={{ display: 'flex', justifyContent: 'center' }} />
                  </>
                )}

                {/* Registration Link for Students */}
                {role === 'student' && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    New resident student?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Register Profile
                    </button>
                  </div>
                )}

                {/* Partner Institution registration notice for Admins */}
                {role === 'admin' && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Looking to onboard your institution?{' '}
                    <Link to="/register-institution" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                      Register Institution
                    </Link>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Reset Account Password"
        maxWidth="460px"
      >
        <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Enter your account email address. We will dispatch a secure single-use link and instructions to reset your password.
          </p>

          {forgotSuccess && (
            <div className="alert-box alert-success">
              <CheckCircle2 size={18} />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {forgotError && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} />
              <span>{forgotError}</span>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="user@university.edu"
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotLoading}
              className="btn btn-primary btn-sm"
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Self-Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Student Resident Registration"
        maxWidth="680px"
      >
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {regSuccess && (
            <div className="alert-box alert-success">
              <CheckCircle2 size={18} />
              <span>{regSuccess}</span>
            </div>
          )}

          {regError && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} />
              <span>{regError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                value={regForm.full_name}
                onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                placeholder="Aarav Sharma"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="aarav@college.edu"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Roll Number *</label>
              <input
                type="text"
                required
                value={regForm.roll_number}
                onChange={(e) => setRegForm({ ...regForm, roll_number: e.target.value })}
                placeholder="2024-CSE-042"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">DRCC Application ID (Optional)</label>
              <input
                type="text"
                value={regForm.drcc_id}
                onChange={(e) => setRegForm({ ...regForm, drcc_id: e.target.value })}
                placeholder="DRCC-98765"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                required
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="9876543210"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="Min 6 characters"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Target Hostel Unit *</label>
              <select
                value={regForm.hostel_id}
                onChange={(e) => setRegForm({ ...regForm, hostel_id: e.target.value })}
                className="form-select"
                required
              >
                {publicHostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.block_number} • {h.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regLoading}
              className="btn btn-primary btn-sm"
            >
              {regLoading ? 'Submitting Registration...' : 'Submit Profile & Request Allotment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', background: '#FFFFFF', padding: '1.25rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
        <p>© 2026 CampusHome Portal. Strict institutional tenant separation enforced.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
