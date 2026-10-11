import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  LogOut,
  ShieldAlert,
  Bell,
  Clock,
  CheckCircle2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import api from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ sosActiveCount = 0 }) => {
  const { user, role, logout, token } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoadingNotifs(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const markSingleRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'super_admin':
        return <span className="badge badge-purple">Super Admin</span>;
      case 'institution_admin':
        return <span className="badge badge-indigo">Institution Admin</span>;
      case 'admin':
        return <span className="badge badge-indigo">Admin Portal</span>;
      case 'warden':
        return <span className="badge badge-warning">Warden Portal</span>;
      case 'student':
        return <span className="badge badge-teal">Student Portal</span>;
      default:
        return null;
    }
  };

  return (
    <header className="app-header">
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
            flexShrink: 0
          }}>
            <Building2 size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Campus<span style={{ color: 'var(--accent-primary)' }}>Home</span>
              </span>
              {getRoleBadge()}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, fontWeight: 500 }}>
              Residential Campus Management
            </p>
          </div>
        </Link>

        {/* Action Controls & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', position: 'relative' }}>
          {/* Active SOS notification banner for Warden/Admin */}
          {sosActiveCount > 0 && (role === 'admin' || role === 'warden' || role === 'institution_admin') && (
            <div className="pulse-sos" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <ShieldAlert size={15} />
              <span>{sosActiveCount} SOS ACTIVE</span>
            </div>
          )}

          {user && (
            /* Notification Bell */
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) fetchNotifications(); }}
                className="btn btn-ghost btn-sm"
                style={{ position: 'relative', padding: '0.55rem', borderRadius: '50%', color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', background: unreadCount > 0 ? 'var(--accent-primary-subtle)' : 'transparent' }}
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'var(--danger)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotifOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '360px',
                  maxHeight: '440px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-subtle)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Notifications</span>
                      {unreadCount > 0 && <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>{unreadCount} new</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, maxHeight: '340px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => markSingleRead(n._id)}
                          style={{
                            padding: '0.8rem 1rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            background: n.is_read ? '#FFFFFF' : 'var(--accent-primary-subtle)',
                            cursor: 'pointer',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                              {n.title}
                            </span>
                            {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {n.message}
                          </p>
                          <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={11} />
                            <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theme Switcher Toggle */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '0.55rem',
                borderRadius: '50%',
                color: 'var(--text-secondary)',
                background: isThemeOpen ? 'var(--bg-subtle)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
              aria-label="Toggle display theme"
            >
              {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {isThemeOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '140px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 210,
                  padding: '0.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <button
                  onClick={() => { setTheme('light'); setIsThemeOpen(false); }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: theme === 'light' ? 700 : 500,
                    color: theme === 'light' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background: theme === 'light' ? 'var(--accent-primary-subtle)' : 'transparent',
                  }}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  onClick={() => { setTheme('dark'); setIsThemeOpen(false); }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: theme === 'dark' ? 700 : 500,
                    color: theme === 'dark' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background: theme === 'dark' ? 'var(--accent-primary-subtle)' : 'transparent',
                  }}
                >
                  <Moon size={14} /> Dark
                </button>
                <button
                  onClick={() => { setTheme('system'); setIsThemeOpen(false); }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    fontWeight: theme === 'system' ? 700 : 500,
                    color: theme === 'system' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    background: theme === 'system' ? 'var(--accent-primary-subtle)' : 'transparent',
                  }}
                >
                  <Monitor size={14} /> System
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-subtle)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: '1px solid #C7D2FE'
                }}>
                  {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '140px' }} className="truncate">
                    {user.full_name || user.username}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '140px' }} className="truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Sign Out"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <Link to="/login" className="btn btn-primary btn-sm">
                Portal Login
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
