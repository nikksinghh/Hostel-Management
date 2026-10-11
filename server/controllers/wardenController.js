import Warden from '../models/Warden.js';
import Hostel from '../models/Hostel.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';
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

// Helper to get warden's assigned hostel ID
const getWardenHostelId = (req) => {
  return req.user.hostel?._id || req.user.hostel;
};

// @desc    Get Warden Dashboard Overview Stats
// @route   GET /api/warden/stats
// @access  Private (Warden)
export const getWardenStats = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) {
      return res.status(200).json({
        success: true,
        stats: {
          hasHostel: false,
          message: 'No hostel currently assigned to your warden profile.',
        },
      });
    }

    const hostel = await Hostel.findById(hostelId);
    const totalStudents = await Student.countDocuments({ institution: req.institutionId, hostel: hostelId, is_approved: true });
    const rooms = await Room.find({ institution: req.institutionId, hostel: hostelId });
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.total_beds || 0), 0);
    const availableBeds = rooms.reduce((acc, r) => acc + (r.available_beds || 0), 0);
    const occupiedBeds = totalCapacity - availableBeds;

    const todayDate = new Date().toISOString().split('T')[0];
    const todaySession = await AttendanceSession.findOne({ institution: req.institutionId, hostel: hostelId, session_date: todayDate });
    const presentToday = todaySession
      ? await Attendance.countDocuments({ institution: req.institutionId, session: todaySession._id, status: 'Present' })
      : 0;

    // Get hostel student IDs
    const studentIds = (await Student.find({ institution: req.institutionId, hostel: hostelId }).select('_id')).map((s) => s._id);

    const pendingLeaves = await LeaveRequest.countDocuments({ institution: req.institutionId, student: { $in: studentIds }, status: 'Pending' });
    const openComplaints = await Complaint.countDocuments({ institution: req.institutionId, student: { $in: studentIds }, status: { $ne: 'Resolved' } });
    const activeSos = await SosAlert.countDocuments({ institution: req.institutionId, student: { $in: studentIds }, status: 'Active' });
    const pendingRoomRequests = await RoomRequest.countDocuments({ institution: req.institutionId, hostel: hostelId, status: 'Pending' });

    res.status(200).json({
      success: true,
      stats: {
        hasHostel: true,
        hostelName: hostel ? hostel.name : 'N/A',
        hostelType: hostel ? hostel.type : 'N/A',
        blockNumber: hostel ? hostel.block_number : 'N/A',
        gps_latitude: hostel ? hostel.gps_latitude : 0,
        gps_longitude: hostel ? hostel.gps_longitude : 0,
        gps_radius: hostel ? hostel.gps_radius : 200,
        totalStudents,
        totalRooms,
        totalCapacity,
        occupiedBeds,
        availableBeds,
        presentToday,
        pendingLeaves,
        openComplaints,
        activeSos,
        pendingRoomRequests,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch warden stats', error: error.message });
  }
};

// @desc    Get All Students in Warden's Hostel
// @route   GET /api/warden/students
// @access  Private (Warden)
export const getHostelStudents = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, students: [] });

    const students = await Student.find({ institution: req.institutionId, hostel: hostelId })
      .populate('room', 'room_number room_type total_beds available_beds')
      .sort({ full_name: 1 });

    // Enrich with pending dues and attendance stats
    const enriched = await Promise.all(
      students.map(async (st) => {
        const pendingDues = await Payment.find({ institution: req.institutionId, student: st._id, status: 'Pending' });
        const totalPendingAmount = pendingDues.reduce((acc, p) => acc + (p.amount || 0), 0);
        const activeLeave = await LeaveRequest.findOne({
          institution: req.institutionId,
          student: st._id,
          status: 'Approved',
          to_date: { $gte: new Date().toISOString().split('T')[0] },
        });

        return {
          ...st.toObject(),
          totalPendingDues: totalPendingAmount,
          hasActiveLeave: !!activeLeave,
          activeLeaveDetails: activeLeave ? `${activeLeave.from_date} to ${activeLeave.to_date}` : null,
        };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, students: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
};

// @desc    Get Hostel Rooms
// @route   GET /api/warden/rooms
// @access  Private (Warden)
export const getWardenRooms = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, rooms: [] });

    const rooms = await Room.find({ institution: req.institutionId, hostel: hostelId }).sort({ room_number: 1 }).lean();

    const enrichedRooms = await Promise.all(
      rooms.map(async (r) => {
        const occupants = await Student.find({ institution: req.institutionId, room: r._id, is_approved: true }).select('full_name roll_number phone department');
        return { ...r, occupants };
      })
    );

    res.status(200).json({ success: true, count: enrichedRooms.length, rooms: enrichedRooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: error.message });
  }
};

// @desc    Add Room to Hostel
// @route   POST /api/warden/rooms
// @access  Private (Warden)
export const createRoom = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(400).json({ success: false, message: 'Warden has no assigned hostel' });

    const { room_number, room_type, total_beds } = req.body;
    if (!room_number || !total_beds) {
      return res.status(400).json({ success: false, message: 'Room number and total beds are required' });
    }

    const existing = await Room.findOne({ institution: req.institutionId, hostel: hostelId, room_number: room_number.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Room ${room_number} already exists in this hostel` });
    }

    const beds = parseInt(total_beds);
    const room = await Room.create({
      institution: req.institutionId,
      hostel: hostelId,
      room_number: room_number.trim(),
      room_type: room_type || 'Double',
      total_beds: beds,
      available_beds: beds,
    });

    res.status(201).json({ success: true, message: 'Room created successfully', room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create room', error: error.message });
  }
};

// @desc    Update Room
// @route   PUT /api/warden/rooms/:id
// @access  Private (Warden)
export const updateRoom = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    const { room_number, room_type, total_beds } = req.body;
    const room = await Room.findOne({ _id: req.params.id, institution: req.institutionId, hostel: hostelId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found or access denied' });

    const occupantsCount = await Student.countDocuments({ institution: req.institutionId, room: room._id });
    if (total_beds && parseInt(total_beds) < occupantsCount) {
      return res.status(400).json({
        success: false,
        message: `Total beds cannot be less than current occupants (${occupantsCount})`,
      });
    }

    if (room_number) room.room_number = room_number.trim();
    if (room_type) room.room_type = room_type;
    if (total_beds) {
      const newTotal = parseInt(total_beds);
      room.available_beds = newTotal - occupantsCount;
      room.total_beds = newTotal;
    }

    await room.save();
    res.status(200).json({ success: true, message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update room', error: error.message });
  }
};

// @desc    Delete Room
// @route   DELETE /api/warden/rooms/:id
// @access  Private (Warden)
export const deleteRoom = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    const room = await Room.findOne({ _id: req.params.id, institution: req.institutionId, hostel: hostelId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found or access denied' });

    const occupantsCount = await Student.countDocuments({ institution: req.institutionId, room: req.params.id });
    if (occupantsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete room with ${occupantsCount} active occupants. Reallocate them first.`,
      });
    }

    await Room.findByIdAndDelete(room._id);
    res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete room', error: error.message });
  }
};

// @desc    Get Today's Attendance Sheet & Session Status
// @route   GET /api/warden/attendance/today
// @access  Private (Warden)
export const getTodayAttendance = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, session: null, roster: [] });

    const todayDate = req.query.date || new Date().toISOString().split('T')[0];

    // Find or create session
    let session = await AttendanceSession.findOne({ institution: req.institutionId, hostel: hostelId, session_date: todayDate });
    if (!session) {
      session = await AttendanceSession.create({
        institution: req.institutionId,
        hostel: hostelId,
        session_date: todayDate,
        is_active: true,
      });
    }

    const students = await Student.find({ institution: req.institutionId, hostel: hostelId, is_approved: true })
      .populate('room', 'room_number')
      .sort({ full_name: 1 })
      .lean();

    const attendanceRecords = await Attendance.find({
      institution: req.institutionId,
      attendance_date: todayDate,
      student: { $in: students.map((s) => s._id) },
    }).lean();

    const recordMap = new Map();
    attendanceRecords.forEach((rec) => {
      recordMap.set(String(rec.student), rec);
    });

    const studentRoster = students.map((student) => {
      const record = recordMap.get(String(student._id));
      return {
        studentId: student._id,
        fullName: student.full_name,
        rollNumber: student.roll_number,
        roomNumber: student.room?.room_number || 'N/A',
        department: student.department,
        status: record ? record.status : 'Absent',
        markedAt: record ? record.marked_at : null,
        markedBy: record ? record.marked_by : null,
        recordId: record ? record._id : null,
      };
    });

    res.status(200).json({
      success: true,
      date: todayDate,
      session,
      roster: studentRoster,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance roster', error: error.message });
  }
};

// @desc    Manual Mark or Update Attendance by Warden
// @route   POST /api/warden/attendance/mark
// @access  Private (Warden)
export const markAttendanceManual = async (req, res) => {
  try {
    const { student_id, attendance_date, status } = req.body;
    if (!student_id || !status) {
      return res.status(400).json({ success: false, message: 'Student ID and Status (Present/Absent/Leave) are required' });
    }

    const hostelId = getWardenHostelId(req);
    // Verify student belongs to warden's hostel
    const student = await Student.findOne({ _id: student_id, institution: req.institutionId, hostel: hostelId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found in your assigned hostel' });
    }

    const date = attendance_date || new Date().toISOString().split('T')[0];

    let session = await AttendanceSession.findOne({ institution: req.institutionId, hostel: hostelId, session_date: date });
    if (!session) {
      session = await AttendanceSession.create({ institution: req.institutionId, hostel: hostelId, session_date: date, is_active: true });
    }

    const record = await Attendance.findOneAndUpdate(
      { institution: req.institutionId, student: student_id, attendance_date: date },
      {
        institution: req.institutionId,
        session: session._id,
        status,
        marked_by: 'warden_manual',
        marked_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: `Attendance marked as ${status}`, record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark attendance', error: error.message });
  }
};

// @desc    Get Leave Requests for Warden's Hostel
// @route   GET /api/warden/leaves
// @access  Private (Warden)
export const getWardenLeaves = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, leaves: [] });

    const studentIds = (await Student.find({ institution: req.institutionId, hostel: hostelId }).select('_id')).map((s) => s._id);
    const leaves = await LeaveRequest.find({ institution: req.institutionId, student: { $in: studentIds } })
      .populate('student', 'full_name roll_number department phone room')
      .populate('action_by', 'full_name')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: error.message });
  }
};

// @desc    Approve / Reject Leave
// @route   PUT /api/warden/leaves/:id
// @access  Private (Warden)
export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, warden_remarks } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const hostelId = getWardenHostelId(req);
    const leave = await LeaveRequest.findOne({ _id: req.params.id, institution: req.institutionId }).populate('student');
    if (!leave || !leave.student || String(leave.student.hostel) !== String(hostelId)) {
      return res.status(404).json({ success: false, message: 'Leave request not found or access denied' });
    }

    leave.status = status;
    leave.warden_remarks = warden_remarks || '';
    leave.action_by = req.user._id;
    await leave.save();

    // Send notification to student
    await sendNotification({
      institution: req.institutionId,
      recipient_id: leave.student._id,
      recipient_role: 'student',
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leave.from_date} to ${leave.to_date} was ${status}.${warden_remarks ? ' Remarks: ' + warden_remarks : ''}`,
      type: 'leave',
    });

    res.status(200).json({ success: true, message: `Leave request has been ${status}`, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update leave', error: error.message });
  }
};

// @desc    Get Complaints for Hostel
// @route   GET /api/warden/complaints
// @access  Private (Warden)
export const getWardenComplaints = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, complaints: [] });

    const studentIds = (await Student.find({ institution: req.institutionId, hostel: hostelId }).select('_id')).map((s) => s._id);
    const complaints = await Complaint.find({ institution: req.institutionId, student: { $in: studentIds } })
      .populate({
        path: 'student',
        select: 'full_name roll_number phone room',
        populate: { path: 'room', select: 'room_number' },
      })
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints', error: error.message });
  }
};

// @desc    Update Complaint Status
// @route   PUT /api/warden/complaints/:id
// @access  Private (Warden)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, warden_remarks } = req.body;
    const hostelId = getWardenHostelId(req);
    const complaint = await Complaint.findOne({ _id: req.params.id, institution: req.institutionId }).populate('student');
    if (!complaint || !complaint.student || String(complaint.student.hostel) !== String(hostelId)) {
      return res.status(404).json({ success: false, message: 'Complaint not found or access denied' });
    }

    if (status) complaint.status = status;
    if (warden_remarks !== undefined) complaint.warden_remarks = warden_remarks;

    await complaint.save();

    // Send notification to student
    await sendNotification({
      institution: req.institutionId,
      recipient_id: complaint.student._id,
      recipient_role: 'student',
      title: `Complaint Updated: ${complaint.category}`,
      message: `Your complaint (${complaint.category}) status is now "${complaint.status}".${warden_remarks ? ' Remarks: ' + warden_remarks : ''}`,
      type: 'complaint',
    });

    res.status(200).json({ success: true, message: 'Complaint updated successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update complaint', error: error.message });
  }
};

// @desc    Get SOS Emergency Alerts
// @route   GET /api/warden/sos
// @access  Private (Warden)
export const getWardenSosAlerts = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, alerts: [] });

    const studentIds = (await Student.find({ institution: req.institutionId, hostel: hostelId }).select('_id')).map((s) => s._id);
    const alerts = await SosAlert.find({ institution: req.institutionId, student: { $in: studentIds } })
      .populate({
        path: 'student',
        select: 'full_name roll_number phone emergency_contact room',
        populate: { path: 'room', select: 'room_number' },
      })
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch SOS alerts', error: error.message });
  }
};

// @desc    Resolve / Acknowledge SOS Alert
// @route   PUT /api/warden/sos/:id
// @access  Private (Warden)
export const updateSosAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const hostelId = getWardenHostelId(req);
    const alert = await SosAlert.findOne({ _id: req.params.id, institution: req.institutionId }).populate('student');
    if (!alert || !alert.student || String(alert.student.hostel) !== String(hostelId)) {
      return res.status(404).json({ success: false, message: 'SOS alert not found or access denied' });
    }

    alert.status = status || 'Resolved';
    await alert.save();

    await sendNotification({
      institution: req.institutionId,
      recipient_id: alert.student._id,
      recipient_role: 'student',
      title: 'SOS Alert Update',
      message: `Your SOS emergency request was updated to "${alert.status}" by Warden.`,
      type: 'sos',
    });

    res.status(200).json({ success: true, message: `SOS Alert marked as ${alert.status}`, alert });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update SOS alert', error: error.message });
  }
};

// @desc    Get Room Change Requests for Warden's Hostel
// @route   GET /api/warden/room-requests
// @access  Private (Warden)
export const getWardenRoomRequests = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, roomRequests: [] });

    const requests = await RoomRequest.find({ institution: req.institutionId, hostel: hostelId })
      .populate('student', 'full_name roll_number department phone')
      .populate('current_room', 'room_number room_type')
      .populate('target_room', 'room_number room_type')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: requests.length, roomRequests: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch room requests', error: error.message });
  }
};

// @desc    Approve / Reject Room Change Request
// @route   PUT /api/warden/room-requests/:id
// @access  Private (Warden)
export const handleWardenRoomRequest = async (req, res) => {
  try {
    const { status, room_id, remarks } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
    }

    const hostelId = getWardenHostelId(req);
    const roomReq = await RoomRequest.findOne({ _id: req.params.id, institution: req.institutionId, hostel: hostelId });
    if (!roomReq) {
      return res.status(404).json({ success: false, message: 'Room change request not found or access denied' });
    }

    const student = await Student.findOne({ _id: roomReq.student, institution: req.institutionId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Associated student not found' });
    }

    if (status === 'Approved') {
      if (!room_id) {
        return res.status(400).json({ success: false, message: 'Target room_id is required to approve room transfer' });
      }

      // Atomically decrement bed in target room checking available_beds > 0
      const targetRoom = await Room.findOneAndUpdate(
        { _id: room_id, institution: req.institutionId, hostel: hostelId, available_beds: { $gt: 0 } },
        { $inc: { available_beds: -1 } },
        { new: true }
      );
      if (!targetRoom) {
        const roomExists = await Room.findOne({ _id: room_id, institution: req.institutionId, hostel: hostelId });
        if (!roomExists) {
          return res.status(404).json({ success: false, message: 'Target room not found in this hostel' });
        }
        return res.status(400).json({ success: false, message: `Room ${roomExists.room_number} has no available beds` });
      }

      // Free previous room bed if student had one
      if (student.room && String(student.room) !== String(targetRoom._id)) {
        await Room.findOneAndUpdate(
          { _id: student.room, institution: req.institutionId },
          { $inc: { available_beds: 1 } }
        );
      }

      // Assign student to target room
      student.room = targetRoom._id;
      student.hostel = hostelId;
      await student.save();

      roomReq.status = 'Approved';
      roomReq.target_room = targetRoom._id;
      roomReq.admin_remarks = remarks || '';
      roomReq.action_by = req.user._id;
      roomReq.action_date = new Date();
      await roomReq.save();

      // Send notification to student
      await sendNotification({
        institution: req.institutionId,
        recipient_id: student._id,
        recipient_role: 'student',
        title: 'Room Change Approved',
        message: `Your room change request has been approved! Your new room is ${targetRoom.room_number} (${targetRoom.room_type}).`,
        type: 'room',
      });

      return res.status(200).json({
        success: true,
        message: `Room transfer approved to Room ${targetRoom.room_number}`,
        roomReq,
      });
    } else {
      // Rejected
      roomReq.status = 'Rejected';
      roomReq.admin_remarks = remarks || '';
      roomReq.action_by = req.user._id;
      roomReq.action_date = new Date();
      await roomReq.save();

      // Send notification to student
      await sendNotification({
        institution: req.institutionId,
        recipient_id: student._id,
        recipient_role: 'student',
        title: 'Room Change Rejected',
        message: `Your room change request was rejected.${remarks ? ' Reason: ' + remarks : ''}`,
        type: 'room',
      });

      return res.status(200).json({
        success: true,
        message: 'Room change request rejected',
        roomReq,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to handle room request', error: error.message });
  }
};

// @desc    Get & Save Mess Menu
// @route   GET /api/warden/mess-menu
// @access  Private (Warden)
export const getHostelMessMenu = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(200).json({ success: true, menu: [] });

    const menu = await MessMenu.find({ institution: req.institutionId, hostel: hostelId }).sort({ day_of_week: 1 });
    res.status(200).json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch mess menu', error: error.message });
  }
};

// @desc    Upsert Mess Menu Item
// @route   POST /api/warden/mess-menu
// @access  Private (Warden)
export const saveMessMenuItem = async (req, res) => {
  try {
    const hostelId = getWardenHostelId(req);
    if (!hostelId) return res.status(400).json({ success: false, message: 'Warden has no assigned hostel' });

    const { day_of_week, meal_type, menu_item } = req.body;
    if (!day_of_week || !meal_type || !menu_item) {
      return res.status(400).json({ success: false, message: 'Day, Meal type, and Menu item are required' });
    }

    const item = await MessMenu.findOneAndUpdate(
      { institution: req.institutionId, hostel: hostelId, day_of_week, meal_type },
      { institution: req.institutionId, menu_item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: 'Mess menu saved', item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save mess menu', error: error.message });
  }
};

// @desc    Issue Fine / Fee Due to Student
// @route   POST /api/warden/payments/fine
// @access  Private (Warden)
export const issueFine = async (req, res) => {
  try {
    const { student_id, amount, fine_type, description } = req.body;
    if (!student_id || !amount || !fine_type) {
      return res.status(400).json({ success: false, message: 'Student ID, Amount, and Fine Type are required' });
    }

    const hostelId = getWardenHostelId(req);
    const student = await Student.findOne({ _id: student_id, institution: req.institutionId, hostel: hostelId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found in your assigned hostel' });
    }

    const fine = await Payment.create({
      institution: req.institutionId,
      student: student_id,
      amount: parseFloat(amount),
      fine_type,
      description: description || '',
      status: 'Pending',
    });

    await sendNotification({
      institution: req.institutionId,
      recipient_id: student._id,
      recipient_role: 'student',
      title: `Fee / Fine Issued: ₹${amount}`,
      message: `A new fee due (${fine_type} - ₹${amount}) has been added to your account. Description: ${description || 'N/A'}`,
      type: 'payment',
    });

    res.status(201).json({ success: true, message: 'Fine / Fee invoice issued successfully', fine });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to issue fine', error: error.message });
  }
};
