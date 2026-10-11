import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  LogOut,
  Search,
  Users,
  Bed,
  BarChart3,
  ShieldAlert,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  School,
  ListFilter,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/common/ConfirmModal';

const SuperAdminDashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'analytics'
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    status: '',
    title: '',
    message: '',
    hasInput: false,
    inputPlaceholder: '',
    inputValue: '',
    isDanger: false,
  });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pendingRes, allRes, analyticsRes] = await Promise.all([
        api.get('/super-admin/institutions/pending', authHeader),
        api.get(`/super-admin/institutions?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`, authHeader),
        api.get('/super-admin/analytics', authHeader).catch(() => ({ data: { success: false } })),
      ]);

      if (pendingRes.data.success) {
        setPendingInstitutions(pendingRes.data.institutions);
      }
      if (allRes.data.success) {
        setAllInstitutions(allRes.data.institutions);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.analytics);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleAction = (id, status) => {
    if (status === 'Rejected') {
      setConfirmModal({
        isOpen: true,
        id,
        status,
        title: 'Reject Application',
        message: 'Provide an optional reason for rejecting this institution application:',
        hasInput: true,
        inputPlaceholder: 'Reason for rejection (optional)',
        inputValue: '',
        isDanger: true,
      });
    } else if (status === 'Suspended') {
      setConfirmModal({
        isOpen: true,
        id,
        status,
        title: 'Suspend Institution',
        message: 'Enter the reason for suspending this institution account:',
        hasInput: true,
        inputPlaceholder: 'Reason for account suspension (required)',
        inputValue: '',
        isDanger: true,
      });
    } else {
      setConfirmModal({
        isOpen: true,
        id,
        status,
        title: `${status} Institution`,
        message: `Are you sure you want to change the status of this institution to ${status}?`,
        hasInput: false,
        inputPlaceholder: '',
        inputValue: '',
        isDanger: false,
      });
    }
  };

  const executeConfirmAction = async () => {
    const { id, status, inputValue } = confirmModal;
    if (!id || !status) return;

    setActionLoading(id);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.put(
        `/super-admin/institutions/${id}/status`,
        { status, reason: inputValue || '' },
        authHeader
      );

      if (res.data.success) {
        setSuccess(`Institution status updated to ${status} successfully.`);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update status to ${status}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40
          }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className="dashboard-sidebar"
        style={{
          width: '270px',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: mobileSidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.25s ease'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>CampusHome</div>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>SUPER ADMIN</span>
            </div>
          </div>
          {mobileSidebarOpen && (
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav style={{ padding: '1.25rem 0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button
            onClick={() => { setActiveTab('pending'); setMobileSidebarOpen(false); }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'pending' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'var(--transition)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} />
              <span>Pending Approvals</span>
            </div>
            {pendingInstitutions.length > 0 && (
              <span style={{ background: '#F59E0B', color: '#FFFFFF', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                {pendingInstitutions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('all'); setMobileSidebarOpen(false); }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'all' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'var(--transition)'
            }}
          >
            <School size={18} />
            <span>Institutions Directory</span>
          </button>

          <button
            onClick={() => { setActiveTab('analytics'); setMobileSidebarOpen(false); }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'analytics' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'var(--transition)'
            }}
          >
            <BarChart3 size={18} />
            <span>Platform Overview</span>
          </button>
        </nav>

        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#94A3B8" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.full_name || 'Super Admin'}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="dashboard-main"
        style={{
          flex: 1,
          marginLeft: '270px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              style={{
                display: 'none',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                Platform Administration
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                {activeTab === 'pending' && 'Review and approve new college & school registration applications.'}
                {activeTab === 'all' && 'Directory of all registered institutions across the SaaS network.'}
                {activeTab === 'analytics' && 'Global platform telemetry, tenant counts, and capacity stats.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="var(--warning)" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Pending</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingInstitutions.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Tenants</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{analytics?.totalInstitutions || allInstitutions.length}</div>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert-danger" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Pending Applications</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{pendingInstitutions.length} waiting for verification</span>
              </div>
              <button onClick={loadData} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading applications...</div>
                </div>
              ) : pendingInstitutions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    <CheckCircle size={32} color="var(--success)" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>All Caught Up</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>There are no pending institution applications requiring review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {pendingInstitutions.map((inst) => (
                    <div key={inst._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#FFFFFF', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{inst.name}</h4>
                            <span className="badge badge-warning">Pending Review</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                            <span><strong>Code:</strong> {inst.code}</span>
                            <span><strong>Type:</strong> {inst.institution_type}</span>
                            <span><strong>Applied:</strong> {new Date(inst.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button 
                            onClick={() => handleAction(inst._id, 'Approved')} 
                            className="btn-primary"
                            style={{ background: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
                            disabled={actionLoading === inst._id}
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(inst._id, 'Rejected')} 
                            className="btn-danger"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
                            disabled={actionLoading === inst._id}
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                        <div>
                          <h5 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Contact Information</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={15} color="var(--primary)"/> {inst.contact_email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={15} color="var(--secondary)"/> {inst.contact_phone}</div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><MapPin size={15} color="#F43F5E"/> <span>{inst.address}<br/>{inst.city}, {inst.state} - {inst.country}</span></div>
                          </div>
                        </div>
                        <div>
                          <h5 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Designated Tenant Admin</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={15} color="var(--primary)"/> {inst.admin_details?.full_name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={15} color="var(--secondary)"/> {inst.admin_details?.email}</div>
                            {inst.admin_details?.phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={15} color="#F43F5E"/> {inst.admin_details?.phone}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INSTITUTIONS DIRECTORY */}
        {activeTab === 'all' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Institutions Directory</h3>
                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
                  {['All', 'Approved', 'Pending', 'Suspended', 'Rejected'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: statusFilter === st ? '#FFFFFF' : 'transparent',
                        color: statusFilter === st ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: statusFilter === st ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: statusFilter === st ? 'var(--shadow-sm)' : 'none',
                        transition: 'var(--transition)'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search name, code, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '240px', padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.875rem' }}>
                  <Search size={15} />
                </button>
              </form>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading directory...</div>
                </div>
              ) : allInstitutions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  No institutions found matching the chosen criteria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allInstitutions.map((inst) => {
                    const statusClass = 
                      inst.status === 'Approved' ? 'badge-success' :
                      inst.status === 'Pending' ? 'badge-warning' :
                      inst.status === 'Suspended' ? 'badge-danger' : 'badge-secondary';

                    return (
                      <div key={inst._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#FFFFFF', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{inst.name}</h4>
                              <span className={`badge ${statusClass}`}>{inst.status}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: '#EEF2FF', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                                {inst.code}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                              <span><strong>Type:</strong> {inst.institution_type}</span>
                              <span><strong>Email:</strong> {inst.contact_email}</span>
                              <span><strong>Phone:</strong> {inst.contact_phone}</span>
                              <span><strong>City:</strong> {inst.city || inst.address}</span>
                              {inst.admin_details?.full_name && (
                                <span><strong>Admin:</strong> {inst.admin_details.full_name}</span>
                              )}
                            </div>
                          </div>

                          {/* Quick Telemetry Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', background: '#F8FAFC', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hostels</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{inst.metrics?.hostels ?? 0}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', background: '#F8FAFC', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Students</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{inst.metrics?.students ?? 0}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', background: '#F8FAFC', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rooms</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>{inst.metrics?.rooms ?? 0}</div>
                            </div>

                            {/* Lifecycle Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                              {inst.status === 'Pending' && (
                                <>
                                  <button onClick={() => handleAction(inst._id, 'Approved')} className="btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} disabled={actionLoading === inst._id}>
                                    Approve
                                  </button>
                                  <button onClick={() => handleAction(inst._id, 'Rejected')} className="btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} disabled={actionLoading === inst._id}>
                                    Reject
                                  </button>
                                </>
                              )}

                              {inst.status === 'Approved' && (
                                <button onClick={() => handleAction(inst._id, 'Suspended')} className="btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} disabled={actionLoading === inst._id} title="Suspend institutional access">
                                  <PauseCircle size={14} />
                                  <span>Suspend</span>
                                </button>
                              )}

                              {inst.status === 'Suspended' && (
                                <button onClick={() => handleAction(inst._id, 'Approved')} className="btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} disabled={actionLoading === inst._id} title="Reactivate institutional access">
                                  <PlayCircle size={14} />
                                  <span>Reactivate</span>
                                </button>
                              )}

                              {inst.status === 'Rejected' && (
                                <button onClick={() => handleAction(inst._id, 'Approved')} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} disabled={actionLoading === inst._id} title="Re-approve institution">
                                  <RotateCcw size={14} />
                                  <span>Re-approve</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {inst.suspension_reason && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.8rem', color: '#991B1B' }}>
                            <strong>Suspension Reason:</strong> {inst.suspension_reason}
                          </div>
                        )}

                        {inst.rejection_reason && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.8rem', color: '#991B1B' }}>
                            <strong>Rejection Reason:</strong> {inst.rejection_reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Institutions</span>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{analytics?.totalInstitutions ?? 0}</div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={20} color="var(--success)" />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Active / Approved</span>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em' }}>{analytics?.approvedInstitutions ?? 0}</div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} color="var(--warning)" />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Approvals</span>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--warning)', letterSpacing: '-0.02em' }}>{analytics?.pendingInstitutions ?? 0}</div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PauseCircle size={20} color="var(--danger)" />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Suspended Accounts</span>
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.02em' }}>{analytics?.suspendedInstitutions ?? 0}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Total Enrolled Students</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>{analytics?.totalStudents ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', margin: 0 }}>
                  Active residents registered across all tenant institutions.
                </p>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="var(--secondary)" />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Blocks</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>{analytics?.totalHostels ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', margin: 0 }}>
                  Campus hostels actively managed across the platform.
                </p>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bed size={20} color="#F43F5E" />
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Total Rooms</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F43F5E' }}>{analytics?.totalRooms ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', margin: 0 }}>
                  Configured room inventory tracked across all hostels.
                </p>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          hasInput={confirmModal.hasInput}
          inputPlaceholder={confirmModal.inputPlaceholder}
          inputValue={confirmModal.inputValue}
          onInputChange={(val) => setConfirmModal((prev) => ({ ...prev, inputValue: val }))}
          onConfirm={executeConfirmAction}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          isDanger={confirmModal.isDanger}
          loading={!!actionLoading}
        />
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
