import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, FileQuestion, Clock, AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import Navbar from '../../components/common/Navbar';

const errorConfigs = {
  403: {
    code: '403',
    title: 'Access Forbidden',
    message: "You don't have permission to access this institutional resource or your role privileges are restricted.",
    icon: ShieldAlert,
    badgeColor: 'var(--danger-bg)',
    badgeText: 'var(--danger-text)',
    badgeBorder: 'var(--danger-border)',
  },
  404: {
    code: '404',
    title: 'Page Not Found',
    message: "The page or institutional resource you are looking for does not exist or may have been relocated.",
    icon: FileQuestion,
    badgeColor: 'var(--accent-primary-subtle)',
    badgeText: 'var(--accent-primary)',
    badgeBorder: 'rgba(79, 70, 229, 0.2)',
  },
  429: {
    code: '429',
    title: 'Too Many Requests',
    message: "Security rate limits engaged. You've made too many requests in a short period. Please wait a few moments before trying again.",
    icon: Clock,
    badgeColor: 'var(--warning-bg)',
    badgeText: 'var(--warning-text)',
    badgeBorder: 'var(--warning-border)',
  },
  500: {
    code: '500',
    title: 'Internal Server Error',
    message: "An unexpected condition occurred on the server. Our reliability engineering monitors have logged this incident.",
    icon: AlertTriangle,
    badgeColor: 'var(--danger-bg)',
    badgeText: 'var(--danger-text)',
    badgeBorder: 'var(--danger-border)',
  },
};

const ErrorPage = ({ status = 404 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = errorConfigs[status] || errorConfigs[404];
  const Icon = config.icon;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          padding: '3rem 2.5rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: 'var(--radius-full)',
            background: config.badgeColor,
            border: `1px solid ${config.badgeBorder}`,
            color: config.badgeText,
            marginBottom: '1.5rem',
          }}>
            <Icon size={36} />
          </div>

          <div style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
          }}>
            {config.code}
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
          }}>
            {config.title}
          </h1>

          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            {config.message}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} /> Go Back
            </button>

            <Link
              to="/"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Home size={16} /> Return to Home
            </Link>

            {status === 500 && (
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} /> Retry Page
              </button>
            )}
          </div>

          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}>
            Attempted Route: <code>{location.pathname}</code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ErrorPage;
