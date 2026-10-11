import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Bed, Shield, BarChart3, Plus, Edit, Trash2,
  CheckCircle, XCircle, LogOut, RefreshCw, AlertTriangle, User,
  ChevronRight, Home, Key, DoorOpen, Search, ArrowRightLeft, Menu, X
} from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

/* ──────────────────────────────
   Reusable Sub-Components
────────────────────────────── */
const Alert = ({ type, msg, onClose }) => {
  if (!msg) return null;
  const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
  return (
    <div className={alertClass} style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <span>{msg}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem', lineHeight: 1 }}>
          ×
        </button>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, bg = '#EEF2FF', iconColor = 'var(--primary)' }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={22} color={iconColor} />
    </div>
    <div>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
        {value ?? '—'}
      </div>
    </div>
  </div>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ──────────────────────────────
   Main Institution Admin Dashboard
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modal states
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

  const setMsg = (type, msg) => { 
    setAlert({ type, msg }); 
    setTimeout(() => setAlert({ type: '', msg: '' }), 4000); 
  };

  /* ---- Data Fetching ---- */
  const fetchStats  = useCallback(() => api.get('/admin/stats', authHeader), [token]);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Mobile Drawer Overlay */}
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

      {/* ── Sidebar ── */}
      <aside 
        className="dashboard-sidebar"
        style={{
          width: 270,
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={20} color="#fff" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>INSTITUTION ADMIN</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.institution_name || 'CampusHome'}
              </div>
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

        <nav style={{ flex: 1, padding: '1.25rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map(({ key, icon: Icon, label }) => (
            <button 
              key={key} 
              onClick={() => { setTab(key); setMobileSidebarOpen(false); }} 
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', 
                border: 'none', 
                cursor: 'pointer', 
                fontWeight: 600, 
                fontSize: '0.9rem', 
                transition: 'var(--transition)', 
                background: tab === key ? 'var(--primary)' : 'transparent', 
                color: tab === key ? '#FFFFFF' : '#94A3B8',
                textAlign: 'left'
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {tab === key && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#94A3B8" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/login'); }} 
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
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main 
        className="dashboard-main"
        style={{ 
          flex: 1, 
          marginLeft: 270, 
          padding: '2rem', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Mobile Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                {tab === 'overview' && 'Dashboard Overview'}
                {tab === 'hostels' && 'Hostel Management'}
                {tab === 'rooms' && 'Room Inventory'}
                {tab === 'wardens' && 'Wardens Roster'}
                {tab === 'students' && 'Students Directory'}
                {tab === 'transfers' && 'Room Transfers'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>
                {user?.institution_name || 'Tenant Management Console'}
              </p>
            </div>
          </div>

          <button onClick={loadOverview} className="btn-secondary" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert({ type: '', msg: '' })} />

        {loading && tab === 'overview' ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading dashboard data…</div>
          </div>
        ) : (
          <>
            {/* ─── OVERVIEW ─── */}
            {tab === 'overview' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <StatCard icon={Users} label="Total Students" value={stats?.totalStudents} bg="#EEF2FF" iconColor="var(--primary)" />
                  <StatCard icon={CheckCircle} label="Approved" value={stats?.approvedStudents} bg="#ECFDF5" iconColor="var(--success)" />
                  <StatCard icon={AlertTriangle} label="Pending Students" value={stats?.pendingStudents} bg="#FEF3C7" iconColor="var(--warning)" />
                  <StatCard icon={Building2} label="Hostel Blocks" value={stats?.totalHostels} bg="#F0FDFA" iconColor="var(--secondary)" />
                  <StatCard icon={Bed} label="Total Capacity" value={stats?.totalCapacity} bg="#EEF2FF" iconColor="var(--primary)" />
                  <StatCard icon={Shield} label="Active Wardens" value={stats?.totalWardens} bg="#FDF2F8" iconColor="#DB2777" />
                </div>

                {stats && (
                  <div className="card" style={{ padding: '1.75rem', maxWidth: 540 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Campus Bed Occupancy</h3>
                      <span className="badge badge-indigo">{stats.occupancyRate}% Full</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>Allocated Beds:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{stats.occupiedBeds} / {stats.totalCapacity}</strong>
                    </div>

                    <div style={{ height: 10, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div style={{ height: '100%', width: `${stats.occupancyRate}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Available vacant beds: {Math.max(0, (stats.totalCapacity || 0) - (stats.occupiedBeds || 0))}</span>
                      <span>Target: 100%</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─── HOSTELS ─── */}
            {tab === 'hostels' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Manage campus residence blocks, types, and geographic GPS fencing.</p>
                  <button onClick={openAddHostel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                    <Plus size={16} /> Add New Hostel
                  </button>
                </div>

                {hostels.length === 0 ? (
                  <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Building2 size={44} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hostel blocks registered yet.</p>
                    <button onClick={openAddHostel} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}>Add First Hostel</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {hostels.map(h => (
                      <div key={h._id} className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <span className={`badge ${h.type === 'Boys' ? 'badge-indigo' : h.type === 'Girls' ? 'badge-purple' : 'badge-teal'}`} style={{ marginBottom: '0.5rem' }}>
                              {h.type} Hostel
                            </span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{h.name}</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Block {h.block_number}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => openEditHostel(h)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '8px' }} title="Edit Hostel">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => deleteHostel(h._id)} className="btn-danger" style={{ padding: '0.4rem', borderRadius: '8px' }} title="Delete Hostel">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          <span>👥 {h.studentsCount ?? 0} Students</span>
                          <span>🛏 {h.totalBeds ?? 0} Beds</span>
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✅ {h.availableBeds ?? 0} Free</span>
                        </div>

                        <button 
                          onClick={() => { setTab('rooms'); setSelectedHostelId(h._id); }} 
                          className="btn-secondary" 
                          style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                        >
                          Manage Rooms <ChevronRight size={14} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Block:</label>
                    <select className="form-select" style={{ width: 'auto', minWidth: 220 }} value={selectedHostelId} onChange={e => setSelectedHostelId(e.target.value)}>
                      {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                    </select>
                    <button onClick={() => loadRooms(selectedHostelId)} className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }} title="Reload rooms">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <button onClick={openAddRoom} className="btn-primary" disabled={!selectedHostelId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                    <Plus size={16} /> Add Room
                  </button>
                </div>

                {rooms.length === 0 ? (
                  <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <DoorOpen size={44} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>No rooms registered in this hostel block.</p>
                    <button onClick={openAddRoom} className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Room</button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Room Number</th>
                          <th>Layout Type</th>
                          <th>Capacity</th>
                          <th>Available Beds</th>
                          <th>Occupied Beds</th>
                          <th>Current Residents</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(r => (
                          <tr key={r._id}>
                            <td><strong style={{ color: 'var(--text-primary)' }}>{r.room_number}</strong></td>
                            <td><span className="badge badge-indigo">{r.room_type}</span></td>
                            <td>{r.total_beds}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: r.available_beds > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {r.available_beds}
                              </span>
                            </td>
                            <td>{r.total_beds - r.available_beds}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                              {r.occupants?.map(o => o.full_name).join(', ') || '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button onClick={() => openEditRoom(r)} className="btn-secondary" style={{ padding: '0.35rem 0.5rem' }} title="Edit Room">
                                  <Edit size={13} />
                                </button>
                                <button onClick={() => deleteRoom(r._id)} className="btn-danger" style={{ padding: '0.35rem 0.5rem' }} title="Delete Room">
                                  <Trash2 size={13} />
                                </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Designate supervisory wardens responsible for attendance, leaves, and mess operations.</p>
                  <button onClick={() => setWardenModal({ open: true })} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}>
                    <Plus size={16} /> Add Warden Account
                  </button>
                </div>

                {wardens.length === 0 ? (
                  <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Shield size={44} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>No wardens configured for this institution.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Warden Name</th>
                          <th>Email Address</th>
                          <th>Contact Phone</th>
                          <th>Assigned Hostel Block</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wardens.map(w => (
                          <tr key={w._id}>
                            <td><strong style={{ color: 'var(--text-primary)' }}>{w.full_name}</strong></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{w.email}</td>
                            <td>{w.phone}</td>
                            <td>
                              {w.hostel ? (
                                <span className="badge badge-teal">{w.hostel.name}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                              )}
                            </td>
                            <td>
                              <button onClick={() => deleteWarden(w._id)} className="btn-danger" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} title="Remove Warden">
                                <Trash2 size={13} /> Remove
                              </button>
                            </td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      className="form-input" 
                      style={{ paddingLeft: '2.5rem', width: 280 }} 
                      placeholder="Search name, roll, email…" 
                      value={searchStudent} 
                      onChange={e => setSearchStudent(e.target.value)} 
                    />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Showing {filteredStudents.length} of {students.length} students
                  </span>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Users size={44} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>No students found matching your search.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Resident Student</th>
                          <th>Roll Number</th>
                          <th>Department</th>
                          <th>Hostel Block</th>
                          <th>Room</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(s => (
                          <tr key={s._id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.roll_number}</td>
                            <td style={{ fontSize: '0.85rem' }}>{s.department}</td>
                            <td>{s.hostel ? <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.hostel.name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                            <td>{s.room ? <span className="badge badge-indigo">Room {s.room.room_number}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                            <td>
                              {s.is_approved ? (
                                <span className="badge badge-success">Approved</span>
                              ) : (
                                <span className="badge badge-warning">Pending Review</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button 
                                  onClick={() => toggleApprove(s._id, s.is_approved)} 
                                  className={s.is_approved ? 'btn-secondary' : 'btn-primary'}
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: !s.is_approved ? 'var(--success)' : undefined, borderColor: !s.is_approved ? 'var(--success)' : undefined }}
                                >
                                  {s.is_approved ? <XCircle size={13} /> : <CheckCircle size={13} />}
                                  {s.is_approved ? 'Revoke' : 'Approve'}
                                </button>
                                {s.is_approved && (
                                  <button onClick={() => openAssign(s)} className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Key size={13} /> Assign Room
                                  </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    Approve or decline student room reallocation requests with atomic bed availability balancing.
                  </p>
                  <button onClick={loadOverview} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                    <RefreshCw size={14} /> Refresh Requests
                  </button>
                </div>

                {roomRequests.length === 0 ? (
                  <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <ArrowRightLeft size={44} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600 }}>No room transfer requests recorded.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Applicant Student</th>
                          <th>Current Room</th>
                          <th>Desired Layout</th>
                          <th>Stated Reason</th>
                          <th>Status</th>
                          <th>Submission Date</th>
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
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.student?.full_name || 'N/A'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{req.student?.roll_number} • {req.student?.phone}</div>
                              </td>
                              <td>{req.current_room?.room_number ? `${req.current_room.room_number} (${req.current_room.room_type})` : 'Unassigned'}</td>
                              <td><span className="badge badge-indigo">{req.preferred_room_type || 'Single'}</span></td>
                              <td style={{ maxWidth: '240px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.reason}</td>
                              <td><span className={`badge ${statusClass}`}>{req.status}</span></td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                              <td>
                                {req.status === 'Pending' ? (
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button 
                                      onClick={() => openTransferModal(req)} 
                                      className="btn-primary" 
                                      style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                      <CheckCircle size={13} /> Approve
                                    </button>
                                    <button 
                                      onClick={() => rejectTransfer(req._id)} 
                                      className="btn-danger" 
                                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                      <XCircle size={13} /> Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {req.target_room ? `Allocated to Room ${req.target_room.room_number}` : 'Closed'}
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
      <Modal open={hostelModal.open} title={hostelModal.editing ? 'Edit Hostel Details' : 'Add New Hostel Block'} onClose={() => setHostelModal({ open: false, editing: null })}>
        <form onSubmit={saveHostel}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Hostel Block Name *</label>
              <input className="form-input" required value={hostelForm.name} onChange={e => setHostelForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Sunrise Boys Hostel" />
            </div>
            <div>
              <label className="form-label">Resident Type *</label>
              <select className="form-select" value={hostelForm.type} onChange={e => setHostelForm(p => ({...p, type: e.target.value}))}>
                <option>Boys</option>
                <option>Girls</option>
                <option>Co-ed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Block Number / Identifier *</label>
              <input className="form-input" required value={hostelForm.block_number} onChange={e => setHostelForm(p => ({...p, block_number: e.target.value}))} placeholder="e.g. Block A" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Location Address</label>
              <input className="form-input" value={hostelForm.address} onChange={e => setHostelForm(p => ({...p, address: e.target.value}))} placeholder="North Campus, Gate 2" />
            </div>
            <div>
              <label className="form-label">Desk Contact Number</label>
              <input className="form-input" value={hostelForm.contact_number} onChange={e => setHostelForm(p => ({...p, contact_number: e.target.value}))} placeholder="+91 …" />
            </div>
            <div>
              <label className="form-label">GPS Geofence Radius (meters)</label>
              <input className="form-input" type="number" value={hostelForm.gps_radius} onChange={e => setHostelForm(p => ({...p, gps_radius: e.target.value}))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setHostelModal({ open: false, editing: null })} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>{hostelModal.editing ? 'Save Changes' : 'Create Hostel'}</button>
          </div>
        </form>
      </Modal>

      {/* Room Modal */}
      <Modal open={roomModal.open} title={roomModal.editing ? 'Edit Room' : 'Add New Room'} onClose={() => setRoomModal({ open: false, editing: null })}>
        <form onSubmit={saveRoom}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {!roomModal.editing && (
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Hostel Block *</label>
                <select className="form-select" required value={roomForm.hostel_id} onChange={e => setRoomForm(p => ({...p, hostel_id: e.target.value}))}>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="form-label">Room Number *</label>
              <input className="form-input" required value={roomForm.room_number} onChange={e => setRoomForm(p => ({...p, room_number: e.target.value}))} placeholder="e.g. 101" />
            </div>
            <div>
              <label className="form-label">Room Type *</label>
              <select className="form-select" value={roomForm.room_type} onChange={e => setRoomForm(p => ({...p, room_type: e.target.value}))}>
                <option>Single</option>
                <option>Double</option>
                <option>Triple</option>
                <option>Four Bed</option>
                <option>Dormitory</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Total Bed Capacity *</label>
              <input className="form-input" type="number" min="1" required value={roomForm.total_beds} onChange={e => setRoomForm(p => ({...p, total_beds: e.target.value}))} placeholder="e.g. 2" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setRoomModal({ open: false, editing: null })} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>{roomModal.editing ? 'Save Changes' : 'Create Room'}</button>
          </div>
        </form>
      </Modal>

      {/* Warden Modal */}
      <Modal open={wardenModal.open} title="Add New Warden" onClose={() => setWardenModal({ open: false })}>
        <form onSubmit={saveWarden}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={wardenForm.full_name} onChange={e => setWardenForm(p => ({...p, full_name: e.target.value}))} placeholder="e.g. Mr. Robert Kumar" />
            </div>
            <div>
              <label className="form-label">Email Address *</label>
              <input className="form-input" type="email" required value={wardenForm.email} onChange={e => setWardenForm(p => ({...p, email: e.target.value}))} placeholder="warden@institution.edu" />
            </div>
            <div>
              <label className="form-label">Password * (min 6 chars)</label>
              <input className="form-input" type="password" required minLength="6" value={wardenForm.password} onChange={e => setWardenForm(p => ({...p, password: e.target.value}))} placeholder="••••••••" />
            </div>
            <div>
              <label className="form-label">Contact Phone *</label>
              <input className="form-input" required value={wardenForm.phone} onChange={e => setWardenForm(p => ({...p, phone: e.target.value}))} placeholder="+91 …" />
            </div>
            <div>
              <label className="form-label">Assign to Hostel Block</label>
              <select className="form-select" value={wardenForm.hostel} onChange={e => setWardenForm(p => ({...p, hostel: e.target.value}))}>
                <option value="">— Unassigned —</option>
                {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setWardenModal({ open: false })} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Create Warden</button>
          </div>
        </form>
      </Modal>

      {/* Assign Room Modal */}
      <Modal open={assignModal.open} title={`Assign Bed — ${assignModal.student?.full_name}`} onClose={() => setAssignModal({ open: false, student: null })}>
        <form onSubmit={submitAssign}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Hostel Block *</label>
              <select className="form-select" value={assignForm.hostel_id} onChange={async e => {
                const hid = e.target.value;
                setAssignForm(p => ({...p, hostel_id: hid, room_id: ''}));
                const res = await api.get(`/admin/rooms?hostel_id=${hid}`, authHeader);
                if (res.data.success) setAssignRooms(res.data.rooms.filter(r => r.available_beds > 0));
              }}>
                {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Select Available Room *</label>
              <select className="form-select" value={assignForm.room_id} onChange={e => setAssignForm(p => ({...p, room_id: e.target.value}))} required>
                <option value="">— Select Room with Vacancy —</option>
                {assignRooms.map(r => <option key={r._id} value={r._id}>{r.room_number} ({r.room_type}) — {r.available_beds} beds free</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={() => setAssignModal({ open: false, student: null })} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }} disabled={!assignForm.room_id}>Assign Room</button>
          </div>
        </form>
      </Modal>

      {/* Transfer Room Modal */}
      <Modal
        open={transferModal.open}
        title={`Approve Room Reallocation — ${transferModal.req?.student?.full_name}`}
        onClose={() => setTransferModal({ open: false, req: null })}
      >
        <form onSubmit={submitTransfer}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: '#F8FAFC', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <div><strong>Current Room:</strong> {transferModal.req?.current_room?.room_number || 'None'}</div>
              <div><strong>Preferred Type:</strong> {transferModal.req?.preferred_room_type || 'Single'}</div>
              <div><strong>Student Reason:</strong> {transferModal.req?.reason}</div>
            </div>

            <div>
              <label className="form-label">Target Destination Room *</label>
              <select
                className="form-select"
                value={transferForm.new_room_id}
                onChange={e => setTransferForm(p => ({ ...p, new_room_id: e.target.value }))}
                required
              >
                <option value="">— Select Target Room with Empty Beds —</option>
                {transferRooms.map(r => (
                  <option key={r._id} value={r._id}>
                    Room {r.room_number} ({r.room_type}) — {r.available_beds} vacant beds
                  </option>
                ))}
              </select>
              {transferRooms.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.35rem' }}>
                  No available vacant rooms found in this hostel block.
                </div>
              )}
            </div>

            <div>
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
            <button type="button" onClick={() => setTransferModal({ open: false, req: null })} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.5rem 1.25rem' }} disabled={!transferForm.new_room_id}>
              Confirm Reallocation
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
