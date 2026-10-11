import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
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
  UserPlus,
  KeyRound,
  RefreshCw,
  MailCheck
} from 'lucide-react';

const LoginPage = () => {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student'); // 'admin' | 'warden' | 'student'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Register Modal State
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
    // Load public hostels for registration form
    api.get('/public/hostels').then((res) => {
      if (res.data.success) {
        setPublicHostels(res.data.hostels);
        if (res.data.hostels.length > 0) {
          setRegForm((prev) => ({ ...prev, hostel_id: res.data.hostels[0]._id }));
        }
      }
    }).catch((e) => console.error(e));
  }, []);

  // Google Identity Services Setup
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (!response?.credential) return;
              try {
                setLoading(true);
                setError('');
                setEmailUnverified(false);
                const res = await loginWithGoogle(response.credential);
                if (res.success) {
                  const returnedRole = res.user?.role;
                  if (returnedRole === 'super_admin')       navigate('/super-admin');
                  else if (returnedRole === 'institution_admin') navigate('/institution-admin');
                  else if (returnedRole === 'admin')        navigate('/admin');
                  else if (returnedRole === 'warden')       navigate('/warden');
                  else                                      navigate('/student');
                }
              } catch (err) {
                if (err.response?.data?.not_registered) {
                  setError('No existing account for this Google email. Please register below.');
                } else {
                  setError(err.response?.data?.message || 'Google authentication failed.');
                }
              } finally {
                setLoading(false);
              }
            },
          });

          const btnEl = document.getElementById('google-btn-container');
          if (btnEl) {
            btnEl.innerHTML = ''; // clear previous
            window.google.accounts.id.renderButton(btnEl, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: 'continue_with',
              shape: 'rectangular',
            });
          }
        } catch (e) {
          console.error('Google button initialization failed:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          renderGoogleButton();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loginWithGoogle, navigate, isRegisterOpen]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
    setEmailUnverified(false);
    setSuccessMsg('');
  };

  const handleFillDemo = (targetRole = role) => {
    setEmailUnverified(false);
    if (targetRole === 'admin') {
      setEmail('admin@campushome.com');
      setPassword('adminpassword123');
    } else if (targetRole === 'warden') {
      setEmail('warden@campushome.com');
      setPassword('wardenpassword123');
    } else if (targetRole === 'student') {
      setEmail('student@campushome.com');
      setPassword('studentpassword123');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailUnverified(false);
    setLoading(true);

    try {
      const res = await login(email, password, role);
      if (res.success) {
        const returnedRole = res.user?.role;
        if (returnedRole === 'super_admin')       navigate('/super-admin');
        else if (returnedRole === 'institution_admin') navigate('/institution-admin');
        else if (role === 'admin')                navigate('/admin');
        else if (role === 'warden')               navigate('/warden');
        else                                      navigate('/student');
      }
    } catch (err) {
      if (err.response?.data?.email_unverified) {
        setEmailUnverified(true);
      }
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
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
        setRegSuccess('Registration submitted! A verification email with a link and 6-digit OTP code has been dispatched.');
        setTimeout(() => {
          setIsRegisterOpen(false);
          setRegSuccess('');
          navigate(`/verify-email?email=${encodeURIComponent(regForm.email)}`);
        }, 2000);
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
      setForgotSuccess(res.data.message || 'If an account is associated with this email, reset instructions have been sent.');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
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
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--accent-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
            }}>
              <Building2 size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>Welcome Back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Sign in to your CampusHome unified dashboard
            </p>
          </div>

          {/* Role Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.5rem',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.75rem'
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
                background: role === 'student' ? 'var(--accent-gradient)' : 'transparent',
                color: role === 'student' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
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
                background: role === 'warden' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: role === 'warden' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
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
                background: role === 'admin' ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' : 'transparent',
                color: role === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <UserCheck size={16} />
              <span>Admin</span>
            </button>
          </div>

          {/* Quick Demo Credentials Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px dashed rgba(99, 102, 241, 0.3)',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc' }}>
              <Sparkles size={14} />
              <span>Demo Testing Account</span>
            </div>
            <button
              type="button"
              onClick={() => handleFillDemo()}
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#c7d2fe',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Fill Demo ({role.toUpperCase()})
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {emailUnverified && (
                <div style={{ marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.25)',
                      border: '1px solid #818cf8',
                      color: '#c7d2fe',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <MailCheck size={14} /> Enter 6-Digit OTP / Verify Email Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">
                {role === 'admin' ? 'Email or Username' : 'Email Address'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or ID"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setIsForgotOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    padding: 0
                  }}
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
                  placeholder="Enter your password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
              style={{ marginTop: '1.25rem' }}
            >
              <span>{loading ? 'Authenticating...' : `Sign in as ${role.toUpperCase()}`}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Google Sign In Divider & Container */}
          <div style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: '50%', width: '100%', height: '1px', background: 'var(--border-color)' }} />
            <span style={{ position: 'relative', background: '#0f172a', padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Or Continue With
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }}>
            <div id="google-btn-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {/* Fallback button if Google script is loading or client ID pending */}
              <button
                type="button"
                onClick={() => {
                  if (window.google?.accounts?.id && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                    window.google.accounts.id.prompt();
                  } else {
                    setError('Google Sign-In is configured with official Google Identity Services. Set VITE_GOOGLE_CLIENT_ID in .env.');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>

          {/* Student Registration Link */}
          {role === 'student' && (
            <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                New resident student?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Register Here
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Reset Account Password"
        maxWidth="440px"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Enter your account email. If an account is found, a secure single-use password reset link will be sent via Brevo transactional email.
          </p>

          {forgotError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} />
              <span>{forgotError}</span>
            </div>
          )}

          {forgotSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={18} />
              <span>{forgotSuccess}</span>
            </div>
          )}

          <form onSubmit={handleForgotPasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Account Email Address</label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@university.edu"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="btn btn-primary"
              >
                {forgotLoading ? (
                  <>
                    <RefreshCw size={16} className="spin-anim" /> Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Student Self Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Student Hostel Admission Registration"
        maxWidth="680px"
      >
        {regError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={18} />
            <span>{regError}</span>
          </div>
        )}

        {regSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{regSuccess}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                value={regForm.full_name}
                onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                placeholder="e.g. Sahil Deep"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="sahil@university.edu"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">University Roll Number *</label>
              <input
                type="text"
                required
                value={regForm.roll_number}
                onChange={(e) => setRegForm({ ...regForm, roll_number: e.target.value })}
                placeholder="e.g. 2024CSE019"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">DRCC / Student ID</label>
              <input
                type="text"
                value={regForm.drcc_id}
                onChange={(e) => setRegForm({ ...regForm, drcc_id: e.target.value })}
                placeholder="e.g. DRCC-98124"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                value={regForm.department}
                onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                className="form-select"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Management & Commerce">Management & Commerce</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                required
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hostel Preference</label>
              <select
                value={regForm.hostel_id}
                onChange={(e) => setRegForm({ ...regForm, hostel_id: e.target.value })}
                className="form-select"
              >
                {publicHostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.type} - {h.block_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent / Guardian Name</label>
              <input
                type="text"
                value={regForm.parent_name}
                onChange={(e) => setRegForm({ ...regForm, parent_name: e.target.value })}
                placeholder="Guardian Full Name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Phone / Emergency Contact</label>
              <input
                type="tel"
                value={regForm.parent_phone}
                onChange={(e) => setRegForm({ ...regForm, parent_phone: e.target.value, emergency_contact: e.target.value })}
                placeholder="+91 9871122334"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Permanent Address</label>
            <textarea
              rows={2}
              value={regForm.address}
              onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
              placeholder="City, State, Pin code"
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regLoading}
              className="btn btn-primary"
            >
              <UserPlus size={16} />
              <span>{regLoading ? 'Submitting Registration...' : 'Submit Application'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;
