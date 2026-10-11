import React, { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import StatsCard from '../../components/common/StatsCard';
import Modal from '../../components/common/Modal';
import api from '../../api/axios';
import {
  GraduationCap,
  Building2,
  Bed,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Utensils,
  CreditCard,
  Send,
  Plus,
  Compass,
  MapPin,
  ShieldAlert,
  Users,
  RefreshCw,
  DollarSign,
  Phone,
  Check,
  Printer,
  Megaphone,
  ArrowRightLeft
} from 'lucide-react';

const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves' | 'complaints' | 'room' | 'mess' | 'payments' | 'notices'

  // Data states
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayMarked, setTodayMarked] = useState(false);
  const [todayStatus, setTodayStatus] = useState('Not Marked');
  const [leaves, setLeaves] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [roomRequests, setRoomRequests] = useState([]);
  const [messMenu, setMessMenu] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '' });

  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ category: 'Electrical', priority: 'Medium', description: '' });

  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [sosMessage, setSosMessage] = useState('EMERGENCY: Immediate assistance requested in my room!');
  const [sosSuccess, setSosSuccess] = useState('');

  const [isRoomReqModalOpen, setIsRoomReqModalOpen] = useState(false);
  const [roomReqForm, setRoomReqForm] = useState({ preferred_room_type: 'Single', reason: '' });

  const [gpsLocating, setGpsLocating] = useState(false);
  const [gpsResult, setGpsResult] = useState(null);

  const [selectedDay, setSelectedDay] = useState('Monday');

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [profileRes, attRes, leavesRes, compRes, messRes, payRes, notRes, roomReqRes] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/attendance'),
        api.get('/student/leaves'),
        api.get('/student/complaints'),
        api.get('/student/mess-menu'),
        api.get('/student/payments'),
        api.get('/notices'),
        api.get('/student/room-requests').catch(() => ({ data: { success: true, roomRequests: [] } })),
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.student);
        setRoommates(profileRes.data.roommates || []);
        setStats(profileRes.data.stats);
      }
      if (attRes.data.success) {
        setAttendanceHistory(attRes.data.records || []);
        setTodayMarked(attRes.data.todayMarked);
        setTodayStatus(attRes.data.todayStatus);
      }
      if (leavesRes.data.success) setLeaves(leavesRes.data.leaves || []);
      if (compRes.data.success) setComplaints(compRes.data.complaints || []);
      if (roomReqRes.data.success) setRoomRequests(roomReqRes.data.roomRequests || []);
      if (messRes.data.success) setMessMenu(messRes.data.menu || []);
      if (payRes.data.success) setPayments(payRes.data.payments || []);
      if (notRes.data.success) setNotices(notRes.data.notices || []);
    } catch (err) {
      console.error('Failed to load student data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  // Self Check-in Attendance with Geolocation
  const handleGpsCheckIn = () => {
    setGpsLocating(true);
    setGpsResult(null);

    if (!navigator.geolocation) {
      // Fallback coordinate
      submitAttendance(profile?.hostel?.gps_latitude || 31.6340, profile?.hostel?.gps_longitude || 74.8723);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        submitAttendance(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsLocating(false);
        setGpsResult({
          success: false,
          message: 'Location access was denied or unavailable. Please enable browser GPS permissions to verify attendance.',
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const submitAttendance = async (lat, lon) => {
    try {
      const res = await api.post('/student/attendance/check-in', {
        latitude: lat,
        longitude: lon,
      });

      if (res.data.success) {
        setTodayMarked(true);
        setTodayStatus(res.data.geofenceVerified ? 'Present' : 'Absent');
        setGpsResult({
          success: res.data.geofenceVerified,
          message: res.data.message,
          distance: res.data.distanceFromHostel,
        });
        loadStudentData();
      }
    } catch (err) {
      setGpsResult({
        success: false,
        message: err.response?.data?.message || 'Check-in failed',
      });
    } finally {
      setGpsLocating(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/student/leaves', leaveForm);
      setIsLeaveModalOpen(false);
      setLeaveForm({ from_date: '', to_date: '', reason: '' });
      loadStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleLodgeComplaint = async (e) => {
    e.preventDefault();
    try {
      await api.post('/student/complaints', complaintForm);
      setIsComplaintModalOpen(false);
      setComplaintForm({ category: 'Electrical', priority: 'Medium', description: '' });
      loadStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to lodge complaint');
    }
  };

  const handlePayFee = async (paymentId) => {
    try {
      const res = await api.post(`/student/payments/${paymentId}/pay`, {
        payment_method: 'UPI / NetBanking',
      });
      if (res.data?.payment) {
        setSelectedPaymentForReceipt(res.data.payment);
      }
      loadStudentData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSos = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/student/sos', { message: sosMessage });
      if (res.data.success) {
        setSosSuccess('🚨 Distress Alert Broadcasted! The Warden and Campus Security have been alerted with your room coordinates.');
        setTimeout(() => {
          setIsSosModalOpen(false);
          setSosSuccess('');
        }, 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger SOS');
    }
  };

  const handleRoomRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/student/room-request', roomReqForm);
      alert('Room transfer request submitted to Chief Warden.');
      setIsRoomReqModalOpen(false);
      setRoomReqForm({ preferred_room_type: 'Single', reason: '' });
      loadStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit room request');
    }
  };

  const filteredDayMenu = messMenu.filter((m) => m.day_of_week === selectedDay);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', flex: 1 }}>
        
        {/* Student Profile Hero Banner */}
        <div className="card" style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontSize: '1.6rem',
              fontWeight: 800,
            }}>
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'S'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  {profile?.full_name || 'Resident Student'}
                </h1>
                <span className={`badge ${profile?.is_approved ? 'badge-success' : 'badge-warning'}`}>
                  {profile?.is_approved ? 'Approved Resident' : 'Pending Verification'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                {profile?.roll_number} • {profile?.department} {profile?.drcc_id && `• DRCC: ${profile.drcc_id}`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                <span className="badge badge-indigo">
                  🏢 {profile?.hostel?.name || 'Hostel Block'} ({profile?.hostel?.block_number || 'Block-A'})
                </span>
                <span className="badge badge-teal">
                  🛏️ Room {profile?.room?.room_number || 'Unallocated'} ({profile?.room?.room_type || 'Double'})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: SOS & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="btn-sos"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.15rem' }}
            >
              <ShieldAlert size={18} />
              <span>EMERGENCY SOS</span>
            </button>
            <button
              onClick={loadStudentData}
              className="btn-secondary"
              style={{ padding: '0.65rem 0.85rem' }}
              disabled={loading}
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem'
          }}>
            <StatsCard
              title="Attendance Record"
              value={`${stats.attendancePercentage}%`}
              subtitle={`${stats.presentDays} / ${stats.totalAttendanceDays} Days Present`}
              icon={CheckCircle2}
              color="emerald"
              badgeText={stats.attendancePercentage >= 75 ? 'Satisfactory' : 'Low Attendance'}
              badgeColor={stats.attendancePercentage >= 75 ? 'success' : 'danger'}
            />
            <StatsCard
              title="Today's Check-in"
              value={todayMarked ? todayStatus : 'Pending'}
              subtitle={todayMarked ? 'GPS Verified' : 'Check-in required'}
              icon={Compass}
              color={todayMarked ? 'indigo' : 'amber'}
              badgeText={todayMarked ? 'Completed' : 'Action Req'}
              badgeColor={todayMarked ? 'success' : 'warning'}
            />
            <StatsCard
              title="Financial Dues"
              value={`₹${stats.totalPendingDues.toLocaleString('en-IN')}`}
              subtitle={`${stats.pendingPaymentsCount} Pending Invoice(s)`}
              icon={CreditCard}
              color={stats.totalPendingDues > 0 ? 'rose' : 'cyan'}
              badgeText={stats.totalPendingDues > 0 ? 'Due' : 'Paid'}
              badgeColor={stats.totalPendingDues > 0 ? 'danger' : 'success'}
            />
            <StatsCard
              title="Roommates"
              value={`${roommates.length} Roommates`}
              subtitle={profile?.room?.room_number ? `Room ${profile.room.room_number}` : 'No Room'}
              icon={Users}
              color="purple"
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
            { id: 'attendance', label: 'Attendance & GPS', icon: Compass },
            { id: 'leaves', label: `Leaves (${leaves.length})`, icon: FileText },
            { id: 'complaints', label: `Complaints (${complaints.length})`, icon: AlertTriangle },
            { id: 'room', label: 'Room & Transfer', icon: ArrowRightLeft },
            { id: 'mess', label: 'Mess Menu', icon: Utensils },
            { id: 'payments', label: `Dues & Fees (${payments.filter(p => p.status === 'Pending').length})`, icon: CreditCard },
            { id: 'notices', label: 'Announcements', icon: Megaphone },
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
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Daily Geofence Check-in Widget */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Smart GPS Geofence Check-in</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Verify presence within campus boundaries</p>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Status:</span>
                    <span className={`badge ${todayMarked ? 'badge-success' : 'badge-warning'}`}>
                      {todayMarked ? `Present (${todayStatus})` : 'Not Marked Yet'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Designated Hostel: <strong>{profile?.hostel?.name}</strong> • Perimeter Radius: <strong>{profile?.hostel?.gps_radius || 200}m</strong>
                  </div>
                </div>

                {gpsResult && (
                  <div className={gpsResult.success ? 'alert-success' : 'alert-danger'} style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                    <div>{gpsResult.message}</div>
                    {gpsResult.distance !== undefined && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.9 }}>
                        Calculated Distance from Geofence Anchor: {gpsResult.distance} meters
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleGpsCheckIn}
                  disabled={gpsLocating}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Compass size={18} className={gpsLocating ? 'spin-anim' : ''} />
                  <span>{gpsLocating ? 'Validating Geolocation Coordinates...' : todayMarked ? 'Re-verify GPS Attendance' : 'Mark Self Attendance via GPS'}</span>
                </button>
              </div>

              {/* Attendance Policy Box */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', margin: 0 }}>
                  Semester Attendance Compliance
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  A minimum of <strong>75%</strong> hostel attendance is mandatory per semester for resident privileges and welfare grants.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Cumulative Percentage</span>
                      <span style={{ fontWeight: 800, color: stats?.attendancePercentage >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                        {stats?.attendancePercentage || 0}%
                      </span>
                    </div>
                    <div style={{ height: 10, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, stats?.attendancePercentage || 0)}%`,
                        background: stats?.attendancePercentage >= 75 ? 'var(--success)' : 'var(--danger)',
                        borderRadius: 99,
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.85rem', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{stats?.presentDays || 0}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Days Present</div>
                    </div>
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '0.85rem', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>
                        {(stats?.totalAttendanceDays || 0) - (stats?.presentDays || 0)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Days Absent</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Attendance History Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Attendance Log (Last 60 Days)</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Verification Mode</th>
                      <th>Timestamp</th>
                      <th>Geofence Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((rec) => (
                      <tr key={rec._id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.attendance_date}</td>
                        <td>
                          <span className={`badge ${rec.status === 'Present' ? 'badge-success' : rec.status === 'Leave' ? 'badge-warning' : 'badge-danger'}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {rec.marked_by === 'self_gps' ? '📱 GPS Self-Verification' : rec.marked_by === 'warden_manual' ? '👮 Warden Manual Check' : 'System'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {rec.gps_location?.distance_meters !== null && rec.gps_location?.distance_meters !== undefined ? (
                            <span style={{ fontWeight: 600, color: rec.gps_location.is_within_radius ? 'var(--success)' : 'var(--danger)' }}>
                              {rec.gps_location.distance_meters}m ({rec.gps_location.is_within_radius ? 'Within Radius' : 'Out of Bounds'})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {attendanceHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No attendance records found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LEAVES */}
        {activeTab === 'leaves' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Outstation & Medical Leave Applications</h2>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Apply for Leave</span>
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted On</th>
                    <th>Warden Response</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td><span className="badge badge-indigo">{leave.from_date}</span></td>
                      <td><span className="badge badge-indigo">{leave.to_date}</span></td>
                      <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{leave.reason}</td>
                      <td>
                        <span className={`badge ${leave.status === 'Approved' ? 'badge-success' : leave.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(leave.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {leave.warden_remarks || <span style={{ color: 'var(--text-muted)' }}>Awaiting review</span>}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        You haven't submitted any leave applications.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hostel Maintenance Grievances</h2>
              <button
                onClick={() => setIsComplaintModalOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.875rem' }}
              >
                <Plus size={16} />
                <span>Lodge Complaint</span>
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Issue Description</th>
                    <th>Date Lodged</th>
                    <th>Status</th>
                    <th>Resolution / Warden Note</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <span className="badge badge-purple">{c.category}</span>
                      </td>
                      <td>
                        <span className={`badge ${c.priority === 'Urgent' ? 'badge-danger' : c.priority === 'High' ? 'badge-warning' : 'badge-indigo'}`}>
                          {c.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '340px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.description}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : c.status === 'In Progress' ? 'badge-indigo' : 'badge-warning'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {c.warden_remarks || <span style={{ color: 'var(--text-muted)' }}>Under review by maintenance team</span>}
                      </td>
                    </tr>
                  ))}
                  {complaints.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No complaints filed. Everything is in order!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ROOM & ROOM TRANSFER */}
        {activeTab === 'room' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Current Room Allotment Card */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Bed size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Current Room Allocation</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Hostel: {profile?.hostel?.name}</p>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Room Number:</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{profile?.room?.room_number || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Layout Type:</span>
                    <span className="badge badge-indigo">{profile?.room?.room_type || 'Double'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Block / Wing:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{profile?.hostel?.block_number || 'Block-A'}</span>
                  </div>
                </div>

                {/* Roommates Roster */}
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Roommates ({roommates.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roommates.map((rm) => (
                    <div key={rm._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{rm.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rm.department} • {rm.roll_number}</div>
                      </div>
                      {rm.phone && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>📞 {rm.phone}</span>}
                    </div>
                  ))}
                  {roommates.length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No other roommates currently assigned in this room.</div>
                  )}
                </div>
              </div>

              {/* Submit Room Transfer Request Form */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', margin: 0 }}>
                  Request Room Change / Transfer
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Submit a formal room change request to hostel management.
                </p>

                <form onSubmit={handleRoomRequest}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Preferred Bed / Room Type *</label>
                    <select
                      value={roomReqForm.preferred_room_type}
                      onChange={(e) => setRoomReqForm({ ...roomReqForm, preferred_room_type: e.target.value })}
                      className="form-select"
                    >
                      <option value="Single">Single Bed Room</option>
                      <option value="Double">Double Bed Room</option>
                      <option value="Triple">Triple Bed Room</option>
                      <option value="Four Bed">Four Bed Room</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Reason for Transfer *</label>
                    <textarea
                      rows={3}
                      required
                      value={roomReqForm.reason}
                      onChange={(e) => setRoomReqForm({ ...roomReqForm, reason: e.target.value })}
                      placeholder="e.g. Need single room for exam prep / medical condition..."
                      className="form-textarea"
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Send size={16} />
                    <span>Submit Transfer Request</span>
                  </button>
                </form>
              </div>

            </div>

            {/* Room Change Request History Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Room Transfer Requests</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date Requested</th>
                      <th>Current Room</th>
                      <th>Preferred Type</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests.map((req) => (
                      <tr key={req._id}>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {req.current_room ? `${req.current_room.room_number} (${req.current_room.room_type})` : 'Unassigned'}
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
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {req.admin_remarks || (req.target_room ? `Allocated to Room ${req.target_room.room_number}` : <span style={{ color: 'var(--text-muted)' }}>Under review</span>)}
                        </td>
                      </tr>
                    ))}
                    {roomRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No room transfer requests filed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MESS MENU */}
        {activeTab === 'mess' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Weekly Mess Dining Menu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>Nutritious & hygienic meal schedule</p>
              </div>

              {/* Day Selector */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
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
              {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map((meal) => {
                const item = filteredDayMenu.find((m) => m.meal_type === meal);
                return (
                  <div key={meal} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{meal}</h3>
                      <span className="badge badge-purple">{selectedDay}</span>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', minHeight: '90px', display: 'flex', alignItems: 'center' }}>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                        {item?.menu_item || 'Menu update in progress by hostel mess team.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: DUES & PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Fee Invoices & Fine Payment Portal
              </h2>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice Type</th>
                    <th>Description</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th>Transaction Receipt</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <span className="badge badge-indigo">{p.fine_type}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.description || 'Hostel Fee / Fine Invoice'}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {p.transaction_id ? (
                          <div>
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{p.transaction_id}</span>
                            <br />
                            {p.payment_date && new Date(p.payment_date).toLocaleDateString()}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {p.status === 'Pending' ? (
                          <button
                            onClick={() => handlePayFee(p._id)}
                            className="btn-primary"
                            style={{ background: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                          >
                            <CreditCard size={15} />
                            <span>Pay ₹{p.amount}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedPaymentForReceipt(p)}
                            className="btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                          >
                            <Printer size={14} />
                            <span>Receipt</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No fee invoices or fines issued. Your account is clear!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: NOTICES */}
        {activeTab === 'notices' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Campus & Hostel Announcements
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} className="card" style={{ padding: '1.5rem', border: n.is_pinned ? '1px solid #FCD34D' : '1px solid var(--border-color)', background: n.is_pinned ? '#FFFDF5' : '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="badge badge-indigo">{n.category}</span>
                      {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1rem' }}>{n.content}</p>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    Posted by: <strong style={{ color: 'var(--text-primary)' }}>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
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

      {/* MODAL: APPLY LEAVE */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Outstation / Medical Leave"
      >
        <form onSubmit={handleApplyLeave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">From Date *</label>
              <input
                type="date"
                required
                value={leaveForm.from_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">To Date *</label>
              <input
                type="date"
                required
                value={leaveForm.to_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Reason for Leave *</label>
            <textarea
              rows={3}
              required
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="e.g. Attending sister's wedding / medical appointment..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit Leave Application
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: LODGE COMPLAINT */}
      <Modal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        title="Lodge Maintenance Ticket"
      >
        <form onSubmit={handleLodgeComplaint}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label">Issue Category *</label>
              <select
                value={complaintForm.category}
                onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                className="form-select"
              >
                <option value="Electrical">Electrical (Fan, Light, Switch)</option>
                <option value="Plumbing">Plumbing (Tap, Shower, Flush)</option>
                <option value="Carpentry">Carpentry (Door, Bed, Almirah)</option>
                <option value="Cleanliness">Cleanliness & Hygiene</option>
                <option value="Internet/WiFi">WiFi / Network Issue</option>
                <option value="Mess">Mess Food Issue</option>
                <option value="Noise">Noise / Disturbance</option>
                <option value="Security">Security & Safety</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Priority Level *</label>
              <select
                value={complaintForm.priority}
                onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                className="form-select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Detailed Description *</label>
            <textarea
              rows={3}
              required
              value={complaintForm.description}
              onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
              placeholder="Please describe the issue in detail..."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsComplaintModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Lodge Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EMERGENCY SOS */}
      <Modal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        title="🚨 Broadcast Emergency SOS"
      >
        <form onSubmit={handleTriggerSos}>
          <div className="alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <strong>WARNING:</strong> Triggering an SOS alert will immediately dispatch high-priority notifications to the Chief Warden, Hostel Staff, and Security desk with your room and hostel location.
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Emergency Message / Nature of Distress</label>
            <textarea
              rows={3}
              required
              value={sosMessage}
              onChange={(e) => setSosMessage(e.target.value)}
              placeholder="Describe your emergency (e.g., medical, fire, security concern)..."
              className="form-textarea"
            />
          </div>

          {sosSuccess && (
            <div className="alert-success" style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              {sosSuccess}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsSosModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-sos" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={18} />
              <span>Broadcast SOS Now</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PAYMENT RECEIPT */}
      <Modal
        isOpen={!!selectedPaymentForReceipt}
        onClose={() => setSelectedPaymentForReceipt(null)}
        title="Official Fee Payment Receipt"
      >
        {selectedPaymentForReceipt && (
          <div>
            <div className="printable-receipt" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>CampusHome Hostel Management</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Official Electronic Payment Voucher</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Resident Name:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{profile?.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Roll Number:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{profile?.roll_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hostel & Room:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{profile?.hostel?.name} (Room {profile?.room?.room_number || 'N/A'})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Type:</span>
                  <span className="badge badge-indigo">{selectedPaymentForReceipt.fine_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Transaction ID:</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>{selectedPaymentForReceipt.transaction_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Date:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedPaymentForReceipt.payment_date ? new Date(selectedPaymentForReceipt.payment_date).toLocaleString() : new Date().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Total Paid Amount:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>₹{selectedPaymentForReceipt.amount}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default StudentDashboard;
