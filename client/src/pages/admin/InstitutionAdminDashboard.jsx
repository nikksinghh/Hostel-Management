import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Bed, Shield, BarChart3, Plus, Edit, Trash2,
  CheckCircle, XCircle, LogOut, RefreshCw, AlertTriangle, User,
  ChevronRight, Home, Key, DoorOpen, Search, ArrowRightLeft
} from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

/* ──────────────────────────────
   Tiny reusable sub-components
────────────────────────────── */
const Alert = ({ type, msg, onClose }) => {
  if (!msg) return null;
  const colors = {
    success: { bg: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.35)', text: '#34d399' },
    error:   { bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.35)',  text: '#f87171' },
    info:    { bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.35)', text: '#818cf8' },
  }[type] || {};
  return (
    <div style={{ padding: '.75rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}>
      <span>{msg}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem' }}>×</button>}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={22} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: '.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value ?? '—'}</div>
    </div>
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ──────────────────────────────
   Main Dashboard
────────────────────────────── */
const InstitutionAdminDashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', msg: '' });
  const [searchStudent, setSearchStudent] = useState('');

  // Modal state
  const [hostelModal, setHostelModal] = useState({ open: false, editing: null });
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_radius: '200' });

  const [roomModal, setRoomModal] = useState({ open: false, editing: null });
  const [roomForm, setRoomForm] = useState({ hostel_id: '', room_number: '', room_type: 'Double', total_beds: '' });

  const [wardenModal, setWardenModal] = useState({ open: false });
  const [wardenForm, setWardenForm] = useState({ full_name: '', email: '', password: '', phone: '', hostel: '', address: '' });

  const [assignModal, setAssignModal] = useState({ open: false, student: null });
  const [assignForm, setAssignForm] = useState({ hostel_id: '', room_id: '' });
  const [assignRooms, setAssignRooms] = useState([]);

  const [roomRequests, setRoomRequests] = useState([]);
  const [transferModal, setTransferModal] = useState({ open: false, req: null });
  const [transferForm, setTransferForm] = useState({ new_room_id: '', admin_remarks: '' });
  const [transferRooms, setTransferRooms] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDanger: true,
    hasInput: false,
    inputPlaceholder: '',
    inputValue: '',
    onConfirm: null,
  });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const setMsg = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert({ type: '', msg: '' }), 4000); };

  /* ---- Data Fetching ---- */
  const fetchStats  = useCallback(() => api.get('/admin/stats',   authHeader), [token]);
  const fetchHostels = useCallback(() => api.get('/admin/hostels', authHeader), [token]);
  const fetchWardens = useCallback(() => api.get('/admin/wardens', authHeader), [token]);
  const fetchStudents = useCallback(() => api.get('/admin/students', authHeader), [token]);
  const fetchRoomRequests = useCallback(() => api.get('/admin/room-requests', authHeader), [token]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h, w, st, rr] = await Promise.all([
        fetchStats(),
        fetchHostels(),
        fetchWardens(),
        fetchStudents(),
        fetchRoomRequests().catch(() => ({ data: { success: true, requests: [] } }))
      ]);
      if (s.data.success)   setStats(s.data.stats);
      if (h.data.success)   setHostels(h.data.hostels);
      if (w.data.success)   setWardens(w.data.wardens);
      if (st.data.success)  setStudents(st.data.students);
      if (rr.data.success)  setRoomRequests(rr.data.requests || []);
    } catch (e) {
      setMsg('error', e.response?.data?.message || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  }, [fetchStats, fetchHostels, fetchWardens, fetchStudents, fetchRoomRequests]);

  const loadRooms = useCallback(async (hostelId) => {
    if (!hostelId) return;
    try {
      const res = await api.get(`/admin/rooms?hostel_id=${hostelId}`, authHeader);
      if (res.data.success) setRooms(res.data.rooms);
    } catch (e) {
      setMsg('error', e.response?.data?.message || 'Failed to load rooms');
    }
  }, [token]);

  useEffect(() => { loadOverview(); }, []);

  useEffect(() => {
    if (tab === 'rooms' && selectedHostelId) loadRooms(selectedHostelId);
    if (tab === 'rooms' && !selectedHostelId && hostels.length > 0) {
      setSelectedHostelId(hostels[0]._id);
    }
  }, [tab, selectedHostelId, hostels]);

  /* ---- Hostel CRUD ---- */
  const openAddHostel = () => {
    setHostelForm({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_radius: '200' });
    setHostelModal({ open: true, editing: null });
  };
  const openEditHostel = (h) => {
    setHostelForm({ name: h.name, type: h.type, block_number: h.block_number, address: h.address || '', contact_number: h.contact_number || '', gps_radius: String(h.gps_radius || 200) });
    setHostelModal({ open: true, editing: h._id });
  };
  const saveHostel = async (e) => {
    e.preventDefault();
    try {
      if (hostelModal.editing) {
        await api.put(`/admin/hostels/${hostelModal.editing}`, hostelForm, authHeader);
        setMsg('success', 'Hostel updated successfully');
      } else {
        await api.post('/admin/hostels', hostelForm, authHeader);
        setMsg('success', 'Hostel created successfully');
      }
      setHostelModal({ open: false, editing: null });
      loadOverview();
    } catch (e) { setMsg('error', e.response?.data?.message || 'Save failed'); }
  };
  const deleteHostel = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Hostel',
      message: 'Are you sure you want to delete this hostel? All associated rooms must be empty.',
      confirmText: 'Delete',
      isDanger: true,
      hasInput: false,
      inputValue: '',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/hostels/${id}`, authHeader);
          setMsg('success', 'Hostel deleted');
          setConfirmDialog(p => ({ ...p, open: false }));
          loadOverview();
        } catch (e) {
          setMsg('error', e.response?.data?.message || 'Delete failed');
        }
      }
    });
  };

  /* ---- Room CRUD ---- */
  const openAddRoom = () => {
    setRoomForm({ hostel_id: selectedHostelId, room_number: '', room_type: 'Double', total_beds: '' });
    setRoomModal({ open: true, editing: null });
  };
  const openEditRoom = (r) => {
    setRoomForm({ hostel_id: r.hostel, room_number: r.room_number, room_type: r.room_type, total_beds: String(r.total_beds) });
    setRoomModal({ open: true, editing: r._id });
  };
  const saveRoom = async (e) => {
    e.preventDefault();
    try {
      if (roomModal.editing) {
        await api.put(`/admin/rooms/${roomModal.editing}`, roomForm, authHeader);
        setMsg('success', 'Room updated');
      } else {
        await api.post('/admin/rooms', roomForm, authHeader);
        setMsg('success', 'Room created');
      }
      setRoomModal({ open: false, editing: null });
      loadRooms(selectedHostelId);
    } catch (e) { setMsg('error', e.response?.data?.message || 'Save failed'); }
  };
  const deleteRoom = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Room',
      message: 'Are you sure you want to delete this room?',
      confirmText: 'Delete',
      isDanger: true,
      hasInput: false,
      inputValue: '',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/rooms/${id}`, authHeader);
          setMsg('success', 'Room deleted');
          setConfirmDialog(p => ({ ...p, open: false }));
          loadRooms(selectedHostelId);
        } catch (e) {
          setMsg('error', e.response?.data?.message || 'Delete failed');
        }
      }
    });
  };

  /* ---- Warden ---- */
  const saveWarden = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/wardens', wardenForm, authHeader);
      setMsg('success', 'Warden created successfully');
      setWardenModal({ open: false });
      setWardenForm({ full_name: '', email: '', password: '', phone: '', hostel: '', address: '' });
      loadOverview();
    } catch (e) { setMsg('error', e.response?.data?.message || 'Save failed'); }
  };
  const deleteWarden = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Remove Warden',
      message: 'Are you sure you want to remove this warden?',
      confirmText: 'Remove',
      isDanger: true,
      hasInput: false,
      inputValue: '',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/wardens/${id}`, authHeader);
          setMsg('success', 'Warden removed');
          setConfirmDialog(p => ({ ...p, open: false }));
          loadOverview();
        } catch (e) {
          setMsg('error', e.response?.data?.message || 'Delete failed');
        }
      }
    });
  };

  /* ---- Student approval ---- */
  const toggleApprove = async (studentId, current) => {
    try {
      await api.put(`/admin/students/${studentId}/approve`, { is_approved: !current }, authHeader);
      setMsg('success', `Student ${!current ? 'approved' : 'unapproved'}`);
      loadOverview();
    } catch (e) { setMsg('error', e.response?.data?.message || 'Update failed'); }
  };

  /* ---- Room assignment ---- */
  const openAssign = async (student) => {
    setAssignModal({ open: true, student });
    setAssignForm({ hostel_id: student.hostel?._id || (hostels[0]?._id ?? ''), room_id: '' });
    if (student.hostel?._id || hostels[0]?._id) {
      const hid = student.hostel?._id || hostels[0]?._id;
      try {
        const res = await api.get(`/admin/rooms?hostel_id=${hid}`, authHeader);
        if (res.data.success) setAssignRooms(res.data.rooms.filter(r => r.available_beds > 0 || String(r._id) === String(student.room?._id)));
      } catch (_) {}
    }
  };
  const submitAssign = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${assignModal.student._id}/assign-room`, assignForm, authHeader);
      setMsg('success', 'Room assigned successfully');
      setAssignModal({ open: false, student: null });
      loadOverview();
    } catch (e) { setMsg('error', e.response?.data?.message || 'Assignment failed'); }
  };

  /* ---- Room Transfer Actions ---- */
  const openTransferModal = async (req) => {
    setTransferModal({ open: true, req });
    setTransferForm({ new_room_id: '', admin_remarks: '' });
    // Fetch rooms for student's hostel
    const hid = req.student?.hostel || req.hostel || (hostels[0]?._id);
    if (hid) {
      try {
        const res = await api.get(`/admin/rooms?hostel_id=${hid}`, authHeader);
        if (res.data.success) {
          setTransferRooms(res.data.rooms.filter(r => r.available_beds > 0 && String(r._id) !== String(req.current_room?._id)));
        }
      } catch (_) {}
    }
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.new_room_id) {
      setMsg('error', 'Please select a new room for the transfer');
      return;
    }
    try {
      await api.put(
        `/admin/room-requests/${transferModal.req._id}`,
        {
          status: 'Approved',
          new_room_id: transferForm.new_room_id,
          admin_remarks: transferForm.admin_remarks,
        },
        authHeader
      );
      setMsg('success', 'Room transfer approved and bed allocated successfully');
      setTransferModal({ open: false, req: null });
      loadOverview();
    } catch (err) {
      setMsg('error', err.response?.data?.message || 'Failed to approve room transfer');
    }
  };

  const rejectTransfer = (reqId) => {
    setConfirmDialog({
      open: true,
      title: 'Reject Room Transfer',
      message: 'Provide an optional remark explaining why this room transfer is rejected:',
      confirmText: 'Reject',
      isDanger: true,
      hasInput: true,
      inputPlaceholder: 'Enter rejection remarks (optional)',
      inputValue: '',
      onConfirm: async () => {
        try {
          await api.put(
            `/admin/room-requests/${reqId}`,
            {
              status: 'Rejected',
              admin_remarks: confirmDialog.inputValue || '',
            },
            authHeader
          );
          setMsg('success', 'Room change request rejected');
          setConfirmDialog(p => ({ ...p, open: false }));
          loadOverview();
        } catch (err) {
          setMsg('error', err.response?.data?.message || 'Failed to reject room request');
        }
      }
    });
  };

  /* ---- Filtered students ---- */
  const filteredStudents = students.filter(s =>
    !searchStudent || s.full_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  /* ── Sidebar nav items ── */
  const navItems = [
    { key: 'overview',   icon: BarChart3,      label: 'Overview' },
    { key: 'hostels',    icon: Building2,      label: 'Hostels' },
    { key: 'rooms',      icon: DoorOpen,       label: 'Rooms' },
    { key: 'wardens',    icon: Shield,         label: 'Wardens' },
    { key: 'students',   icon: Users,          label: 'Students' },
    { key: 'transfers',  icon: ArrowRightLeft, label: 'Room Transfers' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: 'var(--font-body)' }}>
      <div className="bg-mesh" />

      {/* ── Sidebar ── */}
      <aside style={{ width: 260, flexShrink: 0, background: 'rgba(17,24,39,.95)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Home size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '.75rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Institution Admin</div>
              <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{user?.institution_name || 'Your Institution'}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem .75rem', overflowY: 'auto' }}>
          {navItems.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.7rem .9rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', marginBottom: '.25rem', fontWeight: 600, fontSize: '.88rem', transition: 'all .15s', background: tab === key ? 'rgba(99,102,241,.18)' : 'transparent', color: tab === key ? '#818cf8' : 'var(--text-secondary)' }}>
              <Icon size={17} />
              {label}
              {tab === key && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem .75rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.04)', marginBottom: '.65rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={16} color="#94a3b8" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxWidth: 'calc(100vw - 260px)' }}>
        <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert({ type: '', msg: '' })} />

        {loading && tab === 'overview' ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading dashboard…</div>
        ) : (
          <>
            {/* ─── OVERVIEW ─── */}
            {tab === 'overview' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h1 style={{ fontSize: '1.8rem', marginBottom: '.25rem' }}>Dashboard Overview</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem' }}>Real-time statistics for {user?.institution_name}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <StatCard icon={Users}    label="Total Students"  value={stats?.totalStudents}   color="var(--accent-gradient)" />
                  <StatCard icon={CheckCircle} label="Approved"     value={stats?.approvedStudents} color="linear-gradient(135deg,#10b981,#059669)" />
                  <StatCard icon={AlertTriangle} label="Pending"    value={stats?.pendingStudents}  color="linear-gradient(135deg,#f59e0b,#d97706)" />
                  <StatCard icon={Building2} label="Hostels"        value={stats?.totalHostels}     color="linear-gradient(135deg,#6366f1,#8b5cf6)" />
                  <StatCard icon={Bed}       label="Total Beds"     value={stats?.totalCapacity}    color="linear-gradient(135deg,#06b6d4,#3b82f6)" />
                  <StatCard icon={Shield}    label="Wardens"        value={stats?.totalWardens}     color="linear-gradient(135deg,#ec4899,#8b5cf6)" />
                </div>
                {stats && (
                  <div className="glass-card" style={{ padding: '1.5rem', maxWidth: 480 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Occupancy</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem', fontSize: '.9rem' }}>
                      <span>Occupied Beds</span><strong>{stats.occupiedBeds} / {stats.totalCapacity}</strong>
                    </div>
                    <div style={{ height: 10, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${stats.occupancyRate}%`, background: 'var(--accent-gradient)', borderRadius: 99, transition: 'width .5s' }} />
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.35rem', textAlign: 'right' }}>{stats.occupancyRate}% occupied</div>
                  </div>
                )}
              </>
            )}

            {/* ─── HOSTELS ─── */}
            {tab === 'hostels' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>Hostel Management</h2>
                  <button onClick={openAddHostel} className="btn btn-primary btn-sm"><Plus size={15} /> Add Hostel</button>
                </div>
                {hostels.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Building2 size={40} style={{ opacity: .3, margin: '0 auto 1rem' }} />
                    <p>No hostels yet. Add your first hostel.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {hostels.map(h => (
                      <div key={h._id} className="glass-card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                          <div>
                            <span className={`badge ${h.type === 'Boys' ? 'badge-info' : h.type === 'Girls' ? 'badge-purple' : 'badge-success'}`} style={{ marginBottom: '.35rem' }}>{h.type}</span>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{h.name}</h3>
                            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Block {h.block_number}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '.5rem' }}>
                            <button onClick={() => openEditHostel(h)} className="btn btn-secondary btn-sm"><Edit size={13} /></button>
                            <button onClick={() => deleteHostel(h._id)} className="btn btn-danger btn-sm"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                          <span>🏠 {h.studentsCount ?? 0} students</span>
                          <span>🛏 {h.totalBeds ?? 0} beds</span>
                          <span>✅ {h.availableBeds ?? 0} available</span>
                        </div>
                        <button onClick={() => { setTab('rooms'); setSelectedHostelId(h._id); }} className="btn btn-ghost btn-sm" style={{ marginTop: '.75rem', width: '100%' }}>
                          View Rooms <ChevronRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─── ROOMS ─── */}
            {tab === 'rooms' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>Room Management</h2>
                  <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={selectedHostelId} onChange={e => setSelectedHostelId(e.target.value)}>
                      {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                    <button onClick={() => loadRooms(selectedHostelId)} className="btn btn-secondary btn-sm"><RefreshCw size={13} /></button>
                    <button onClick={openAddRoom} className="btn btn-primary btn-sm" disabled={!selectedHostelId}><Plus size={15} /> Add Room</button>
                  </div>
                </div>
                {rooms.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <DoorOpen size={40} style={{ opacity: .3, margin: '0 auto 1rem' }} />
                    <p>No rooms in this hostel. Add your first room.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Room No.</th><th>Type</th><th>Total Beds</th><th>Available</th><th>Occupied</th><th>Occupants</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(r => (
                          <tr key={r._id}>
                            <td><strong>{r.room_number}</strong></td>
                            <td><span className="badge badge-info">{r.room_type}</span></td>
                            <td>{r.total_beds}</td>
                            <td><span style={{ color: r.available_beds > 0 ? '#34d399' : '#f87171' }}>{r.available_beds}</span></td>
                            <td>{r.total_beds - r.available_beds}</td>
                            <td style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{r.occupants?.map(o => o.full_name).join(', ') || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '.5rem' }}>
                                <button onClick={() => openEditRoom(r)} className="btn btn-secondary btn-sm"><Edit size={13} /></button>
                                <button onClick={() => deleteRoom(r._id)} className="btn btn-danger btn-sm"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ─── WARDENS ─── */}
            {tab === 'wardens' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>Warden Management</h2>
                  <button onClick={() => setWardenModal({ open: true })} className="btn btn-primary btn-sm"><Plus size={15} /> Add Warden</button>
                </div>
                {wardens.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><Shield size={40} style={{ opacity: .3, margin: '0 auto 1rem' }} /><p>No wardens yet.</p></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Assigned Hostel</th><th>Actions</th></tr></thead>
                      <tbody>
                        {wardens.map(w => (
                          <tr key={w._id}>
                            <td><strong>{w.full_name}</strong></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{w.email}</td>
                            <td>{w.phone}</td>
                            <td>{w.hostel ? <span className="badge badge-success">{w.hostel.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Unassigned</span>}</td>
                            <td><button onClick={() => deleteWarden(w._id)} className="btn btn-danger btn-sm"><Trash2 size={13} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ─── STUDENTS ─── */}
            {tab === 'students' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>Student Management</h2>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-input" style={{ paddingLeft: '2.25rem', width: 260 }} placeholder="Search name / roll / email…" value={searchStudent} onChange={e => setSearchStudent(e.target.value)} />
                  </div>
                </div>
                {filteredStudents.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><Users size={40} style={{ opacity: .3, margin: '0 auto 1rem' }} /><p>No students found.</p></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>Roll No.</th><th>Dept.</th><th>Hostel</th><th>Room</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredStudents.map(s => (
                          <tr key={s._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{s.roll_number}</td>
                            <td style={{ fontSize: '.85rem' }}>{s.department}</td>
                            <td>{s.hostel ? <span style={{ fontSize: '.8rem' }}>{s.hostel.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>—</span>}</td>
                            <td>{s.room ? <span style={{ fontSize: '.8rem' }}>{s.room.room_number}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>—</span>}</td>
                            <td>
                              {s.is_approved
                                ? <span className="badge badge-success">Approved</span>
                                : <span className="badge badge-warning">Pending</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                                <button onClick={() => toggleApprove(s._id, s.is_approved)} className={`btn btn-sm ${s.is_approved ? 'btn-secondary' : 'btn-success'}`}>
                                  {s.is_approved ? <XCircle size={13} /> : <CheckCircle size={13} />}
                                  {s.is_approved ? 'Revoke' : 'Approve'}
                                </button>
                                {s.is_approved && (
                                  <button onClick={() => openAssign(s)} className="btn btn-secondary btn-sm"><Key size={13} /> Assign Room</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ─── ROOM TRANSFERS ─── */}
            {tab === 'transfers' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '.25rem' }}>Room Change & Transfer Requests</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Review student room change applications with real-time bed balancing.</p>
                  </div>
                  <button onClick={loadOverview} className="btn btn-secondary btn-sm"><RefreshCw size={13} /> Refresh</button>
                </div>

                {roomRequests.length === 0 ? (
                  <div className="glass-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ArrowRightLeft size={44} style={{ opacity: .3, margin: '0 auto 1rem' }} />
                    <p>No room transfer requests recorded for your institution.</p>
                  </div>
                ) : (
                  <div className="glass-card" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Current Room</th>
                          <th>Preferred Type</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomRequests.map(req => {
                          const statusClass =
                            req.status === 'Approved' ? 'badge-success' :
                            req.status === 'Pending' ? 'badge-warning' : 'badge-danger';

                          return (
                            <tr key={req._id}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{req.student?.full_name || 'N/A'}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{req.student?.roll_number} • {req.student?.phone}</div>
                              </td>
                              <td>{req.current_room?.room_number ? `${req.current_room.room_number} (${req.current_room.room_type})` : 'Unassigned'}</td>
                              <td>{req.preferred_room_type || 'Single'}</td>
                              <td style={{ maxWidth: '240px', fontSize: '.85rem' }}>{req.reason}</td>
                              <td><span className={`badge ${statusClass}`}>{req.status}</span></td>
                              <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                              <td>
                                {req.status === 'Pending' ? (
                                  <div style={{ display: 'flex', gap: '.4rem' }}>
                                    <button onClick={() => openTransferModal(req)} className="btn btn-success btn-sm">
                                      <CheckCircle size={13} /> Approve
                                    </button>
                                    <button onClick={() => rejectTransfer(req._id)} className="btn btn-danger btn-sm">
                                      <XCircle size={13} /> Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                                    {req.target_room ? `Allocated to ${req.target_room.room_number}` : 'Closed'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* ─── MODALS ─── */}

      {/* Hostel Modal */}
      <Modal open={hostelModal.open} title={hostelModal.editing ? 'Edit Hostel' : 'Add New Hostel'} onClose={() => setHostelModal({ open: false, editing: null })}>
        <form onSubmit={saveHostel}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Hostel Name</label>
              <input className="form-input" required value={hostelForm.name} onChange={e => setHostelForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Sunrise Boys Hostel" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={hostelForm.type} onChange={e => setHostelForm(p => ({...p, type: e.target.value}))}>
                <option>Boys</option><option>Girls</option><option>Co-ed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Block Number</label>
              <input className="form-input" required value={hostelForm.block_number} onChange={e => setHostelForm(p => ({...p, block_number: e.target.value}))} placeholder="e.g. A1" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Address</label>
              <input className="form-input" value={hostelForm.address} onChange={e => setHostelForm(p => ({...p, address: e.target.value}))} placeholder="Hostel address" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input className="form-input" value={hostelForm.contact_number} onChange={e => setHostelForm(p => ({...p, contact_number: e.target.value}))} placeholder="+91 …" />
            </div>
            <div className="form-group">
              <label className="form-label">GPS Radius (meters)</label>
              <input className="form-input" type="number" value={hostelForm.gps_radius} onChange={e => setHostelForm(p => ({...p, gps_radius: e.target.value}))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setHostelModal({ open: false, editing: null })} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">{hostelModal.editing ? 'Save Changes' : 'Create Hostel'}</button>
          </div>
        </form>
      </Modal>

      {/* Room Modal */}
      <Modal open={roomModal.open} title={roomModal.editing ? 'Edit Room' : 'Add New Room'} onClose={() => setRoomModal({ open: false, editing: null })}>
        <form onSubmit={saveRoom}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            {!roomModal.editing && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Hostel</label>
                <select className="form-select" required value={roomForm.hostel_id} onChange={e => setRoomForm(p => ({...p, hostel_id: e.target.value}))}>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input className="form-input" required value={roomForm.room_number} onChange={e => setRoomForm(p => ({...p, room_number: e.target.value}))} placeholder="e.g. 101" />
            </div>
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select className="form-select" value={roomForm.room_type} onChange={e => setRoomForm(p => ({...p, room_type: e.target.value}))}>
                <option>Single</option><option>Double</option><option>Triple</option><option>Four Bed</option><option>Dormitory</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Total Beds</label>
              <input className="form-input" type="number" min="1" required value={roomForm.total_beds} onChange={e => setRoomForm(p => ({...p, total_beds: e.target.value}))} placeholder="e.g. 2" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setRoomModal({ open: false, editing: null })} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">{roomModal.editing ? 'Save Changes' : 'Create Room'}</button>
          </div>
        </form>
      </Modal>

      {/* Warden Modal */}
      <Modal open={wardenModal.open} title="Add New Warden" onClose={() => setWardenModal({ open: false })}>
        <form onSubmit={saveWarden}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name</label>
              <input className="form-input" required value={wardenForm.full_name} onChange={e => setWardenForm(p => ({...p, full_name: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required value={wardenForm.email} onChange={e => setWardenForm(p => ({...p, email: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required minLength="6" value={wardenForm.password} onChange={e => setWardenForm(p => ({...p, password: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" required value={wardenForm.phone} onChange={e => setWardenForm(p => ({...p, phone: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign to Hostel</label>
              <select className="form-select" value={wardenForm.hostel} onChange={e => setWardenForm(p => ({...p, hostel: e.target.value}))}>
                <option value="">— Unassigned —</option>
                {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setWardenModal({ open: false })} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Create Warden</button>
          </div>
        </form>
      </Modal>

      {/* Assign Room Modal */}
      <Modal open={assignModal.open} title={`Assign Room — ${assignModal.student?.full_name}`} onClose={() => setAssignModal({ open: false, student: null })}>
        <form onSubmit={submitAssign}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div className="form-group">
              <label className="form-label">Hostel</label>
              <select className="form-select" value={assignForm.hostel_id} onChange={async e => {
                const hid = e.target.value;
                setAssignForm(p => ({...p, hostel_id: hid, room_id: ''}));
                const res = await api.get(`/admin/rooms?hostel_id=${hid}`, authHeader);
                if (res.data.success) setAssignRooms(res.data.rooms.filter(r => r.available_beds > 0));
              }}>
                {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Room</label>
              <select className="form-select" value={assignForm.room_id} onChange={e => setAssignForm(p => ({...p, room_id: e.target.value}))} required>
                <option value="">— Select Room —</option>
                {assignRooms.map(r => <option key={r._id} value={r._id}>{r.room_number} ({r.room_type}) — {r.available_beds} beds available</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setAssignModal({ open: false, student: null })} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Assign Room</button>
          </div>
        </form>
      </Modal>

      {/* Transfer Room Modal */}
      <Modal
        open={transferModal.open}
        title={`Approve Room Transfer — ${transferModal.req?.student?.full_name}`}
        onClose={() => setTransferModal({ open: false, req: null })}
      >
        <form onSubmit={submitTransfer}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div style={{ padding: '.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,.04)', fontSize: '.85rem' }}>
              <div><strong>Current Room:</strong> {transferModal.req?.current_room?.room_number || 'None'}</div>
              <div><strong>Preferred Type:</strong> {transferModal.req?.preferred_room_type || 'Single'}</div>
              <div><strong>Reason:</strong> {transferModal.req?.reason}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Select Destination Room *</label>
              <select
                className="form-select"
                value={transferForm.new_room_id}
                onChange={e => setTransferForm(p => ({ ...p, new_room_id: e.target.value }))}
                required
              >
                <option value="">— Select Target Room with Available Beds —</option>
                {transferRooms.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.room_number} ({r.room_type}) — {r.available_beds} beds available
                  </option>
                ))}
              </select>
              {transferRooms.length === 0 && (
                <div style={{ fontSize: '.75rem', color: '#f87171', marginTop: '.35rem' }}>
                  No available rooms found with empty beds in this hostel.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Approval Remarks</label>
              <input
                className="form-input"
                value={transferForm.admin_remarks}
                onChange={e => setTransferForm(p => ({ ...p, admin_remarks: e.target.value }))}
                placeholder="e.g. Approved transfer to requested floor"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setTransferModal({ open: false, req: null })} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-success btn-sm" disabled={!transferForm.new_room_id}>
              Confirm Transfer
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDanger={confirmDialog.isDanger}
        hasInput={confirmDialog.hasInput}
        inputPlaceholder={confirmDialog.inputPlaceholder}
        inputValue={confirmDialog.inputValue}
        onInputChange={(val) => setConfirmDialog(p => ({ ...p, inputValue: val }))}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(p => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default InstitutionAdminDashboard;
