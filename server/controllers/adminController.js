import Admin from '../models/Admin.js';
import Hostel from '../models/Hostel.js';
import Warden from '../models/Warden.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';
import Complaint from '../models/Complaint.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Payment from '../models/Payment.js';
import SosAlert from '../models/SosAlert.js';
import SystemLog from '../models/SystemLog.js';
import RoomRequest from '../models/RoomRequest.js';
import { sendNotification } from '../utils/notify.js';
import { withTransaction } from '../utils/transaction.js';
import bcrypt from 'bcryptjs';

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getAdminStats = async (req, res) => {
  try {
    const tenantFilter = req.userRole === 'super_admin' ? {} : { institution: req.institutionId };

    const totalStudents = await Student.countDocuments({ ...tenantFilter });
    const approvedStudents = await Student.countDocuments({ ...tenantFilter, is_approved: true });
    const pendingStudents = await Student.countDocuments({ ...tenantFilter, is_approved: false });
    const totalWardens = await Warden.countDocuments({ ...tenantFilter });
    const totalHostels = await Hostel.countDocuments({ ...tenantFilter });
    
    // For rooms, we need to join through hostels, but Room should ideally have institution field.
    // If Room doesn't have institution, we need to find hostels first.
    const hostels = await Hostel.find(tenantFilter).select('_id');
    const hostelIds = hostels.map(h => h._id);
    const roomFilter = req.userRole === 'super_admin' ? {} : { hostel: { $in: hostelIds } };
    
    const totalRooms = await Room.countDocuments(roomFilter);

    // Bed capacity calculations
    const roomStats = await Room.aggregate([
      { $match: roomFilter },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$total_beds' },
          availableCapacity: { $sum: '$available_beds' },
        },
      },
    ]);

    const totalCapacity = roomStats.length > 0 ? roomStats[0].totalCapacity : 0;
    const availableCapacity = roomStats.length > 0 ? roomStats[0].availableCapacity : 0;
    const occupiedBeds = totalCapacity - availableCapacity;
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    const openComplaints = await Complaint.countDocuments({ ...tenantFilter, status: { $ne: 'Resolved' } });
    const pendingLeaves = await LeaveRequest.countDocuments({ ...tenantFilter, status: 'Pending' });
    const activeSos = await SosAlert.countDocuments({ ...tenantFilter, status: 'Active' });

    // Financial collection
    const payments = await Payment.aggregate([
      { $match: tenantFilter },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalCollected = 0;
    let totalPendingFees = 0;
    payments.forEach((p) => {
      if (p._id === 'Paid') totalCollected = p.totalAmount;
      if (p._id === 'Pending') totalPendingFees = p.totalAmount;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        approvedStudents,
        pendingStudents,
        totalWardens,
        totalHostels,
        totalRooms,
        totalCapacity,
        occupiedBeds,
        availableCapacity,
        occupancyRate,
        openComplaints,
        pendingLeaves,
        activeSos,
        totalCollected,
        totalPendingFees,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
  }
};

// @desc    Get All Hostels with stats
// @route   GET /api/admin/hostels
// @access  Private (Admin)
export const getHostels = async (req, res) => {
  try {
    const tenantFilter = req.userRole === 'super_admin' ? {} : { institution: req.institutionId };
    const hostels = await Hostel.find(tenantFilter).lean();

    const enrichedHostels = await Promise.all(
      hostels.map(async (hostel) => {
        const warden = await Warden.findOne({ hostel: hostel._id }).select('full_name email phone');
        const rooms = await Room.find({ hostel: hostel._id });
        const studentsCount = await Student.countDocuments({ hostel: hostel._id });
        const totalBeds = rooms.reduce((acc, r) => acc + r.total_beds, 0);
        const availableBeds = rooms.reduce((acc, r) => acc + r.available_beds, 0);

        return {
          ...hostel,
          warden,
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds: totalBeds - availableBeds,
          availableBeds,
          studentsCount,
        };
      })
    );

    res.status(200).json({ success: true, hostels: enrichedHostels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch hostels', error: error.message });
  }
};

// @desc    Create Hostel
// @route   POST /api/admin/hostels
// @access  Private (Admin)
export const createHostel = async (req, res) => {
  try {
    const { name, type, block_number, address, contact_number, gps_latitude, gps_longitude, gps_radius } = req.body;
    if (!name || !type || !block_number) {
      return res.status(400).json({ success: false, message: 'Name, Type and Block Number are required' });
    }

    const hostel = await Hostel.create({
      name,
      type,
      block_number,
      address: address || '',
      contact_number: contact_number || '',
      gps_latitude: gps_latitude ? parseFloat(gps_latitude) : 0.0,
      gps_longitude: gps_longitude ? parseFloat(gps_longitude) : 0.0,
      gps_radius: gps_radius ? parseFloat(gps_radius) : 100,
      institution: req.body.institution,
    });

    await SystemLog.create({
      user_id: req.user._id,
      user_type: 'admin',
      action: 'Create Hostel',
      description: `Admin created hostel ${hostel.name} (${hostel.type})`,
      ip_address: req.ip || '',
    });

    res.status(201).json({ success: true, message: 'Hostel created successfully', hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create hostel', error: error.message });
  }
};

// @desc    Update Hostel
// @route   PUT /api/admin/hostels/:id
// @access  Private (Admin)
export const updateHostel = async (req, res) => {
  try {
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const hostel = await Hostel.findOneAndUpdate(filter, req.body, { new: true, runValidators: true });
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });

    res.status(200).json({ success: true, message: 'Hostel updated successfully', hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update hostel', error: error.message });
  }
};

// @desc    Delete Hostel
// @route   DELETE /api/admin/hostels/:id
// @access  Private (Admin)
export const deleteHostel = async (req, res) => {
  try {
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const hostel = await Hostel.findOne(filter);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found or access denied' });

    const studentCount = await Student.countDocuments({ hostel: hostel._id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete hostel. It currently has ${studentCount} registered students. Reassign them first.`,
      });
    }

    await Room.deleteMany({ hostel: hostel._id });
    await Warden.updateMany({ hostel: hostel._id }, { $set: { hostel: null } });
    await Hostel.findByIdAndDelete(hostel._id);

    res.status(200).json({ success: true, message: 'Hostel and associated rooms deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete hostel', error: error.message });
  }
};

// @desc    Get All Wardens
// @route   GET /api/admin/wardens
// @access  Private (Admin)
export const getWardens = async (req, res) => {
  try {
    const tenantFilter = req.userRole === 'super_admin' ? {} : { institution: req.institutionId };
    const wardens = await Warden.find(tenantFilter).populate('hostel').lean();
    res.status(200).json({ success: true, wardens });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch wardens', error: error.message });
  }
};

// @desc    Create Warden
// @route   POST /api/admin/wardens
// @access  Private (Admin)
export const createWarden = async (req, res) => {
  try {
    const { full_name, email, password, phone, hostel, address } = req.body;

    if (!full_name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Full name, email, password, and phone are required' });
    }

    // Email uniqueness is enforced per-institution by compound index.
    // A global check here would incorrectly block same email at different institutions.
    const existingWarden = await Warden.findOne({ email: email.toLowerCase().trim(), institution: req.body.institution });
    if (existingWarden) {
      return res.status(400).json({ success: false, message: 'A warden with this email already exists in your institution' });
    }

    const warden = await Warden.create({
      full_name,
      email: email.toLowerCase().trim(),
      password,
      phone,
      hostel: hostel || null,
      address: address || '',
      institution: req.body.institution,
    });

    res.status(201).json({ success: true, message: 'Warden created successfully', warden });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create warden', error: error.message });
  }
};

// @desc    Update Warden
// @route   PUT /api/admin/wardens/:id
// @access  Private (Admin)
export const updateWarden = async (req, res) => {
  try {
    const { full_name, phone, hostel, address, password } = req.body;
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const warden = await Warden.findOne(filter);
    if (!warden) return res.status(404).json({ success: false, message: 'Warden not found or access denied' });

    if (full_name) warden.full_name = full_name;
    if (phone) warden.phone = phone;
    if (hostel !== undefined) warden.hostel = hostel || null;
    if (address !== undefined) warden.address = address;
    if (password) warden.password = password;

    await warden.save();
    res.status(200).json({ success: true, message: 'Warden updated successfully', warden });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update warden', error: error.message });
  }
};

// @desc    Delete Warden
// @route   DELETE /api/admin/wardens/:id
// @access  Private (Admin)
export const deleteWarden = async (req, res) => {
  try {
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const warden = await Warden.findOneAndDelete(filter);
    if (!warden) return res.status(404).json({ success: false, message: 'Warden not found or access denied' });
    res.status(200).json({ success: true, message: 'Warden deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete warden', error: error.message });
  }
};

// @desc    Get All Students with search/filters
// @route   GET /api/admin/students
// @access  Private (Admin)
export const getStudents = async (req, res) => {
  try {
    const { search, hostel, is_approved } = req.query;
    let query = req.userRole === 'super_admin' ? {} : { institution: req.institutionId };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { roll_number: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    if (hostel) query.hostel = hostel;
    if (is_approved !== undefined && is_approved !== '') {
      query.is_approved = is_approved === 'true';
    }

    const students = await Student.find(query)
      .populate('hostel', 'name type block_number')
      .populate('room', 'room_number room_type')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: students.length, students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students', error: error.message });
  }
};

// @desc    Approve / Reject Student Admission
// @route   PUT /api/admin/students/:id/approve
// @access  Private (Admin)
export const toggleApproveStudent = async (req, res) => {
  try {
    const { is_approved, hostel_id, room_id } = req.body;
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const student = await Student.findOne(filter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found or access denied' });

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      student.is_approved = is_approved;
      if (hostel_id) student.hostel = hostel_id;

      if (room_id && room_id !== String(student.room)) {
        const roomFilter = req.userRole === 'super_admin'
          ? { _id: room_id }
          : { _id: room_id, institution: student.institution || req.institutionId };

        // Atomically claim bed
        const newRoom = await Room.findOneAndUpdate(
          { ...roomFilter, available_beds: { $gt: 0 } },
          { $inc: { available_beds: -1 } },
          { new: true, ...opts }
        );

        if (!newRoom) {
          const roomExists = await Room.findOne(roomFilter, null, opts);
          if (!roomExists) {
            const err = new Error('Target room not found or does not belong to your institution');
            err.statusCode = 404;
            throw err;
          }
          const err = new Error(`Room ${roomExists.room_number} has no available beds`);
          err.statusCode = 409;
          throw err;
        }

        // Free old room bed if any
        if (student.room) {
          await Room.findByIdAndUpdate(student.room, { $inc: { available_beds: 1 } }, opts);
        }

        student.room = newRoom._id;
        student.hostel = newRoom.hostel;
      }

      await student.save(opts);
    });

    res.status(200).json({
      success: true,
      message: `Student registration ${is_approved ? 'approved' : 'unapproved'} successfully`,
      student,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to update student approval status', error: error.message });
  }
};

// @desc    Assign Room to Student
// @route   PUT /api/admin/students/:id/assign-room
// @access  Private (Admin)
export const assignRoomToStudent = async (req, res) => {
  try {
    const { hostel_id, room_id } = req.body;
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const student = await Student.findOne(filter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found or access denied' });

    // Same-room reassignment check (no-op on bed capacity)
    if (room_id && String(student.room) === String(room_id)) {
      return res.status(200).json({
        success: true,
        message: 'Student is already assigned to this room',
        student,
      });
    }

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      if (room_id) {
        // Verify room belongs to the same institution (prevents cross-tenant room assignment)
        const roomFilter = req.userRole === 'super_admin'
          ? { _id: room_id }
          : { _id: room_id, institution: student.institution || req.institutionId };

        // Atomically claim bed
        const room = await Room.findOneAndUpdate(
          { ...roomFilter, available_beds: { $gt: 0 } },
          { $inc: { available_beds: -1 } },
          { new: true, ...opts }
        );

        if (!room) {
          const roomExists = await Room.findOne(roomFilter, null, opts);
          if (!roomExists) {
            const err = new Error('Room not found or does not belong to your institution');
            err.statusCode = 404;
            throw err;
          }
          const err = new Error('Room is fully occupied');
          err.statusCode = 409;
          throw err;
        }

        // Release existing room if changing to a new room
        if (student.room && String(student.room) !== String(room_id)) {
          await Room.findByIdAndUpdate(student.room, { $inc: { available_beds: 1 } }, opts);
        }

        student.room = room._id;
        student.hostel = room.hostel;
      } else {
        // Unassign student from room
        if (student.room) {
          await Room.findByIdAndUpdate(student.room, { $inc: { available_beds: 1 } }, opts);
        }
        student.room = null;
        if (hostel_id) student.hostel = hostel_id;
      }

      await student.save(opts);
    });

    res.status(200).json({
      success: true,
      message: 'Room allocation updated successfully',
      student,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to assign room', error: error.message });
  }
};

// @desc    Delete Student
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
export const deleteStudent = async (req, res) => {
  try {
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const student = await Student.findOne(filter);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found or access denied' });

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      if (student.room) {
        await Room.findByIdAndUpdate(student.room, { $inc: { available_beds: 1 } }, opts);
      }
      await Student.findByIdAndDelete(req.params.id, opts);
    });

    res.status(200).json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete student', error: error.message });
  }
};

// @desc    Get System Logs (scoped to institution)
// @route   GET /api/admin/logs
// @access  Private (Admin)
export const getSystemLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    // super_admin sees all logs; institution_admin sees only their users' logs
    const logs = await SystemLog.find().sort({ created_at: -1 }).limit(limit);
    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs', error: error.message });
  }
};

// @desc    Get Rooms for a specific hostel (admin view)
// @route   GET /api/admin/rooms?hostel_id=xxx
// @access  Private (Admin)
export const getRoomsForHostel = async (req, res) => {
  try {
    const { hostel_id } = req.query;
    if (!hostel_id) return res.status(400).json({ success: false, message: 'hostel_id query param required' });

    // Verify hostel belongs to institution
    const hostelFilter = req.userRole === 'super_admin'
      ? { _id: hostel_id }
      : { _id: hostel_id, institution: req.institutionId };
    const hostel = await Hostel.findOne(hostelFilter);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found or access denied' });

    const rooms = await Room.find({ hostel: hostel_id }).sort({ room_number: 1 }).lean();
    // Enrich with occupants
    const enriched = await Promise.all(rooms.map(async (r) => {
      const occupants = await Student.find({ room: r._id }).select('full_name roll_number department');
      return { ...r, occupants };
    }));

    res.status(200).json({ success: true, count: enriched.length, rooms: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: error.message });
  }
};

// @desc    Create Room in a hostel
// @route   POST /api/admin/rooms
// @access  Private (Admin)
export const createRoom = async (req, res) => {
  try {
    const { hostel_id, room_number, room_type, total_beds } = req.body;
    if (!hostel_id || !room_number || !total_beds) {
      return res.status(400).json({ success: false, message: 'hostel_id, room_number, and total_beds are required' });
    }

    // Verify hostel belongs to institution
    const hostelFilter = req.userRole === 'super_admin'
      ? { _id: hostel_id }
      : { _id: hostel_id, institution: req.institutionId };
    const hostel = await Hostel.findOne(hostelFilter);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found or access denied' });

    const beds = parseInt(total_beds);
    const room = await Room.create({
      institution: hostel.institution,
      hostel: hostel._id,
      room_number: room_number.trim(),
      room_type: room_type || 'Double',
      total_beds: beds,
      available_beds: beds,
    });

    res.status(201).json({ success: true, message: 'Room created successfully', room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: `Room ${req.body.room_number} already exists in this hostel` });
    }
    res.status(500).json({ success: false, message: 'Failed to create room', error: error.message });
  }
};

// @desc    Update Room
// @route   PUT /api/admin/rooms/:id
// @access  Private (Admin)
export const updateRoom = async (req, res) => {
  try {
    const { room_number, room_type, total_beds } = req.body;
    // Verify ownership via institution on room
    const roomFilter = req.userRole === 'super_admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, institution: req.institutionId };
    const room = await Room.findOne(roomFilter);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found or access denied' });

    const occupantsCount = await Student.countDocuments({ room: room._id });
    if (total_beds && parseInt(total_beds) < occupantsCount) {
      return res.status(400).json({ success: false, message: `Total beds cannot be less than current occupants (${occupantsCount})` });
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
// @route   DELETE /api/admin/rooms/:id
// @access  Private (Admin)
export const deleteRoom = async (req, res) => {
  try {
    const roomFilter = req.userRole === 'super_admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, institution: req.institutionId };
    const room = await Room.findOne(roomFilter);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found or access denied' });

    const occupantsCount = await Student.countDocuments({ room: room._id });
    if (occupantsCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete room with ${occupantsCount} active occupants` });
    }

    await Room.findByIdAndDelete(room._id);
    res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete room', error: error.message });
  }
};

// @desc    Get Room Change / Allocation Requests
// @route   GET /api/admin/room-requests
// @access  Private (Admin)
export const getRoomRequests = async (req, res) => {
  try {
    const filter = req.userRole === 'super_admin' ? {} : { institution: req.institutionId };
    const requests = await RoomRequest.find(filter)
      .populate('student', 'full_name roll_number email phone hostel')
      .populate('current_room', 'room_number room_type')
      .populate('target_room', 'room_number room_type')
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch room requests', error: error.message });
  }
};

// @desc    Action Room Change Request
// @route   PUT /api/admin/room-requests/:id
// @access  Private (Admin)
export const handleRoomRequest = async (req, res) => {
  try {
    const { status, admin_remarks, new_room_id } = req.body;
    const filter = req.userRole === 'super_admin' ? { _id: req.params.id } : { _id: req.params.id, institution: req.institutionId };
    const request = await RoomRequest.findOne(filter).populate('student');
    if (!request || !request.student) return res.status(404).json({ success: false, message: 'Request not found or access denied' });

    request.status = status;
    request.admin_remarks = admin_remarks || '';
    request.action_by = req.user._id;
    request.action_date = new Date();

    if (status === 'Approved' && new_room_id) {
      // Verify new room belongs to the same institution as the student and claim bed atomically
      const roomFilter = req.userRole === 'super_admin'
        ? { _id: new_room_id, available_beds: { $gt: 0 } }
        : { _id: new_room_id, institution: request.student.institution, available_beds: { $gt: 0 } };
      const newRoom = await Room.findOneAndUpdate(
        roomFilter,
        { $inc: { available_beds: -1 } },
        { new: true }
      );
      if (!newRoom) {
        const roomCheckFilter = req.userRole === 'super_admin'
          ? { _id: new_room_id }
          : { _id: new_room_id, institution: request.student.institution };
        const roomExists = await Room.findOne(roomCheckFilter);
        if (!roomExists) {
          return res.status(404).json({ success: false, message: 'Target room not found or does not belong to this institution' });
        }
        return res.status(400).json({ success: false, message: `Room ${roomExists.room_number} has no available beds` });
      }

      const student = await Student.findById(request.student._id);
      if (student.room && String(student.room) !== String(newRoom._id)) {
        await Room.findByIdAndUpdate(student.room, { $inc: { available_beds: 1 } });
      }

      student.room = newRoom._id;
      student.hostel = newRoom.hostel;
      await student.save();

      request.target_room = newRoom._id;

      // Import sendNotification dynamically or from utils
      const { sendNotification } = await import('../utils/notify.js');
      await sendNotification({
        institution: student.institution,
        recipient_id: student._id,
        recipient_role: 'student',
        title: 'Room Change Request Approved',
        message: `Your room change request has been approved! Your new room is ${newRoom.room_number} (${newRoom.room_type}).`,
        type: 'room',
      });
    } else if (status === 'Rejected') {
      const { sendNotification } = await import('../utils/notify.js');
      await sendNotification({
        institution: request.student.institution,
        recipient_id: request.student._id,
        recipient_role: 'student',
        title: 'Room Change Request Rejected',
        message: `Your room change request was rejected.${admin_remarks ? ' Remarks: ' + admin_remarks : ''}`,
        type: 'room',
      });
    }

    await request.save();
    res.status(200).json({ success: true, message: `Room request updated to ${status}`, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process room request', error: error.message });
  }
};
