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
      hostel_id: student.hostel?._id || (hostels.length > 0 ? hostels[0]._id : ''),
      room_id: student.room?._id || '',
    });

    // Fetch rooms for student's hostel
    if (student.hostel?._id || hostels.length > 0) {
      const hid = student.hostel?._id || hostels[0]._id;
      try {
        const res = await api.get('/warden/rooms', { headers: { 'X-Hostel-Id': hid } });
        if (res.data.success) setAvailableRoomsForAssign(res.data.rooms);
      } catch (e) {
        // Fallback
      }
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
      alert(err.response?.data?.message || 'Room assignment failed');
    }
  };

  const handleProcessRoomRequest = async (requestId, status, newRoomId) => {
    try {
      await api.put(`/admin/room-requests/${requestId}`, {
        status,
        admin_remarks: status === 'Approved' ? 'Approved by Chief Warden' : 'Rejected due to room non-availability',
        new_room_id: newRoomId || null,
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request');
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
      alert(err.response?.data?.message || 'Failed to post notice');
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
    const matchesSearch =
      s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchStudent.toLowerCase());
    const matchesHostel = !filterHostel || s.hostel?._id === filterHostel;
    return matchesSearch && matchesHostel;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-mesh" />
      <Navbar sosActiveCount={stats?.activeSos || 0} />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.75rem 1.5rem', width: '100%', flex: 1 }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', color: '#ffffff' }}>
              Admin <span className="text-gradient">Control Center</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Campus residential ecosystem monitoring, warden supervisor & master registry
            </p>
          </div>

          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Sync Live Data</span>
          </button>
        </div>

        {/* Global Key Metric Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            <StatsCard
              title="Total Residents"
              value={stats.totalStudents}
              subtitle={`${stats.approvedStudents} Approved | ${stats.pendingStudents} Pending`}
              icon={Users}
              color="indigo"
              badgeText="Students"
              badgeColor="info"
            />
            <StatsCard
              title="Bed Occupancy"
              value={`${stats.occupancyRate}%`}
              subtitle={`${stats.occupiedBeds} occupied / ${stats.totalCapacity} total beds`}
              icon={Bed}
              color="emerald"
              badgeText={`${stats.availableCapacity} Vacant`}
              badgeColor="success"
            />
            <StatsCard
              title="Hostels & Blocks"
              value={stats.totalHostels}
              subtitle={`${stats.totalWardens} Assigned Wardens`}
              icon={Building2}
              color="purple"
            />
            <StatsCard
              title="Fee Collection"
              value={`₹${(stats.totalCollected || 0).toLocaleString('en-IN')}`}
              subtitle={`₹${(stats.totalPendingFees || 0).toLocaleString('en-IN')} Dues Pending`}
              icon={CreditCard}
              color="amber"
            />
            <StatsCard
              title="Active SOS & Leaves"
              value={stats.activeSos > 0 ? `${stats.activeSos} SOS ACTIVE` : '0 Active'}
              subtitle={`${stats.pendingLeaves} Pending Leaves | ${stats.openComplaints} Grievances`}
              icon={AlertTriangle}
              color={stats.activeSos > 0 ? 'rose' : 'cyan'}
              badgeText={stats.activeSos > 0 ? 'CRITICAL' : 'Normal'}
              badgeColor={stats.activeSos > 0 ? 'danger' : 'success'}
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {[
            { id: 'overview', label: 'Hostel Matrix', icon: Building2 },
            { id: 'wardens', label: 'Wardens Registry', icon: Shield },
            { id: 'students', label: 'Student Admissions', icon: Users },
            { id: 'requests', label: 'Room Transfers', icon: Bed },
            { id: 'notices', label: 'Notices & Circulars', icon: Megaphone },
            { id: 'logs', label: 'System Logs', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn btn-ghost"
                style={{
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9rem',
                  padding: '0.65rem 1.1rem'
                }}
              >
                <Icon size={18} color={isActive ? '#818cf8' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: HOSTELS MATRIX */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Residential Hostel Blocks</h2>
              <button
                onClick={() => {
                  setEditingHostelId(null);
                  setHostelForm({ name: '', type: 'Boys', block_number: '', address: '', contact_number: '', gps_latitude: '31.6340', gps_longitude: '74.8723', gps_radius: '200' });
                  setIsHostelModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>Add Hostel Block</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {hostels.map((h) => (
                <div key={h._id} className="glass-card" style={{ padding: '1.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <span className={`badge ${h.type === 'Boys' ? 'badge-info' : 'badge-purple'}`} style={{ marginBottom: '0.5rem' }}>
                        {h.type} Hostel
                      </span>
                      <h3 style={{ fontSize: '1.35rem', color: '#ffffff' }}>{h.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Block: {h.block_number}</p>
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
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.4rem' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteHostel(h._id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.4rem', color: '#f87171' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Hostel Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Warden</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                        {h.warden ? h.warden.full_name : <span style={{ color: '#fbbf24' }}>Unassigned</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Residents</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8' }}>
                        {h.studentsCount || 0} Students
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Beds</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                        {h.totalBeds || 0} Beds ({h.totalRooms || 0} Rooms)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Beds</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#34d399' }}>
                        {h.availableBeds || 0} Vacant
                      </div>
                    </div>
                  </div>

                  {/* Geofence Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Compass size={15} color="#818cf8" />
                    <span>GPS Geofence: {h.gps_latitude || 0}° N, {h.gps_longitude || 0}° E (Radius: {h.gps_radius || 200}m)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: WARDENS REGISTRY */}
        {activeTab === 'wardens' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Hostel Wardens</h2>
              <button
                onClick={() => setIsWardenModalOpen(true)}
                className="btn btn-primary btn-sm"
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
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{w.full_name}</td>
                      <td style={{ color: '#818cf8' }}>{w.email}</td>
                      <td>{w.phone}</td>
                      <td>
                        {w.hostel ? (
                          <span className="badge badge-info">{w.hostel.name} ({w.hostel.block_number})</span>
                        ) : (
                          <span className="badge badge-warning">No Hostel Assigned</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{w.address || 'Campus Quarter'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteWarden(w._id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#f87171' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {wardens.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '600px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Search by name, roll number, or department..."
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                <select
                  value={filterHostel}
                  onChange={(e) => setFilterHostel(e.target.value)}
                  className="form-select"
                  style={{ width: '200px' }}
                >
                  <option value="">All Hostels</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{s.roll_number}</div>
                        {s.drcc_id && <div style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>{s.drcc_id}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{s.department}</td>
                      <td>
                        {s.hostel ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#38bdf8' }}>{s.hostel.name}</div>
                            <div style={{ fontSize: '0.8rem', color: s.room ? '#34d399' : '#fbbf24' }}>
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
                          <span className="badge badge-warning">Pending Approval</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleToggleStudentApproval(s._id, s.is_approved)}
                            className={`btn btn-sm ${s.is_approved ? 'btn-secondary' : 'btn-success'}`}
                            title={s.is_approved ? 'Mark Unapproved' : 'Approve Admission'}
                          >
                            {s.is_approved ? <XCircle size={15} /> : <CheckCircle size={15} />}
                            <span>{s.is_approved ? 'Revoke' : 'Approve'}</span>
                          </button>

                          <button
                            onClick={() => openAssignRoomModal(s)}
                            className="btn btn-secondary btn-sm"
                            title="Assign Room"
                          >
                            <Bed size={15} />
                            <span>Room</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
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
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem' }}>
              Student Room Transfer Requests
            </h2>

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
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>
                        {req.student?.full_name} ({req.student?.roll_number})
                      </td>
                      <td>{req.current_room?.room_number || 'Unassigned'}</td>
                      <td>
                        <span className="badge badge-info">{req.preferred_room_type || 'Double'}</span>
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
                              className="btn btn-success btn-sm"
                            >
                              <Check size={15} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleProcessRoomRequest(req._id, 'Rejected')}
                              className="btn btn-danger btn-sm"
                            >
                              <XCircle size={15} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {roomRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
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
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Campus Circulars & Official Notices</h2>
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>Post New Notice</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} className="glass-card" style={{ padding: '1.5rem', border: n.is_pinned ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="badge badge-info">{n.category}</span>
                      {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteNotice(n._id)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.35rem', color: '#f87171' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.5rem' }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>{n.content}</p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    Target: <strong>{n.target_hostel ? n.target_hostel.name : 'All Hostels'}</strong> • By: <strong>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {notices.length === 0 && (
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Megaphone size={36} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No notices posted yet. Click 'Post New Notice' to broadcast circulars.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM LOGS */}
        {activeTab === 'logs' && (
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem' }}>
              System Activity & Security Audit Trail
            </h2>

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
                        <span className={`badge ${l.user_type === 'admin' ? 'badge-purple' : l.user_type === 'warden' ? 'badge-warning' : 'badge-info'}`}>
                          {l.user_type?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{l.action}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l.description}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
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
          <div className="form-group">
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
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

            <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Campus Address</label>
            <input
              type="text"
              value={hostelForm.address}
              onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
              placeholder="e.g. North Campus, Engineering Block Road"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              type="text"
              value={hostelForm.contact_number}
              onChange={(e) => setHostelForm({ ...hostelForm, contact_number: e.target.value })}
              placeholder="+91 9876543210"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">GPS Latitude</label>
              <input
                type="number"
                step="any"
                value={hostelForm.gps_latitude}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_latitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">GPS Longitude</label>
              <input
                type="number"
                step="any"
                value={hostelForm.gps_longitude}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_longitude: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Radius (Meters)</label>
              <input
                type="number"
                value={hostelForm.gps_radius}
                onChange={(e) => setHostelForm({ ...hostelForm, gps_radius: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsHostelModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          <div className="form-group">
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

          <div className="form-group">
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

          <div className="form-group">
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
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

            <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Campus Quarter Address</label>
            <input
              type="text"
              value={wardenForm.address}
              onChange={(e) => setWardenForm({ ...wardenForm, address: e.target.value })}
              placeholder="Quarter No. 4, Block-A"
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsWardenModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          <div className="form-group">
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

          <div className="form-group">
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsAssignRoomModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          <div className="form-group">
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
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

            <div className="form-group">
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

          <div className="form-group">
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="checkbox"
              id="pinNotice"
              checked={noticeForm.is_pinned}
              onChange={(e) => setNoticeForm({ ...noticeForm, is_pinned: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="pinNotice" style={{ fontSize: '0.88rem', color: '#ffffff', cursor: 'pointer' }}>
              Pin this notice to top of notice board
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminDashboard;

