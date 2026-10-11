import React from 'react';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', badgeText, badgeColor }) => {
  const colorGradients = {
    indigo: 'var(--accent-gradient)',
    cyan: 'var(--accent-cyan-gradient)',
    emerald: 'var(--accent-emerald-gradient)',
    amber: 'var(--accent-amber-gradient)',
    rose: 'var(--accent-rose-gradient)',
    purple: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
  };

  const bgGradient = colorGradients[color] || colorGradients.indigo;

  return (
    <div className="glass-card" style={{ padding: '1.4rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
            {value}
          </div>
        </div>

        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          background: bgGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
          flexShrink: 0
        }}>
          {Icon && <Icon size={24} color="#ffffff" />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>{subtitle}</span>
        {badgeText && (
          <span className={`badge badge-${badgeColor || 'info'}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
