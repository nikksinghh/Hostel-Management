import Student from '../models/Student.js';
import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';
import Warden from '../models/Warden.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Complaint from '../models/Complaint.js';
import Payment from '../models/Payment.js';
import MessMenu from '../models/MessMenu.js';
import SosAlert from '../models/SosAlert.js';
import RoomRequest from '../models/RoomRequest.js';
import SystemLog from '../models/SystemLog.js';
import { sendNotification } from '../utils/notify.js';

// Distance calculation using Haversine Formula (in meters)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

// @desc    Get Student Profile & Dashboard Information
// @route   GET /api/student/profile
// @access  Private (Student)
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId })
      .populate('hostel')
      .populate('room');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Fetch Roommates
    let roommates = [];
    if (student.room) {
      roommates = await Student.find({
        institution: req.institutionId,
        room: student.room._id,
        _id: { $ne: student._id },
        is_approved: true,
      }).select('full_name roll_number department phone profile_image');
    }

    // Attendance stats
    const totalAttendanceDays = await Attendance.countDocuments({ institution: req.institutionId, student: student._id });
    const presentDays = await Attendance.countDocuments({ institution: req.institutionId, student: student._id, status: 'Present' });
    const attendancePercentage = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 100;

    // Financial Dues
    const pendingPayments = await Payment.find({ institution: req.institutionId, student: student._id, status: 'Pending' });
    const totalPendingDues = pendingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Active complaints
    const activeComplaintsCount = await Complaint.countDocuments({
      institution: req.institutionId,
      student: student._id,
      status: { $ne: 'Resolved' },
    });

    // Pending Room requests
    const pendingRoomRequestsCount = await RoomRequest.countDocuments({
      institution: req.institutionId,
      student: student._id,
      status: 'Pending',
    });

    res.status(200).json({
      success: true,
      student,
      roommates,
      stats: {
        totalAttendanceDays,
        presentDays,
        attendancePercentage,
        totalPendingDues,
        pendingPaymentsCount: pendingPayments.length,
        activeComplaintsCount,
        pendingRoomRequestsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch student profile', error: error.message });
  }
};

// @desc    Update Student Profile
// @route   PUT /api/student/profile
// @access  Private (Student)
export const updateStudentProfile = async (req, res) => {
  try {
    const { phone, parent_name, parent_phone, address, emergency_contact } = req.body;
    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (phone) student.phone = phone.trim();
    if (parent_name) student.parent_name = parent_name.trim();
    if (parent_phone) student.parent_phone = parent_phone.trim();
    if (address) student.address = address.trim();
    if (emergency_contact) student.emergency_contact = emergency_contact.trim();

    if (req.file) {
      student.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    await student.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
};

// @desc    Get Attendance History
// @route   GET /api/student/attendance
// @access  Private (Student)
export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ institution: req.institutionId, student: req.user._id })
      .sort({ attendance_date: -1 })
      .limit(60);

    const todayDate = new Date().toISOString().split('T')[0];
    const todayRecord = await Attendance.findOne({ institution: req.institutionId, student: req.user._id, attendance_date: todayDate });

    res.status(200).json({
      success: true,
      todayMarked: !!todayRecord,
      todayStatus: todayRecord ? todayRecord.status : 'Not Marked',
      todayRecord,
      records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records', error: error.message });
  }
};

// @desc    Self Check-in Attendance via Geolocation / GPS
// @route   POST /api/student/attendance/check-in
// @access  Private (Student)
export const markSelfAttendance = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId }).populate('hostel');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    if (!student.is_approved) {
      return res.status(403).json({ success: false, message: 'Your admission is not yet approved by hostel administration' });
    }

    if (!student.hostel) {
      return res.status(400).json({ success: false, message: 'No hostel assigned to your profile' });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    // Check if session exists or create
    let session = await AttendanceSession.findOne({ institution: req.institutionId, hostel: student.hostel._id, session_date: todayDate });
    if (!session) {
      session = await AttendanceSession.create({
        institution: req.institutionId,
        hostel: student.hostel._id,
        session_date: todayDate,
        is_active: true,
      });
    }

    // GPS Geofence validation
    let isWithinRadius = true;
    let distanceMeters = 0;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (!isNaN(lat) && !isNaN(lon) && student.hostel.gps_latitude && student.hostel.gps_longitude) {
      distanceMeters = calculateDistance(
        lat,
        lon,
        student.hostel.gps_latitude,
        student.hostel.gps_longitude
      );
      const allowedRadius = student.hostel.gps_radius || 250;
      isWithinRadius = distanceMeters <= allowedRadius;
    }

    const attendance = await Attendance.findOneAndUpdate(
      { institution: req.institutionId, student: student._id, attendance_date: todayDate },
      {
        institution: req.institutionId,
        session: session._id,
        status: isWithinRadius ? 'Present' : 'Absent',
        marked_by: 'self_gps',
        marked_at: new Date(),
        gps_location: {
          latitude: !isNaN(lat) ? lat : null,
          longitude: !isNaN(lon) ? lon : null,
          distance_meters: Math.round(distanceMeters),
          is_within_radius: isWithinRadius,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: isWithinRadius ? 'Attendance recorded successfully as Present' : `Location outside hostel geofence (${Math.round(distanceMeters)}m away). Marked as Absent.`,
      attendance,
      geofenceVerified: isWithinRadius,
      distanceFromHostel: Math.round(distanceMeters),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record attendance', error: error.message });
  }
};

// @desc    Apply for Leave
// @route   POST /api/student/leaves
// @access  Private (Student)
export const applyLeave = async (req, res) => {
  try {
    const { from_date, to_date, reason } = req.body;
    if (!from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'From Date, To Date and Reason are required' });
    }

    if (new Date(to_date) < new Date(from_date)) {
      return res.status(400).json({ success: false, message: 'To Date cannot be earlier than From Date' });
    }

    // Overlap check: ensure no existing approved or pending leaves in this date range
    const overlapping = await LeaveRequest.findOne({
      institution: req.institutionId,
      student: req.user._id,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { from_date: { $lte: to_date }, to_date: { $gte: from_date } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `You already have an active or pending leave request for overlapping dates (${overlapping.from_date} to ${overlapping.to_date})`,
      });
    }

    let documentUrl = '';
    if (req.file) {
      documentUrl = `/uploads/documents/${req.file.filename}`;
    }

    const leave = await LeaveRequest.create({
      institution: req.institutionId,
      student: req.user._id,
      from_date,
      to_date,
      reason: reason.trim(),
      document_url: documentUrl,
      status: 'Pending',
    });

    // Notify warden if assigned
    if (req.user.hostel) {
      const warden = await Warden.findOne({ institution: req.institutionId, hostel: req.user.hostel });
      if (warden) {
        await sendNotification({
          institution: req.institutionId,
          recipient_id: warden._id,
          recipient_role: 'warden',
          title: 'New Leave Request',
          message: `${req.user.full_name} applied for leave from ${from_date} to ${to_date}.`,
          type: 'leave',
        });
      }
    }

    res.status(201).json({ success: true, message: 'Leave application submitted successfully', leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to apply for leave', error: error.message });
  }
};

// @desc    Get My Leave Applications
// @route   GET /api/student/leaves
// @access  Private (Student)
export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ institution: req.institutionId, student: req.user._id })
      .populate('action_by', 'full_name')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leave history', error: error.message });
  }
};

// @desc    Lodge Complaint
// @route   POST /api/student/complaints
// @access  Private (Student)
export const lodgeComplaint = async (req, res) => {
  try {
    const { category, description, priority } = req.body;
    if (!category || !description) {
      return res.status(400).json({ success: false, message: 'Category and description are required' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/complaints/${req.file.filename}`;
    }

    const complaint = await Complaint.create({
      institution: req.institutionId,
      hostel: req.user.hostel?._id || req.user.hostel,
      student: req.user._id,
      category,
      priority: priority || 'Medium',
      description: description.trim(),
      image_url: imageUrl,
      status: 'Pending',
    });

    // Notify warden
    if (req.user.hostel) {
      const warden = await Warden.findOne({ institution: req.institutionId, hostel: req.user.hostel });
      if (warden) {
        await sendNotification({
          institution: req.institutionId,
          recipient_id: warden._id,
          recipient_role: 'warden',
          title: `New Complaint: ${category}`,
          message: `${req.user.full_name} lodged a new complaint (${category} - ${priority || 'Medium'} priority).`,
          type: 'complaint',
        });
      }
    }

    res.status(201).json({ success: true, message: 'Complaint lodged successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to lodge complaint', error: error.message });
  }
};

// @desc    Get My Complaints
// @route   GET /api/student/complaints
// @access  Private (Student)
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ institution: req.institutionId, student: req.user._id }).sort({ created_at: -1 });
    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints', error: error.message });
  }
};

// @desc    Get Weekly Mess Menu for Student's Hostel
// @route   GET /api/student/mess-menu
// @access  Private (Student)
export const getMyMessMenu = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId });
    if (!student || !student.hostel) {
      return res.status(200).json({ success: true, menu: [] });
    }

    const menu = await MessMenu.find({ institution: req.institutionId, hostel: student.hostel }).sort({ day_of_week: 1 });
    res.status(200).json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch mess menu', error: error.message });
  }
};

// @desc    Get My Invoices, Fines & Fee Records
// @route   GET /api/student/payments
// @access  Private (Student)
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ institution: req.institutionId, student: req.user._id }).sort({ created_at: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment records', error: error.message });
  }
};

// @desc    Pay Fee / Fine Online (Simulated Instant Payment Gateway with Idempotency)
// @route   POST /api/student/payments/:id/pay
// @access  Private (Student)
export const payFeeOnline = async (req, res) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;

    if (idempotencyKey) {
      const existing = await Payment.findOne({ idempotency_key: idempotencyKey, status: 'Paid' });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed (idempotent)',
          payment: existing,
          transaction_id: existing.transaction_id,
        });
      }
    }

    const txnId = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const updateFields = {
      status: 'Paid',
      transaction_id: txnId,
      payment_date: new Date(),
    };
    if (idempotencyKey) {
      updateFields.idempotency_key = idempotencyKey;
    }

    // Atomically find and update only if status is still 'Pending'
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, institution: req.institutionId, student: req.user._id, status: 'Pending' },
      { $set: updateFields },
      { new: true }
    );

    if (!payment) {
      const existingPayment = await Payment.findOne({ _id: req.params.id, institution: req.institutionId, student: req.user._id });
      if (!existingPayment) {
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }
      if (existingPayment.status === 'Paid') {
        return res.status(400).json({ success: false, message: 'This fee is already paid' });
      }
      return res.status(400).json({ success: false, message: 'Payment cannot be processed' });
    }

    await sendNotification({
      institution: req.institutionId,
      recipient_id: req.user._id,
      recipient_role: 'student',
      title: 'Payment Confirmed',
      message: `Payment of ₹${payment.amount} for "${payment.fine_type}" was successful. Txn ID: ${txnId}`,
      type: 'payment',
    });

    res.status(200).json({
      success: true,
      message: 'Payment received successfully! Receipt generated.',
      payment,
      transaction_id: txnId,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Payment.findOne({ idempotency_key: req.headers['idempotency-key'] || req.body.idempotency_key });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed (idempotent)',
          payment: existing,
          transaction_id: existing.transaction_id,
        });
      }
    }
    res.status(500).json({ success: false, message: 'Payment failed', error: error.message });
  }
};

// @desc    Trigger Emergency SOS Alert
// @route   POST /api/student/sos
// @access  Private (Student)
export const triggerSos = async (req, res) => {
  try {
    const { message } = req.body;
    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId }).populate('room');

    const roomNum = student.room ? student.room.room_number : 'Unassigned';

    const alert = await SosAlert.create({
      institution: req.institutionId,
      hostel: student.hostel,
      student: student._id,
      room_number: roomNum,
      message: message || 'EMERGENCY: Immediate assistance requested!',
      status: 'Active',
    });

    await SystemLog.create({
      institution: req.institutionId,
      user_id: student._id,
      user_type: 'student',
      action: 'Emergency SOS',
      description: `SOS Alert triggered by ${student.full_name} (Room: ${roomNum})`,
      ip_address: req.ip || '',
    });

    // Notify Warden
    if (student.hostel) {
      const warden = await Warden.findOne({ institution: req.institutionId, hostel: student.hostel });
      if (warden) {
        await sendNotification({
          institution: req.institutionId,
          recipient_id: warden._id,
          recipient_role: 'warden',
          title: '🚨 EMERGENCY SOS ALERT',
          message: `${student.full_name} (Room ${roomNum}) triggered an emergency SOS: "${message || 'Immediate assistance requested!'}"`,
          type: 'sos',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS broadcasted to Warden and Admin immediately!',
      alert,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to trigger SOS alert', error: error.message });
  }
};

// @desc    Request Room Allocation / Transfer
// @route   POST /api/student/room-request
// @access  Private (Student)
export const requestRoomChange = async (req, res) => {
  try {
    const { preferred_room_type, reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason for room transfer is required' });
    }

    const student = await Student.findOne({ _id: req.user._id, institution: req.institutionId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.hostel) {
      return res.status(400).json({ success: false, message: 'No hostel assigned to your profile' });
    }

    // Check for existing pending request
    const pendingReq = await RoomRequest.findOne({
      institution: req.institutionId,
      student: student._id,
      status: 'Pending',
    });

    if (pendingReq) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending room change request under review',
      });
    }

    const roomReq = await RoomRequest.create({
      institution: req.institutionId,
      hostel: student.hostel,
      student: student._id,
      current_room: student.room || null,
      preferred_room_type: preferred_room_type || 'Single',
      reason: reason.trim(),
      status: 'Pending',
    });

    // Notify Warden
    const warden = await Warden.findOne({ institution: req.institutionId, hostel: student.hostel });
    if (warden) {
      await sendNotification({
        institution: req.institutionId,
        recipient_id: warden._id,
        recipient_role: 'warden',
        title: 'New Room Change Request',
        message: `${student.full_name} submitted a request for room change (${preferred_room_type || 'Single'}).`,
        type: 'room',
      });
    }

    res.status(201).json({ success: true, message: 'Room change request submitted to warden/admin', roomReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request room transfer', error: error.message });
  }
};

// @desc    Get Student Room Requests
// @route   GET /api/student/room-requests
// @access  Private (Student)
export const getMyRoomRequests = async (req, res) => {
  try {
    const requests = await RoomRequest.find({
      institution: req.institutionId,
      student: req.user._id,
    })
      .populate('current_room', 'room_number room_type')
      .populate('target_room', 'room_number room_type')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: requests.length, roomRequests: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch room requests', error: error.message });
  }
};
