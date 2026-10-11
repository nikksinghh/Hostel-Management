import express from 'express';
import {
  getWardenStats,
  getHostelStudents,
  getWardenRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getTodayAttendance,
  markAttendanceManual,
  getWardenLeaves,
  updateLeaveStatus,
  getWardenComplaints,
  updateComplaintStatus,
  getWardenSosAlerts,
  updateSosAlertStatus,
  getHostelMessMenu,
  saveMessMenuItem,
  issueFine,
  getWardenRoomRequests,
  handleWardenRoomRequest,
} from '../controllers/wardenController.js';
import { protect, authorize, authorizeInstitution } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect, warden authorization, and tenant isolation
router.use(protect);
router.use(authorize('warden'));
router.use(authorizeInstitution);

// Stats
router.get('/stats', getWardenStats);

// Students
router.get('/students', getHostelStudents);

// Rooms
router.route('/rooms').get(getWardenRooms).post(createRoom);
router.route('/rooms/:id').put(updateRoom).delete(deleteRoom);

// Attendance
router.get('/attendance/today', getTodayAttendance);
router.post('/attendance/mark', markAttendanceManual);

// Leaves
router.get('/leaves', getWardenLeaves);
router.put('/leaves/:id', updateLeaveStatus);

// Complaints
router.get('/complaints', getWardenComplaints);
router.put('/complaints/:id', updateComplaintStatus);

// SOS Alerts
router.get('/sos', getWardenSosAlerts);
router.put('/sos/:id', updateSosAlertStatus);

// Mess Menu
router.route('/mess-menu').get(getHostelMessMenu).post(saveMessMenuItem);

// Fine / Invoices
router.post('/payments/fine', issueFine);

// Room Requests
router.get('/room-requests', getWardenRoomRequests);
router.put('/room-requests/:id', handleWardenRoomRequest);

export default router;
