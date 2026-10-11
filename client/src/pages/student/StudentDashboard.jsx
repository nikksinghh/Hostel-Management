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
      // Fallback coordinate for demo/unsupported devices
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
          message: 'Location access was denied or unavailable. Please enable browser GPS location permissions to verify attendance.',
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-mesh" />
      <Navbar />

      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.75rem 1.5rem', width: '100%', flex: 1 }}>
        
        {/* Student Profile Hero Banner */}
        <div className="glass-card" style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.6rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
            }}>
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'S'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
                  {profile?.full_name || 'Resident Student'}
                </h1>
                <span className={`badge ${profile?.is_approved ? 'badge-success' : 'badge-warning'}`}>
                  {profile?.is_approved ? 'Approved Resident' : 'Pending Verification'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {profile?.roll_number} • {profile?.department} {profile?.drcc_id && `• DRCC: ${profile.drcc_id}`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-info">
                  🏢 {profile?.hostel?.name || 'Hostel'} ({profile?.hostel?.block_number || 'Block-A'})
                </span>
                <span className="badge badge-purple">
                  🛏️ Room {profile?.room?.room_number || 'Unallocated'} ({profile?.room?.room_type || 'Double'})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: SOS & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="btn btn-sos"
            >
              <ShieldAlert size={20} />
              <span>EMERGENCY SOS</span>
            </button>
            <button
              onClick={loadStudentData}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
            { id: 'attendance', label: 'Attendance & GPS', icon: Compass },
            { id: 'leaves', label: `Leaves (${leaves.length})`, icon: FileText },
            { id: 'complaints', label: `Complaints (${complaints.length})`, icon: AlertTriangle },
            { id: 'room', label: 'Room & Transfer', icon: ArrowRightLeft },
            { id: 'mess', label: 'Mess Menu', icon: Utensils },
            { id: 'payments', label: `Dues & Fees (${payments.filter(p => p.status === 'Pending').length})`, icon: CreditCard },
            { id: 'notices', label: 'Announcements', icon: Megaphone },
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
                  borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  padding: '0.65rem 1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} color={isActive ? '#818cf8' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Daily Geofence Check-in Widget */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>Daily Smart Geofence Check-in</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Verify location within hostel GPS perimeter</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Today's Status:</span>
                    <span className={`badge ${todayMarked ? 'badge-success' : 'badge-warning'}`}>
                      {todayMarked ? `Present (${todayStatus})` : 'Not Marked Yet'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hostel: <strong>{profile?.hostel?.name}</strong> • Geofence Radius: <strong>{profile?.hostel?.gps_radius || 200}m</strong>
                  </div>
                </div>

                {gpsResult && (
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: gpsResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${gpsResult.success ? '#10b981' : '#ef4444'}`,
                    color: gpsResult.success ? '#34d399' : '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1rem'
                  }}>
                    {gpsResult.message}
                    {gpsResult.distance !== undefined && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', opacity: 0.9 }}>
                        Calculated Distance from Hostel: {gpsResult.distance} meters
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleGpsCheckIn}
                  disabled={gpsLocating}
                  className="btn btn-primary w-full"
                >
                  <Compass size={18} className={gpsLocating ? 'animate-spin' : ''} />
                  <span>{gpsLocating ? 'Validating GPS Location...' : todayMarked ? 'Re-verify GPS Attendance' : 'Mark Self Attendance via GPS'}</span>
                </button>
              </div>

              {/* Attendance Statistics Box */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '1rem' }}>Semester Attendance Policy</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  A minimum of <strong>75%</strong> hostel attendance is mandatory per semester to maintain resident status and DRCC scholarship compliance.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                      <span>Current Cumulative Attendance</span>
                      <span style={{ fontWeight: 700, color: stats?.attendancePercentage >= 75 ? '#34d399' : '#f87171' }}>
                        {stats?.attendancePercentage || 0}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, stats?.attendancePercentage || 0)}%`,
                        background: stats?.attendancePercentage >= 75 ? '#10b981' : '#ef4444',
                        borderRadius: 4
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{stats?.presentDays || 0}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Days Present</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>
                        {(stats?.totalAttendanceDays || 0) - (stats?.presentDays || 0)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Days Absent</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Attendance History Table */}
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '1rem' }}>Attendance Log (Last 60 Days)</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Verification Mode</th>
                    <th>Timestamp</th>
                    <th>Geofence Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((rec) => (
                    <tr key={rec._id}>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{rec.attendance_date}</td>
                      <td>
                        <span className={`badge ${rec.status === 'Present' ? 'badge-success' : rec.status === 'Leave' ? 'badge-warning' : 'badge-danger'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {rec.marked_by === 'self_gps' ? '📱 GPS Self-Verification' : rec.marked_by === 'warden_manual' ? '👮 Warden Manual Check' : 'System'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {rec.gps_location?.distance_meters !== null && rec.gps_location?.distance_meters !== undefined ? (
                          <span style={{ color: rec.gps_location.is_within_radius ? '#34d399' : '#f87171' }}>
                            {rec.gps_location.distance_meters}m ({rec.gps_location.is_within_radius ? 'Within Bounds' : 'Out of Bounds'})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {attendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No attendance records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LEAVES */}
        {activeTab === 'leaves' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Outstation & Medical Leave Applications</h2>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn btn-primary btn-sm"
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
                      <td><span className="badge badge-info">{leave.from_date}</span></td>
                      <td><span className="badge badge-info">{leave.to_date}</span></td>
                      <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>{leave.reason}</td>
                      <td>
                        <span className={`badge ${leave.status === 'Approved' ? 'badge-success' : leave.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(leave.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {leave.warden_remarks || <span style={{ color: 'var(--text-muted)' }}>Awaiting warden review</span>}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Hostel Maintenance Grievances</h2>
              <button
                onClick={() => setIsComplaintModalOpen(true)}
                className="btn btn-primary btn-sm"
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
                        <span className={`badge ${c.priority === 'Urgent' ? 'badge-danger' : c.priority === 'High' ? 'badge-warning' : 'badge-info'}`}>
                          {c.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '340px', fontSize: '0.85rem' }}>{c.description}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Resolved' ? 'badge-success' : c.status === 'In Progress' ? 'badge-info' : 'badge-warning'}`}>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No complaints filed.
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
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                    <Bed size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0 }}>Current Room Allocation</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Hostel: {profile?.hostel?.name}</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Room Number:</span>
                    <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.1rem' }}>{profile?.room?.room_number || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Room Type:</span>
                    <span className="badge badge-info">{profile?.room?.room_type || 'Double'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Block:</span>
                    <span style={{ color: '#ffffff' }}>{profile?.hostel?.block_number || 'Block-A'}</span>
                  </div>
                </div>

                {/* Roommates Roster */}
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Roommates ({roommates.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roommates.map((rm) => (
                    <div key={rm._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.85rem', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>{rm.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rm.department} • {rm.roll_number}</div>
                      </div>
                      {rm.phone && <span style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>📞 {rm.phone}</span>}
                    </div>
                  ))}
                  {roommates.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No roommates currently assigned in this room.</div>
                  )}
                </div>
              </div>

              {/* Submit Room Transfer Request Form */}
              <div className="glass-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                  Request Room Change / Transfer
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Submit a formal room change request to the hostel administration.
                </p>

                <form onSubmit={handleRoomRequest}>
                  <div className="form-group">
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

                  <div className="form-group">
                    <label className="form-label">Reason for Transfer *</label>
                    <textarea
                      rows={3}
                      required
                      value={roomReqForm.reason}
                      onChange={(e) => setRoomReqForm({ ...roomReqForm, reason: e.target.value })}
                      placeholder="e.g. Need quiet single room for study / health reasons..."
                      className="form-textarea"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
                    <Send size={16} />
                    <span>Submit Transfer Request</span>
                  </button>
                </form>
              </div>

            </div>

            {/* Room Change Request History Table */}
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '1rem' }}>My Room Transfer Requests</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date Requested</th>
                    <th>Current Room</th>
                    <th>Preferred Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Admin / Warden Remarks</th>
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
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem' }}>{req.reason}</td>
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No room transfer requests filed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: MESS MENU */}
        {activeTab === 'mess' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Weekly Mess Dining Menu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nutritious & hygienic meal schedule</p>
              </div>

              {/* Day Selector */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`btn btn-sm ${selectedDay === day ? 'btn-primary' : 'btn-secondary'}`}
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
                  <div key={meal} className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{meal}</h3>
                      <span className="badge badge-purple">{selectedDay}</span>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', minHeight: '90px', display: 'flex', alignItems: 'center' }}>
                      <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {item?.menu_item || 'Menu update in progress by mess manager.'}
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
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem' }}>
              Fee Invoices & Fine Payment Portal
            </h2>

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
                        <span className="badge badge-info">{p.fine_type}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{p.description || 'Hostel Fee / Fine Invoice'}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.transaction_id ? (
                          <div>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>{p.transaction_id}</span>
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
                            className="btn btn-success btn-sm"
                          >
                            <CreditCard size={15} />
                            <span>Pay ₹{p.amount} Now</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedPaymentForReceipt(p)}
                            className="btn btn-secondary btn-sm"
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
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
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '1.25rem' }}>
              Campus & Hostel Announcements
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} className="glass-card" style={{ padding: '1.5rem', border: n.is_pinned ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <span className="badge badge-info">{n.category}</span>
                      {n.is_pinned && <span className="badge badge-warning">📌 Pinned</span>}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.4rem' }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>{n.content}</p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    Posted by: <strong>{n.posted_by}</strong> • {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {notices.length === 0 && (
                <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Megaphone size={36} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">From Date *</label>
              <input
                type="date"
                required
                value={leaveForm.from_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Reason for Leave *</label>
            <textarea
              rows={3}
              required
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="e.g. Attending family function, medical appointment, etc."
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
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

            <div className="form-group">
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

          <div className="form-group">
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsComplaintModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: '#f87171', fontSize: '0.88rem' }}>
            <strong>WARNING:</strong> Triggering an SOS alert will immediately dispatch high-priority notifications to the Chief Warden, Hostel Staff, and Security desk with your room and hostel location.
          </div>

          <div className="form-group">
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
            <div style={{ color: '#34d399', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
              {sosSuccess}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setIsSosModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-sos">
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
        title="Fee Payment Receipt"
      >
        {selectedPaymentForReceipt && (
          <div>
            <div className="printable-receipt" style={{ background: '#0b0f19', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>CampusHome Hostel Management</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Electronic Payment Voucher</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Resident Name:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{profile?.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Roll Number:</span>
                  <span style={{ color: '#ffffff' }}>{profile?.roll_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hostel & Room:</span>
                  <span style={{ color: '#ffffff' }}>{profile?.hostel?.name} (Room {profile?.room?.room_number || 'N/A'})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Type:</span>
                  <span className="badge badge-info">{selectedPaymentForReceipt.fine_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>{selectedPaymentForReceipt.transaction_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Date:</span>
                  <span style={{ color: '#ffffff' }}>{selectedPaymentForReceipt.payment_date ? new Date(selectedPaymentForReceipt.payment_date).toLocaleString() : new Date().toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Total Paid Amount:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>₹{selectedPaymentForReceipt.amount}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
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
