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
  ListFilter
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'var(--bg-card-solid)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', lineHeight: 1.2 }}>CampusHome</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>MAIN PLATFORM ADMIN</span>
            </div>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'pending' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'pending' ? '#818cf8' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} />
              <span>Pending Approvals</span>
            </div>
            {pendingInstitutions.length > 0 && (
              <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                {pendingInstitutions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'all' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'all' ? '#818cf8' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <School size={18} />
            <span>Institutions Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'analytics' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'analytics' ? '#818cf8' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <BarChart3 size={18} />
            <span>Platform Overview</span>
          </button>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#94a3b8" />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{user?.full_name || 'Super Admin'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Platform Administration</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'pending' && 'Review and approve new college & school registration applications.'}
              {activeTab === 'all' && 'Directory of all registered institutions across the SaaS network.'}
              {activeTab === 'analytics' && 'Global platform telemetry, tenant counts, and capacity stats.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '0.65rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={18} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{pendingInstitutions.length}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '0.65rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building2 size={18} color="#818cf8" />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Institutions</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{analytics?.totalInstitutions || allInstitutions.length}</div>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#34d399', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Pending Applications ({pendingInstitutions.length})</h3>
              <button onClick={loadData} className="btn btn-secondary btn-sm" disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading applications...</div>
              ) : pendingInstitutions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <CheckCircle size={48} color="#34d399" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>All Caught Up</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>There are no pending institution applications to review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {pendingInstitutions.map((inst) => (
                    <div key={inst._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{inst.name}</h4>
                            <span className="badge badge-warning">Pending Review</span>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <span><strong>Code:</strong> {inst.code}</span>
                            <span><strong>Type:</strong> {inst.institution_type}</span>
                            <span><strong>Applied:</strong> {new Date(inst.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button 
                            onClick={() => handleAction(inst._id, 'Approved')} 
                            className="btn btn-success" 
                            disabled={actionLoading === inst._id}
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(inst._id, 'Rejected')} 
                            className="btn btn-danger" 
                            disabled={actionLoading === inst._id}
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div>
                          <h5 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Contact Info</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} color="#818cf8"/> {inst.contact_email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} color="#34d399"/> {inst.contact_phone}</div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><MapPin size={16} color="#f43f5e"/> <span>{inst.address}<br/>{inst.city}, {inst.state} - {inst.country}</span></div>
                          </div>
                        </div>
                        <div>
                          <h5 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Initial Administrator</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} color="#818cf8"/> {inst.admin_details?.full_name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} color="#34d399"/> {inst.admin_details?.email}</div>
                            {inst.admin_details?.phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} color="#f43f5e"/> {inst.admin_details?.phone}</div>
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
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Institutions Directory</h3>
                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['All', 'Approved', 'Pending', 'Suspended', 'Rejected'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        background: statusFilter === st ? 'var(--accent-gradient)' : 'transparent',
                        color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
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
                  placeholder="Search by name, code, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '260px', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  <Search size={14} />
                  <span>Search</span>
                </button>
              </form>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading directory...</div>
              ) : allInstitutions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No institutions match the chosen filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allInstitutions.map((inst) => {
                    const statusClass = 
                      inst.status === 'Approved' ? 'badge-success' :
                      inst.status === 'Pending' ? 'badge-warning' :
                      inst.status === 'Suspended' ? 'badge-danger' : 'badge-secondary';

                    return (
                      <div key={inst._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.5)', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                              <h4 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{inst.name}</h4>
                              <span className={`badge ${statusClass}`}>{inst.status}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                                CODE: {inst.code}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hostels</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{inst.metrics?.hostels ?? 0}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Students</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#818cf8' }}>{inst.metrics?.students ?? 0}</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rooms</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>{inst.metrics?.rooms ?? 0}</div>
                            </div>

                            {/* Lifecycle Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                              {inst.status === 'Pending' && (
                                <>
                                  <button onClick={() => handleAction(inst._id, 'Approved')} className="btn btn-success btn-sm" disabled={actionLoading === inst._id}>
                                    Approve
                                  </button>
                                  <button onClick={() => handleAction(inst._id, 'Rejected')} className="btn btn-danger btn-sm" disabled={actionLoading === inst._id}>
                                    Reject
                                  </button>
                                </>
                              )}

                              {inst.status === 'Approved' && (
                                <button onClick={() => handleAction(inst._id, 'Suspended')} className="btn btn-danger btn-sm" disabled={actionLoading === inst._id} title="Suspend institutional access">
                                  <PauseCircle size={14} />
                                  <span>Suspend</span>
                                </button>
                              )}

                              {inst.status === 'Suspended' && (
                                <button onClick={() => handleAction(inst._id, 'Approved')} className="btn btn-success btn-sm" disabled={actionLoading === inst._id} title="Reactivate institutional access">
                                  <PlayCircle size={14} />
                                  <span>Reactivate</span>
                                </button>
                              )}

                              {inst.status === 'Rejected' && (
                                <button onClick={() => handleAction(inst._id, 'Approved')} className="btn btn-secondary btn-sm" disabled={actionLoading === inst._id} title="Re-approve institution">
                                  <RotateCcw size={14} />
                                  <span>Re-approve</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {inst.suspension_reason && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', fontSize: '0.8rem', color: '#f87171' }}>
                            <strong>Suspension Reason:</strong> {inst.suspension_reason}
                          </div>
                        )}

                        {inst.rejection_reason && (
                          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', fontSize: '0.8rem', color: '#fca5a5' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Building2 size={24} color="#818cf8" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Institutions</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{analytics?.totalInstitutions ?? 0}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <CheckCircle size={24} color="#34d399" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active / Approved</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>{analytics?.approvedInstitutions ?? 0}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Clock size={24} color="#f59e0b" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Approvals</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{analytics?.pendingInstitutions ?? 0}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <PauseCircle size={24} color="#ef4444" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suspended Accounts</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{analytics?.suspendedInstitutions ?? 0}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Users size={22} color="#818cf8" />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Enrolled Students</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#818cf8' }}>{analytics?.totalStudents ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Total active residents registered across all tenant institutions.
                </p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Building2 size={22} color="#34d399" />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Hostel Blocks</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399' }}>{analytics?.totalHostels ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Total campus hostels managed across the platform.
                </p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Bed size={22} color="#f43f5e" />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Rooms</h4>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f43f5e' }}>{analytics?.totalRooms ?? 0}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
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

