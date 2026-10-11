import React from 'react';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', badgeText, badgeColor }) => {
  const colorSchemes = {
    indigo: { bg: 'var(--accent-primary-subtle)', text: 'var(--accent-primary)', border: '#C7D2FE' },
    teal:   { bg: 'var(--accent-teal-subtle)',    text: 'var(--accent-teal)',    border: '#99F6E4' },
    cyan:   { bg: 'var(--accent-teal-subtle)',    text: 'var(--accent-teal)',    border: '#99F6E4' },
    emerald:{ bg: 'var(--success-bg)',            text: 'var(--success)',        border: 'var(--success-border)' },
    amber:  { bg: 'var(--warning-bg)',            text: 'var(--warning)',        border: 'var(--warning-border)' },
    rose:   { bg: 'var(--danger-bg)',             text: 'var(--danger)',         border: 'var(--danger-border)' },
    purple: { bg: '#F5F3FF',                      text: '#6D28D9',               border: '#DDD6FE' },
  };

  const scheme = colorSchemes[color] || colorSchemes.indigo;

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <div className="stat-label">
            {title}
          </div>
          <div className="stat-value" style={{ marginTop: '0.2rem' }}>
            {value}
          </div>
        </div>

        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: scheme.bg,
          border: `1px solid ${scheme.border}`,
          color: scheme.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {Icon && <Icon size={22} color={scheme.text} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
        <span className="truncate" style={{ maxWidth: '70%' }}>{subtitle}</span>
        {badgeText && (
          <span className={`badge badge-${badgeColor || 'indigo'}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
