import React, { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import StatsCard from '../../components/common/StatsCard';
import Modal from '../../components/common/Modal';
import api from '../../api/axios';
import {
  Users,
  Building2,
  Shield,
  CreditCard,
  AlertTriangle,
  FileText,
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  Search,
  Bed,
  MapPin,
  Compass,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  Bell,
  Megaphone
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'hostels' | 'wardens' | 'students' | 'requests' | 'logs'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [roomRequests, setRoomRequests] = useState([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterHostel, setFilterHostel] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Modals state
  const [isHostelModalOpen, setIsHostelModalOpen] = useState(false);
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_latitude: '31.6340', gps_longitude: '74.8723', gps_radius: '200' });
  const [editingHostelId, setEditingHostelId] = useState(null);

  const [isWardenModalOpen, setIsWardenModalOpen] = useState(false);
  const [wardenForm, setWardenForm] = useState({ full_name: '', email: '', password: '', phone: '', hostel: '', address: '' });

  const [isAssignRoomModalOpen, setIsAssignRoomModalOpen] = useState(false);
  const [selectedStudentForRoom, setSelectedStudentForRoom] = useState(null);
  const [assignForm, setAssignForm] = useState({ hostel_id: '', room_id: '' });
  const [availableRoomsForAssign, setAvailableRoomsForAssign] = useState([]);

  const [notices, setNotices] = useState([]);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', category: 'General', target_hostel: '', is_pinned: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, hostelsRes, wardensRes, studentsRes, logsRes, reqRes, noticesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/hostels'),
        api.get('/admin/wardens'),
        api.get('/admin/students'),
        api.get('/admin/logs'),
        api.get('/admin/room-requests'),
        api.get('/notices'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (hostelsRes.data.success) setHostels(hostelsRes.data.hostels);
      if (wardensRes.data.success) setWardens(wardensRes.data.wardens);
      if (studentsRes.data.success) setStudents(studentsRes.data.students);
      if (logsRes.data.success) setLogs(logsRes.data.logs);
      if (reqRes.data.success) setRoomRequests(reqRes.data.requests);
      if (noticesRes.data.success) setNotices(noticesRes.data.notices);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveHostel = async (e) => {
    e.preventDefault();
    try {
      if (editingHostelId) {
        await api.put(`/admin/hostels/${editingHostelId}`, hostelForm);
        setStatusMsg('Hostel details updated successfully!');
      } else {
        await api.post('/admin/hostels', hostelForm);
        setStatusMsg('New Hostel added successfully!');
      }
      setIsHostelModalOpen(false);
      setEditingHostelId(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving hostel');
    }
  };

  const handleDeleteHostel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hostel?')) return;
    try {
      const res = await api.delete(`/admin/hostels/${id}`);
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSaveWarden = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/wardens', wardenForm);
      setStatusMsg('New Warden account created!');
      setIsWardenModalOpen(false);
      setWardenForm({ full_name: '', email: '', password: '', phone: '', hostel: '', address: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding warden');
    }
  };

  const handleDeleteWarden = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warden?')) return;
    try {
      await api.delete(`/admin/wardens/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStudentApproval = async (studentId, currentStatus) => {
    try {
      await api.put(`/admin/students/${studentId}/approve`, {
        is_approved: !currentStatus,
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval update failed');
    }
  };

  const openAssignRoomModal = async (student) => {
    setSelectedStudentForRoom(student);
    setAssignForm({
      hostel_id: student.hostel?._id || '',
      room_id: student.room?._id || '',
    });
    if (student.hostel?._id) {
      try {
        const res = await api.get('/warden/rooms', { headers: { 'X-Hostel-Id': student.hostel._id } });
        if (res.data.success) setAvailableRoomsForAssign(res.data.rooms);
      } catch (err) {}
    }
    setIsAssignRoomModalOpen(true);
  };

  const handleAssignRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/students/${selectedStudentForRoom._id}/assign-room`, assignForm);
      setIsAssignRoomModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign room');
    }
  };

  const handleProcessRoomRequest = async (requestId, status) => {
    try {
      await api.put(`/admin/room-requests/${requestId}`, { status });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Request update failed');
    }
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notices', noticeForm);
      setIsNoticeModalOpen(false);
      setNoticeForm({ title: '', content: '', category: 'General', target_hostel: '', is_pinned: false });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error posting notice');
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete notice');
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchQuery =
      s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchStudent.toLowerCase());
    const matchHostel = filterHostel ? s.hostel?._id === filterHostel : true;
    return matchQuery && matchHostel;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', flex: 1 }}>
        
        {/* Admin Header Card */}
        <div className="card" style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge badge-indigo">Campus Master Control</span>
              <span className="badge badge-teal">Live Multi-Hostel Node</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Institution Administration Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0 0' }}>
              Campus residential ecosystem operations, student admissions, hostel blocks & telemetry
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                setEditingHostelId(null);
                setHostelForm({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_latitude: '31.6340', gps_longitude: '74.8723', gps_radius: '200' });
                setIsHostelModalOpen(true);
              }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
            >
              <Plus size={16} />
              <span>New Block</span>
            </button>
            <button
              onClick={loadData}
              className="btn-primary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem' }}>×</button>
          </div>
        )}

        {/* Top Metric Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            <StatsCard
              title="Registered Students"
              value={stats.totalStudents || 0}
              subtitle={`${stats.approvedStudents || 0} Approved | ${stats.pendingStudents || 0} Pending`}
              icon={Users}
              color="indigo"
              badgeText={`${stats.approvedStudents || 0} Active`}
              badgeColor="success"
            />
            <StatsCard
              title="Hostel Blocks"
              value={stats.totalHostels || 0}
              subtitle="Managed residential units"
              icon={Building2}
              color="purple"
            />
            <StatsCard
              title="Total Beds Capacity"
              value={`${stats.occupiedBeds || 0} / ${stats.totalCapacity || 0}`}
              subtitle={`${stats.availableBeds || 0} Vacant beds available`}
              icon={Bed}
              color="cyan"
              badgeText={`${stats.occupancyRate || 0}% Occupied`}
              badgeColor={stats.occupancyRate > 90 ? 'danger' : 'info'}
            />
            <StatsCard
              title="Supervising Wardens"
              value={stats.totalWardens || 0}
              subtitle="Hostel residential officers"
              icon={Shield}
              color="amber"
            />
            <StatsCard
              title="Student Leaves & Grievances"
              value={`${stats.pendingLeaves || 0} Leaves`}
              subtitle={`${stats.pendingLeaves || 0} Pending Leaves | ${stats.openComplaints || 0} Grievances`}
              icon={AlertTriangle}
              color={stats.activeSos > 0 ? 'rose' : 'cyan'}
              badgeText={stats.activeSos > 0 ? 'CRITICAL' : 'Normal'}
              badgeColor={stats.activeSos > 0 ? 'danger' : 'success'}
            />
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          {[
            { id: 'overview', label: 'Hostel Matrix', icon: Building2 },
            { id: 'wardens', label: 'Wardens Registry', icon: Shield },
            { id: 'students', label: 'Student Admissions', icon: Users },
            { id: 'requests', label: 'Room Transfers', icon: Bed },
            { id: 'notices', label: 'Notices & Circulars', icon: Megaphone },
            { id: 'logs', label: 'System Logs', icon: Activity },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: isActive ? '#EEF2FF' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  padding: '0.65rem 1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--primary)' : 'currentColor'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: HOSTELS MATRIX */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Residential Hostel Blocks</h2>
              <button
                onClick={() => {
                  setEditingHostelId(null);
                  setHostelForm({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_latitude: '31.6340', gps_longitude: '74.8723', gps_radius: '200' });
                  setIsHostelModalOpen(true);
                }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Add Hostel Block</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {hostels.map((h) => (
                <div key={h._id} className="card" style={{ padding: '1.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <span className={`badge ${h.type === 'Boys' ? 'badge-indigo' : 'badge-purple'}`} style={{ marginBottom: '0.5rem' }}>
                        {h.type} Hostel
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{h.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Block: {h.block_number}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => {
                          setEditingHostelId(h._id);
                          setHostelForm({
                            name: h.name,
                            type: h.type,
                            block_number: h.block_number,
                            address: h.address || '',
                            contact_number: h.contact_number || '',
                            gps_latitude: String(h.gps_latitude || 0),
                            gps_longitude: String(h.gps_longitude || 0),
                            gps_radius: String(h.gps_radius || 200),
                          });
                          setIsHostelModalOpen(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.6rem' }}
                        title="Edit Block"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteHostel(h._id)}
                        className="btn-danger"
                        style={{ padding: '0.4rem 0.6rem' }}
                        title="Delete Block"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Hostel Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned Warden</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {h.warden ? h.warden.full_name : <span style={{ color: 'var(--warning)' }}>Unassigned</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Residents</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {h.studentsCount || 0} Students
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Beds</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {h.totalBeds || 0} Beds ({h.totalRooms || 0} Rooms)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available Beds</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success)' }}>
                        {h.availableBeds || 0} Vacant
                      </div>
                    </div>
                  </div>

                  {/* Geofence Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Compass size={15} color="var(--primary)" />
                    <span>GPS Perimeter: {h.gps_latitude || 0}° N, {h.gps_longitude || 0}° E (Radius: {h.gps_radius || 200}m)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WARDENS REGISTRY */}
        {activeTab === 'wardens' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Wardens Registry</h2>
              <button
                onClick={() => setIsWardenModalOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Add Warden Account</span>
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Warden Name</th>
                    <th>Email Address</th>
                    <th>Phone Contact</th>
                    <th>Assigned Hostel</th>
                    <th>Address</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wardens.map((w) => (
                    <tr key={w._id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{w.full_name}</td>
                      <td style={{ color: 'var(--primary)' }}>{w.email}</td>
                      <td>{w.phone}</td>
                      <td>
                        {w.hostel ? (
                          <span className="badge badge-teal">{w.hostel.name} ({w.hostel.block_number})</span>
                        ) : (
                          <span className="badge badge-warning">No Hostel Assigned</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{w.address || 'Campus Quarter'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteWarden(w._id)}
                          className="btn-danger"
                          style={{ padding: '0.35rem 0.55rem' }}
                          title="Remove warden"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {wardens.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No wardens registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENT ADMISSIONS */}
        {activeTab === 'students' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '600px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Search by name, roll number, or department..."
                    className="form-input"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                <select
                  value={filterHostel}
                  onChange={(e) => setFilterHostel(e.target.value)}
                  className="form-select"
                  style={{ width: '200px', fontSize: '0.875rem' }}
                >
                  <option value="">All Hostels</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Showing {filteredStudents.length} of {students.length} students
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll / DRCC</th>
                    <th>Department</th>
                    <th>Hostel & Room</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.roll_number}</div>
                        {s.drcc_id && <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{s.drcc_id}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{s.department}</td>
                      <td>
                        {s.hostel ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.hostel.name}</div>
                            <div style={{ fontSize: '0.8rem', color: s.room ? 'var(--success)' : 'var(--warning)' }}>
                              Room: {s.room ? `${s.room.room_number} (${s.room.room_type})` : 'Unassigned'}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-warning">No Hostel</span>
                        )}
                      </td>
                      <td>
                        <div>{s.phone}</div>
                        {s.parent_phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P: {s.parent_phone}</div>}
                      </td>
                      <td>
                        {s.is_approved ? (
                          <span className="badge badge-success">Approved</span>
                        ) : (
                          <span className="badge badge-warning">Pending Review</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleToggleStudentApproval(s._id, s.is_approved)}
                            className={s.is_approved ? 'btn-secondary' : 'btn-primary'}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: !s.is_approved ? 'var(--success)' : undefined, borderColor: !s.is_approved ? 'var(--success)' : undefined }}
                            title={s.is_approved ? 'Mark Unapproved' : 'Approve Admission'}
                          >
                            {s.is_approved ? <XCircle size={14} /> : <CheckCircle size={14} />}
                            <span>{s.is_approved ? 'Revoke' : 'Approve'}</span>
                          </button>

                          <button
                            onClick={() => openAssignRoomModal(s)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="Assign Room"
                          >
                            <Bed size={14} />
                            <span>Room</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No students matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ROOM TRANSFERS */}
        {activeTab === 'requests' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Student Room Transfer Requests
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Current Room</th>
                    <th>Preferred Type</th>
                    <th>Reason</th>
                    <th>Submitted Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roomRequests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{req.student?.full_name}</strong> ({req.student?.roll_number})
                      </td>
                      <td>{req.current_room?.room_number || 'Unassigned'}</td>
                      <td>
                        <span className="badge badge-indigo">{req.preferred_room_type || 'Double'}</span>
                      </td>
                      <td style={{ maxWidth: '280px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {req.reason}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${req.status === 'Approved' ? 'badge-success' : req.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {req.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleProcessRoomRequest(req._id, 'Approved')}
                              className="btn-primary"
                              style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleProcessRoomRequest(req._id, 'Rejected')}
                              className="btn-danger"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {roomRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No room transfer requests filed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: NOTICES & CIRCULARS */}
        {activeTab === 'notices' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Campus Circulars & Official Notices</h2>
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Post New Notice</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} className="card" style={{ padding: '1.5rem', border: n.is_pinned ? '1px solid #FCD34D' : '1px solid var(--border-color)', background: n.is_pinned ? '#FFFDF5' : '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="badge badge-indigo">{n.category}</span>
                      {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteNotice(n._id)}
                      className="btn-danger"
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '6px' }}
                      title="Delete notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>{n.content}</p>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    Target: <strong>{n.target_hostel ? n.target_hostel.name : 'All Hostels'}</strong> • By: <strong>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {notices.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Megaphone size={36} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No notices posted yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM LOGS */}
        {activeTab === 'logs' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                System Activity & Security Audit Trail
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User Type</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l._id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${l.user_type === 'admin' ? 'badge-purple' : l.user_type === 'warden' ? 'badge-warning' : 'badge-indigo'}`}>
                          {l.user_type?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.action}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l.description}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No audit logs available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: ADD / EDIT HOSTEL */}
      <Modal
        isOpen={isHostelModalOpen}
        onClose={() => setIsHostelModalOpen(false)}
        title={editingHostelId ? 'Edit Hostel Block' : 'Add New Hostel Block'}
      >
        <form onSubmit={handleSaveHostel}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Hostel Name *</label>
            <input
              type="text"
              required
              value={hostelForm.name}
              onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
              placeholder="e.g. Bhagat Singh Boys Hostel"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Hostel Type *</label>
              <select
                value={hostelForm.type}
                onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}
                className="form-select"
              >
                <option value="Boys">Boys Hostel</option>
                <option value="Girls">Girls Hostel</option>
              </select>
            </div>

            <div>
              <label className="form-label">Block Number *</label>
              <input
                type="text"
                required
                value={hostelForm.block_number}
                onChange={(e) => setHostelForm({ ...hostelForm, block_number: e.target.value })}
                placeholder="e.g. Block-A"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Campus Address</label>
            <input
              type="text"
              value={hostelForm.address}
              onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
              placeholder="e.g. North Campus, Engineering Block Road"
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Contact Phone</label>
            <input
              type="text"
              value={hostelForm.contact_number}
              onChange={(e) => setHostelForm({ ...hostelForm, contact_number: e.target.value })}
              placeholder="+91 9876543210"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label">GPS Latitude</label>
              <input
                type="number"
                step="any"
                value={hostelForm.gps_latitude}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_latitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">GPS Longitude</label>
              <input
                type="number"
                step="any"
                value={hostelForm.gps_longitude}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_longitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Radius (Meters)</label>
              <input
                type="number"
                value={hostelForm.gps_radius}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_radius: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsHostelModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingHostelId ? 'Save Changes' : 'Create Hostel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD WARDEN */}
      <Modal
        isOpen={isWardenModalOpen}
        onClose={() => setIsWardenModalOpen(false)}
        title="Add Warden Account"
      >
        <form onSubmit={handleSaveWarden}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              value={wardenForm.full_name}
              onChange={(e) => setWardenForm({ ...wardenForm, full_name: e.target.value })}
              placeholder="e.g. Prof. Vikram Malhotra"
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              value={wardenForm.email}
              onChange={(e) => setWardenForm({ ...wardenForm, email: e.target.value })}
              placeholder="warden@campushome.com"
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Initial Password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={wardenForm.password}
              onChange={(e) => setWardenForm({ ...wardenForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                required
                value={wardenForm.phone}
                onChange={(e) => setWardenForm({ ...wardenForm, phone: e.target.value })}
                placeholder="+91 9811223344"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Assign to Hostel</label>
              <select
                value={wardenForm.hostel}
                onChange={(e) => setWardenForm({ ...wardenForm, hostel: e.target.value })}
                className="form-select"
              >
                <option value="">No Hostel (Floating)</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>{h.name} ({h.block_number})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Campus Quarter Address</label>
            <input
              type="text"
              value={wardenForm.address}
              onChange={(e) => setWardenForm({ ...wardenForm, address: e.target.value })}
              placeholder="Quarter No. 4, Block-A"
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsWardenModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Warden
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN ROOM */}
      <Modal
        isOpen={isAssignRoomModalOpen}
        onClose={() => setIsAssignRoomModalOpen(false)}
        title={`Assign Room: ${selectedStudentForRoom?.full_name}`}
      >
        <form onSubmit={handleAssignRoomSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Select Hostel</label>
            <select
              value={assignForm.hostel_id}
              onChange={async (e) => {
                const hid = e.target.value;
                setAssignForm({ ...assignForm, hostel_id: hid, room_id: '' });
                if (hid) {
                  try {
                    const res = await api.get('/warden/rooms', { headers: { 'X-Hostel-Id': hid } });
                    if (res.data.success) setAvailableRoomsForAssign(res.data.rooms);
                  } catch (err) {}
                }
              }}
              className="form-select"
            >
              <option value="">-- Choose Hostel --</option>
              {hostels.map((h) => (
                <option key={h._id} value={h._id}>{h.name} ({h.type})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Select Room Number</label>
            <select
              value={assignForm.room_id}
              onChange={(e) => setAssignForm({ ...assignForm, room_id: e.target.value })}
              className="form-select"
            >
              <option value="">-- Unallocated / Remove Room --</option>
              {availableRoomsForAssign.map((r) => (
                <option key={r._id} value={r._id} disabled={r.available_beds <= 0 && r._id !== selectedStudentForRoom?.room?._id}>
                  Room {r.room_number} ({r.room_type}) - {r.available_beds} beds free
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsAssignRoomModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Room Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: POST NOTICE */}
      <Modal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        title="Broadcast Campus Notice"
      >
        <form onSubmit={handleSaveNotice}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Notice Title *</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              placeholder="e.g. Revised Gate Curfew Timings"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Category *</label>
              <select
                value={noticeForm.category}
                onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                className="form-select"
              >
                <option value="General">General</option>
                <option value="Emergency">Emergency</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Rules & Timings">Rules & Timings</option>
                <option value="Mess & Dining">Mess & Dining</option>
                <option value="Holiday">Holiday</option>
              </select>
            </div>

            <div>
              <label className="form-label">Target Hostel</label>
              <select
                value={noticeForm.target_hostel}
                onChange={(e) => setNoticeForm({ ...noticeForm, target_hostel: e.target.value })}
                className="form-select"
              >
                <option value="">All Hostels (Campus-wide)</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>{h.name} ({h.block_number})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Notice Content / Instructions *</label>
            <textarea
              rows={4}
              required
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              placeholder="Enter detailed announcement message..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="pinNotice"
              checked={noticeForm.is_pinned}
              onChange={(e) => setNoticeForm({ ...noticeForm, is_pinned: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="pinNotice" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
              Pin this notice to top of notice board
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminDashboard;
