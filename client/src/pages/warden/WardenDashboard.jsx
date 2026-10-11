import React, { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import StatsCard from '../../components/common/StatsCard';
import Modal from '../../components/common/Modal';
import api from '../../api/axios';
import {
  Users,
  Bed,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Utensils,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  DollarSign,
  Phone,
  ShieldAlert,
  Send,
  Sparkles,
  Megaphone,
  ArrowRightLeft,
  UserCheck
} from 'lucide-react';

const WardenDashboard = () => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'students' | 'leaves' | 'complaints' | 'room-requests' | 'rooms' | 'sos' | 'mess' | 'notices' | 'fine'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [roster, setRoster] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaves, setLeaves] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [messMenu, setMessMenu] = useState([]);
  const [students, setStudents] = useState([]);
  const [roomRequests, setRoomRequests] = useState([]);
  const [notices, setNotices] = useState([]);
  const [searchStudent, setSearchStudent] = useState('');

  // Modals state
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', category: 'General', is_pinned: false });

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({ room_number: '', room_type: 'Double', total_beds: '2' });
  const [editingRoomId, setEditingRoomId] = useState(null);

  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [fineForm, setFineForm] = useState({ student_id: '', amount: '200', fine_type: 'Late Entry', description: '' });

  const [selectedLeaveForAction, setSelectedLeaveForAction] = useState(null);
  const [leaveRemarks, setLeaveRemarks] = useState('');

  const [selectedComplaintForAction, setSelectedComplaintForAction] = useState(null);
  const [complaintRemarks, setComplaintRemarks] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('Resolved');

  const [selectedRoomReqForAction, setSelectedRoomReqForAction] = useState(null);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [roomReqRemarks, setRoomReqRemarks] = useState('');

  const [selectedDay, setSelectedDay] = useState('Monday');
  const [mealInput, setMealInput] = useState({ Breakfast: '', Lunch: '', Snacks: '', Dinner: '' });

  const loadWardenData = async () => {
    setLoading(true);
    try {
      const [statsRes, rosterRes, leavesRes, complaintsRes, roomsRes, sosRes, messRes, stuRes, notRes, roomReqRes] = await Promise.all([
        api.get('/warden/stats'),
        api.get(`/warden/attendance/today?date=${selectedDate}`),
        api.get('/warden/leaves'),
        api.get('/warden/complaints'),
        api.get('/warden/rooms'),
        api.get('/warden/sos'),
        api.get('/warden/mess-menu'),
        api.get('/warden/students'),
        api.get('/notices'),
        api.get('/warden/room-requests').catch(() => ({ data: { success: true, roomRequests: [] } })),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (rosterRes.data.success) setRoster(rosterRes.data.roster);
      if (leavesRes.data.success) setLeaves(leavesRes.data.leaves);
      if (complaintsRes.data.success) setComplaints(complaintsRes.data.complaints);
      if (roomsRes.data.success) setRooms(roomsRes.data.rooms);
      if (sosRes.data.success) setSosAlerts(sosRes.data.alerts);
      if (notRes.data.success) setNotices(notRes.data.notices);
      if (roomReqRes.data.success) setRoomRequests(roomReqRes.data.roomRequests || []);
      if (messRes.data.success) {
        setMessMenu(messRes.data.menu);
        populateMealInput(messRes.data.menu, selectedDay);
      }
      if (stuRes.data.success) setStudents(stuRes.data.students);
    } catch (err) {
      console.error('Failed to load warden data', err);
    } finally {
      setLoading(false);
    }
  };

  const populateMealInput = (menuList, day) => {
    const dayItems = menuList.filter((m) => m.day_of_week === day);
    const initial = { Breakfast: '', Lunch: '', Snacks: '', Dinner: '' };
    dayItems.forEach((item) => {
      if (initial.hasOwnProperty(item.meal_type)) {
        initial[item.meal_type] = item.menu_item;
      }
    });
    setMealInput(initial);
  };

  useEffect(() => {
    loadWardenData();
  }, [selectedDate]);

  const handleDayChange = (day) => {
    setSelectedDay(day);
    populateMealInput(messMenu, day);
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      await api.post('/warden/attendance/mark', {
        student_id: studentId,
        attendance_date: selectedDate,
        status,
      });
      // Quick update locally
      setRoster((prev) =>
        prev.map((r) => (r.studentId === studentId ? { ...r, status, markedBy: 'warden_manual' } : r))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  const handleActionLeave = async (leaveId, status) => {
    try {
      await api.put(`/warden/leaves/${leaveId}`, {
        status,
        warden_remarks: leaveRemarks,
      });
      setSelectedLeaveForAction(null);
      setLeaveRemarks('');
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review leave application');
    }
  };

  const handleActionComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaintForAction) return;

    try {
      await api.put(`/warden/complaints/${selectedComplaintForAction._id}`, {
        status: complaintStatus,
        warden_remarks: complaintRemarks,
      });
      setSelectedComplaintForAction(null);
      setComplaintRemarks('');
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update complaint status');
    }
  };

  const handleActionRoomRequest = async (status) => {
    if (!selectedRoomReqForAction) return;
    if (status === 'Approved' && !targetRoomId) {
      alert('Please select an available target room to complete room allocation');
      return;
    }

    try {
      await api.put(`/warden/room-requests/${selectedRoomReqForAction._id}`, {
        status,
        target_room_id: targetRoomId || undefined,
        admin_remarks: roomReqRemarks,
      });
      setSelectedRoomReqForAction(null);
      setTargetRoomId('');
      setRoomReqRemarks('');
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to action room transfer request');
    }
  };

  const handleSaveMessMeal = async (mealType) => {
    try {
      await api.post('/warden/mess-menu', {
        day_of_week: selectedDay,
        meal_type: mealType,
        menu_item: mealInput[mealType] || 'Standard Menu',
      });
      alert(`${mealType} menu updated successfully for ${selectedDay}!`);
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update mess meal');
    }
  };

  const handleSaveNoticeWarden = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notices', noticeForm);
      setIsNoticeModalOpen(false);
      setNoticeForm({ title: '', content: '', category: 'General', is_pinned: false });
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post circular notice');
    }
  };

  const handleDeleteNoticeWarden = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete notice');
    }
  };

  const handleResolveSos = async (alertId) => {
    try {
      await api.put(`/warden/sos/${alertId}/resolve`, {
        resolution_notes: 'Acknowledged and addressed by duty warden on site.',
      });
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve emergency alert');
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      if (editingRoomId) {
        await api.put(`/warden/rooms/${editingRoomId}`, roomForm);
      } else {
        await api.post('/warden/rooms', roomForm);
      }
      setIsRoomModalOpen(false);
      setEditingRoomId(null);
      setRoomForm({ room_number: '', room_type: 'Double', total_beds: '2' });
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save room details');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Delete this room from hostel inventory?')) return;
    try {
      await api.delete(`/warden/rooms/${id}`);
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleIssueFine = async (e) => {
    e.preventDefault();
    try {
      await api.post('/warden/fines', fineForm);
      alert('Fine invoice dispatched to student account.');
      setIsFineModalOpen(false);
      setFineForm({ student_id: '', amount: '200', fine_type: 'Late Entry', description: '' });
      loadWardenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue fine invoice');
    }
  };

  // Filter students by query
  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const availableRooms = rooms.filter((r) => r.available_beds > 0);
  const activeSosList = sosAlerts.filter((s) => s.status === 'Active');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        
        {/* Warden Top Header Card */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-indigo">Hostel Warden Portal</span>
              {stats?.blockNumber && <span className="badge badge-teal">Block {stats.blockNumber}</span>}
              {stats?.hostelType && <span className="badge badge-purple">{stats.hostelType} Hostel</span>}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {stats?.hostelName || 'Hostel Supervision Dashboard'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0 0' }}>
              Real-time student attendance monitoring, room allotments, leave approvals & emergency response
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsFineModalOpen(true)}
              className="btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <DollarSign size={16} />
              <span>Issue Fine</span>
            </button>
            <button
              onClick={loadWardenData}
              className="btn-primary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

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
              subtitle="Active hostel residents"
              icon={Users}
              color="indigo"
            />
            <StatsCard
              title="Present Today"
              value={`${stats.presentToday || 0} / ${stats.totalStudents || 0}`}
              subtitle="Marked attendance"
              icon={CheckCircle2}
              color="emerald"
              badgeText={`${Math.round(((stats.presentToday || 0) / (stats.totalStudents || 1)) * 100)}%`}
              badgeColor="success"
            />
            <StatsCard
              title="Bed Occupancy"
              value={`${stats.occupiedBeds || 0} / ${stats.totalCapacity || 0}`}
              subtitle={`${stats.availableBeds || 0} Vacant Beds`}
              icon={Bed}
              color="cyan"
            />
            <StatsCard
              title="Pending Leaves"
              value={stats.pendingLeaves || 0}
              subtitle="Awaiting review"
              icon={FileText}
              color="amber"
              badgeText={stats.pendingLeaves > 0 ? 'Pending' : 'Clear'}
              badgeColor={stats.pendingLeaves > 0 ? 'warning' : 'info'}
            />
            <StatsCard
              title="Room Transfers"
              value={stats.pendingRoomRequests || 0}
              subtitle="Transfer requests"
              icon={ArrowRightLeft}
              color="purple"
              badgeText={stats.pendingRoomRequests > 0 ? 'Action Req' : 'Clear'}
              badgeColor={stats.pendingRoomRequests > 0 ? 'warning' : 'info'}
            />
            <StatsCard
              title="Grievances & SOS"
              value={stats.activeSos > 0 ? `${stats.activeSos} SOS ACTIVE` : `${stats.openComplaints || 0} Issues`}
              subtitle={`${stats.openComplaints || 0} open complaints`}
              icon={AlertTriangle}
              color={stats.activeSos > 0 ? 'rose' : 'purple'}
              badgeText={stats.activeSos > 0 ? 'EMERGENCY' : 'Open'}
              badgeColor={stats.activeSos > 0 ? 'danger' : 'purple'}
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
            { id: 'attendance', label: 'Daily Attendance', icon: CheckCircle2 },
            { id: 'students', label: `Residents (${students.length})`, icon: Users },
            { id: 'rooms', label: `Rooms & Beds (${rooms.length})`, icon: Bed },
            { id: 'leaves', label: `Leaves (${leaves.filter(l => l.status === 'Pending').length})`, icon: FileText },
            { id: 'complaints', label: `Complaints (${complaints.filter(c => c.status !== 'Resolved').length})`, icon: AlertTriangle },
            { id: 'room-requests', label: `Room Transfers (${roomRequests.filter(r => r.status === 'Pending').length})`, icon: ArrowRightLeft },
            { id: 'sos', label: `SOS Alerts (${activeSosList.length})`, icon: ShieldAlert },
            { id: 'mess', label: 'Mess Menu', icon: Utensils },
            { id: 'notices', label: 'Notices', icon: Megaphone },
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

        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Attendance Roster</h2>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', width: 'auto', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span className="badge badge-success">
                  Present: {roster.filter((r) => r.status === 'Present').length}
                </span>
                <span className="badge badge-danger">
                  Absent: {roster.filter((r) => r.status === 'Absent').length}
                </span>
                <span className="badge badge-warning">
                  Leave: {roster.filter((r) => r.status === 'Leave').length}
                </span>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Resident</th>
                    <th>Roll Number</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Quick Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.studentId}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.fullName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{student.rollNumber}</td>
                      <td>
                        <span className="badge badge-indigo">Room {student.roomNumber}</span>
                      </td>
                      <td>
                        <span className={`badge ${student.status === 'Present' ? 'badge-success' : student.status === 'Leave' ? 'badge-warning' : 'badge-danger'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {student.markedBy || 'Unmarked'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {student.markedAt ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleMarkAttendance(student.studentId, 'Present')}
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              border: student.status === 'Present' ? '1px solid var(--success)' : '1px solid var(--border-color)',
                              background: student.status === 'Present' ? '#ECFDF5' : '#FFFFFF',
                              color: student.status === 'Present' ? 'var(--success)' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            title="Mark Present"
                          >
                            P
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.studentId, 'Absent')}
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              border: student.status === 'Absent' ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                              background: student.status === 'Absent' ? '#FEF2F2' : '#FFFFFF',
                              color: student.status === 'Absent' ? 'var(--danger)' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            title="Mark Absent"
                          >
                            A
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.studentId, 'Leave')}
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              border: student.status === 'Leave' ? '1px solid var(--warning)' : '1px solid var(--border-color)',
                              background: student.status === 'Leave' ? '#FEF3C7' : '#FFFFFF',
                              color: student.status === 'Leave' ? 'var(--warning)' : 'var(--text-secondary)',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            title="Mark Leave"
                          >
                            L
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No resident students enrolled in this hostel block.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RESIDENT STUDENTS */}
        {activeTab === 'students' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Residents Roster</h2>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search name, roll, dept..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Roll / DRCC</th>
                    <th>Department</th>
                    <th>Room Allocation</th>
                    <th>Contact & Emergency</th>
                    <th>Leave Status</th>
                    <th>Financial Dues</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.roll_number}</div>
                        {s.drcc_id && <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>DRCC: {s.drcc_id}</div>}
                      </td>
                      <td>{s.department}</td>
                      <td>
                        {s.room ? (
                          <span className="badge badge-indigo">Room {s.room.room_number} ({s.room.room_type})</span>
                        ) : (
                          <span className="badge badge-warning">Unassigned</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <div>📞 {s.phone || 'N/A'}</div>
                        {s.emergency_contact && <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>SOS: {s.emergency_contact}</div>}
                      </td>
                      <td>
                        {s.hasActiveLeave ? (
                          <span className="badge badge-warning" title={s.activeLeaveDetails}>On Leave</span>
                        ) : (
                          <span className="badge badge-success">In Campus</span>
                        )}
                      </td>
                      <td>
                        {s.totalPendingDues > 0 ? (
                          <span className="badge badge-danger">₹{s.totalPendingDues} Due</span>
                        ) : (
                          <span className="badge badge-success">Clear</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No resident students match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ROOMS & BEDS */}
        {activeTab === 'rooms' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Rooms & Bed Capacity</h2>
              <button
                onClick={() => {
                  setEditingRoomId(null);
                  setRoomForm({ room_number: '', room_type: 'Double', total_beds: '2' });
                  setIsRoomModalOpen(true);
                }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Add Room</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {rooms.map((room) => (
                <div key={room._id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Room {room.room_number}
                      </span>
                      <span className="badge badge-indigo">{room.room_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => {
                          setEditingRoomId(room._id);
                          setRoomForm({
                            room_number: room.room_number,
                            room_type: room.room_type,
                            total_beds: String(room.total_beds),
                          });
                          setIsRoomModalOpen(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.5rem' }}
                        title="Edit Room"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room._id)}
                        className="btn-danger"
                        style={{ padding: '0.35rem 0.5rem' }}
                        title="Delete Room"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Capacity: {room.total_beds} Beds</span>
                    <span style={{ fontWeight: 700, color: room.available_beds > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {room.available_beds} Vacant
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Current Occupants ({room.occupants?.length || 0}):
                    </div>
                    {room.occupants && room.occupants.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {room.occupants.map((occ) => (
                          <div key={occ._id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                            <span style={{ fontWeight: 600 }}>{occ.full_name} ({occ.roll_number})</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{occ.department}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Room is unoccupied</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LEAVES */}
        {activeTab === 'leaves' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Student Outstation & Leave Requests
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Leave Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action Remarks</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{leave.student?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {leave.student?.roll_number} • 📞 {leave.student?.phone}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-indigo">{leave.from_date}</span> to <span className="badge badge-indigo">{leave.to_date}</span>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{leave.reason}</td>
                      <td>
                        <span className={`badge ${leave.status === 'Approved' ? 'badge-success' : leave.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {leave.warden_remarks || (leave.action_by ? `Actioned by ${leave.action_by.full_name}` : '-')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {leave.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedLeaveForAction(leave);
                              setLeaveRemarks('');
                            }}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Review
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No leave requests submitted.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Maintenance & Student Grievance Tickets
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Category & Priority</th>
                    <th>Description</th>
                    <th>Date Lodged</th>
                    <th>Status</th>
                    <th>Warden Note</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.student?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Room: {c.student?.room?.room_number || 'N/A'} • 📞 {c.student?.phone}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{c.category}</span>
                        {c.priority && (
                          <span className={`badge ${c.priority === 'Urgent' ? 'badge-danger' : c.priority === 'High' ? 'badge-warning' : 'badge-indigo'}`} style={{ marginLeft: '0.35rem' }}>
                            {c.priority}
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.description}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : c.status === 'In Progress' ? 'badge-indigo' : 'badge-warning'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {c.warden_remarks || '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedComplaintForAction(c);
                            setComplaintStatus(c.status);
                            setComplaintRemarks(c.warden_remarks || '');
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No complaints lodged for this hostel block.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ROOM CHANGE REQUESTS */}
        {activeTab === 'room-requests' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Student Room Allocation & Change Requests
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Current Room</th>
                    <th>Requested Layout</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {roomRequests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.student?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {req.student?.roll_number} • 📞 {req.student?.phone}
                        </div>
                      </td>
                      <td>
                        {req.current_room ? (
                          <span className="badge badge-indigo">{req.current_room.room_number} ({req.current_room.room_type})</span>
                        ) : (
                          <span className="badge badge-warning">Unallocated</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-purple">{req.preferred_room_type}</span>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.reason}</td>
                      <td>
                        <span className={`badge ${req.status === 'Approved' ? 'badge-success' : req.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {req.admin_remarks || (req.target_room ? `Allocated to Room ${req.target_room.room_number}` : '-')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {req.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedRoomReqForAction(req);
                              setTargetRoomId(availableRooms[0]?._id || '');
                              setRoomReqRemarks('');
                            }}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Allocate / Review
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {roomRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No room change requests currently submitted.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: SOS ALERTS */}
        {activeTab === 'sos' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Emergency SOS Broadcasts</h2>
              <span className={`badge ${activeSosList.length > 0 ? 'badge-danger' : 'badge-success'}`}>
                {activeSosList.length} Active Incidents
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sosAlerts.map((sos) => (
                <div
                  key={sos._id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: sos.status === 'Active' ? '1px solid #FECACA' : '1px solid var(--border-color)',
                    background: sos.status === 'Active' ? '#FEF2F2' : '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: sos.status === 'Active' ? '#FEE2E2' : '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: sos.status === 'Active' ? 'var(--danger)' : 'var(--success)'
                      }}>
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                            {sos.student?.full_name}
                          </span>
                          <span className="badge badge-purple">Room {sos.room_number || sos.student?.room?.room_number || 'N/A'}</span>
                          <span className={`badge ${sos.status === 'Active' ? 'badge-danger' : 'badge-success'}`}>
                            {sos.status}
                          </span>
                        </div>
                        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                          "{sos.message}"
                        </p>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          📞 Student Phone: {sos.student?.phone} • Emergency Contact: {sos.student?.emergency_contact || 'N/A'} • {new Date(sos.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {sos.status === 'Active' && (
                      <button
                        onClick={() => handleResolveSos(sos._id)}
                        className="btn-primary"
                        style={{ background: 'var(--success)', borderColor: 'var(--success)', padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Acknowledge & Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sosAlerts.length === 0 && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>No emergency alerts reported.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: MESS MENU */}
        {activeTab === 'mess' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Mess Menu Scheduler</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>Configure nutritious meals for each day</p>
              </div>

              {/* Day Selector */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDayChange(day)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: selectedDay === day ? 'var(--primary)' : '#FFFFFF',
                      color: selectedDay === day ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: selectedDay === day ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => (
                <div key={meal} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{meal}</h3>
                    <span className="badge badge-purple">{selectedDay}</span>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Menu Items</label>
                    <textarea
                      rows={3}
                      value={mealInput[meal] || ''}
                      onChange={(e) => setMealInput({ ...mealInput, [meal]: e.target.value })}
                      placeholder={`Enter ${meal} items for ${selectedDay}...`}
                      className="form-textarea"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveMessMeal(meal)}
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Send size={14} />
                    <span>Save {meal}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: NOTICES */}
        {activeTab === 'notices' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Circulars & Notices</h2>
              <button
                onClick={() => setIsNoticeModalOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Post Notice</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} className="card" style={{ padding: '1.5rem', border: n.is_pinned ? '1px solid #FCD34D' : '1px solid var(--border-color)', background: n.is_pinned ? '#FFFDF5' : '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="badge badge-indigo">{n.category}</span>
                      {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteNoticeWarden(n._id)}
                      className="btn-danger"
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '6px' }}
                      title="Delete notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>{n.content}</p>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    By: <strong style={{ color: 'var(--text-primary)' }}>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
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

      </main>

      {/* MODAL: POST NOTICE (WARDEN) */}
      <Modal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        title="Post Hostel Notice"
      >
        <form onSubmit={handleSaveNoticeWarden}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Notice Title *</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              placeholder="e.g. Cleanliness Inspection on Friday"
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Notice Message *</label>
            <textarea
              rows={4}
              required
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              placeholder="Enter announcement instructions..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="wardenPinNotice"
              checked={noticeForm.is_pinned}
              onChange={(e) => setNoticeForm({ ...noticeForm, is_pinned: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="wardenPinNotice" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
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

      {/* MODAL: ADD / EDIT ROOM */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoomId ? 'Edit Room' : 'Add New Room'}
      >
        <form onSubmit={handleSaveRoom}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Room Number *</label>
            <input
              type="text"
              required
              value={roomForm.room_number}
              onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              placeholder="e.g. A-104"
              className="form-input"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label">Room Type *</label>
              <select
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                className="form-select"
              >
                <option value="Single">Single Bed</option>
                <option value="Double">Double Bed</option>
                <option value="Triple">Triple Bed</option>
                <option value="Four Bed">Four Bed</option>
                <option value="Dormitory">Dormitory</option>
              </select>
            </div>

            <div>
              <label className="form-label">Total Bed Capacity *</label>
              <input
                type="number"
                min={1}
                required
                value={roomForm.total_beds}
                onChange={(e) => setRoomForm({ ...roomForm, total_beds: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Room
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ACTION LEAVE */}
      <Modal
        isOpen={!!selectedLeaveForAction}
        onClose={() => setSelectedLeaveForAction(null)}
        title="Review Leave Application"
      >
        {selectedLeaveForAction && (
          <div>
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLeaveForAction.student?.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                Duration: {selectedLeaveForAction.from_date} to {selectedLeaveForAction.to_date}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> {selectedLeaveForAction.reason}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Warden Remarks</label>
              <textarea
                rows={2}
                value={leaveRemarks}
                onChange={(e) => setLeaveRemarks(e.target.value)}
                placeholder="Remarks, parent verification notes, etc."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => handleActionLeave(selectedLeaveForAction._id, 'Rejected')}
                className="btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
              >
                <XCircle size={16} />
                <span>Reject</span>
              </button>
              <button
                onClick={() => handleActionLeave(selectedLeaveForAction._id, 'Approved')}
                className="btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
              >
                <CheckCircle2 size={16} />
                <span>Approve Leave</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: ACTION COMPLAINT */}
      <Modal
        isOpen={!!selectedComplaintForAction}
        onClose={() => setSelectedComplaintForAction(null)}
        title="Update Grievance Status"
      >
        {selectedComplaintForAction && (
          <form onSubmit={handleActionComplaint}>
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedComplaintForAction.student?.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Category: {selectedComplaintForAction.category}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                {selectedComplaintForAction.description}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Status</label>
              <select
                value={complaintStatus}
                onChange={(e) => setComplaintStatus(e.target.value)}
                className="form-select"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress (Staff Assigned)</option>
                <option value="Resolved">Resolved</option>
                <option value="Reopened">Reopened</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Resolution / Action Remarks</label>
              <textarea
                rows={2}
                value={complaintRemarks}
                onChange={(e) => setComplaintRemarks(e.target.value)}
                placeholder="e.g. Electrician resolved wiring at 3 PM."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedComplaintForAction(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update Ticket
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: REVIEW ROOM TRANSFER REQUEST */}
      <Modal
        isOpen={!!selectedRoomReqForAction}
        onClose={() => setSelectedRoomReqForAction(null)}
        title="Review Room Allocation Request"
      >
        {selectedRoomReqForAction && (
          <div>
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedRoomReqForAction.student?.full_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                Current Room: {selectedRoomReqForAction.current_room?.room_number || 'None'} • Requested Type: {selectedRoomReqForAction.preferred_room_type}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> {selectedRoomReqForAction.reason}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Select Target Room (With Available Beds) *</label>
              <select
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                className="form-select"
              >
                <option value="">-- Choose Room to Allocate --</option>
                {availableRooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    Room {r.room_number} ({r.room_type} - {r.available_beds} beds free)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Reviewer Remarks</label>
              <textarea
                rows={2}
                value={roomReqRemarks}
                onChange={(e) => setRoomReqRemarks(e.target.value)}
                placeholder="Remarks / room allocation notes..."
                className="form-textarea"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleActionRoomRequest('Rejected')}
                className="btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
              >
                <XCircle size={16} />
                <span>Reject</span>
              </button>
              <button
                type="button"
                onClick={() => handleActionRoomRequest('Approved')}
                className="btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
              >
                <CheckCircle2 size={16} />
                <span>Approve & Transfer</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: ISSUE FINE */}
      <Modal
        isOpen={isFineModalOpen}
        onClose={() => setIsFineModalOpen(false)}
        title="Issue Fine / Fee Invoice"
      >
        <form onSubmit={handleIssueFine}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Select Resident Student *</label>
            <select
              required
              value={fineForm.student_id}
              onChange={(e) => setFineForm({ ...fineForm, student_id: e.target.value })}
              className="form-select"
            >
              <option value="">-- Choose Student --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.full_name} ({s.roll_number})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Fine Type *</label>
              <select
                value={fineForm.fine_type}
                onChange={(e) => setFineForm({ ...fineForm, fine_type: e.target.value })}
                className="form-select"
              >
                <option value="Late Entry">Late Entry</option>
                <option value="Property Damage">Property Damage</option>
                <option value="Indiscipline">Indiscipline</option>
                <option value="Mess Due">Mess Due</option>
                <option value="Hostel Fee">Hostel Fee</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                min={1}
                required
                value={fineForm.amount}
                onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Description / Reason</label>
            <input
              type="text"
              value={fineForm.description}
              onChange={(e) => setFineForm({ ...fineForm, description: e.target.value })}
              placeholder="e.g. Late gate arrival after 10 PM curfew"
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsFineModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Issue Invoice
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default WardenDashboard;
