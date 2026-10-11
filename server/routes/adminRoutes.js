import express from 'express';
import {
  getAdminStats,
  getHostels,
  createHostel,
  updateHostel,
  deleteHostel,
  getWardens,
  createWarden,
  updateWarden,
  deleteWarden,
  getStudents,
  toggleApproveStudent,
  assignRoomToStudent,
  deleteStudent,
  getSystemLogs,
  getRoomRequests,
  handleRoomRequest,
  getRoomsForHostel,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/adminController.js';
import { protect, authorize, authorizeInstitution } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect, admin authorization, and tenant isolation to all routes
router.use(protect);
router.use(authorize('admin', 'super_admin', 'institution_admin'));
router.use(authorizeInstitution);

// Stats & Dashboard
router.get('/stats', getAdminStats);

// Hostel Management
router.route('/hostels').get(getHostels).post(createHostel);
router.route('/hostels/:id').put(updateHostel).delete(deleteHostel);

// Warden Management
router.route('/wardens').get(getWardens).post(createWarden);
router.route('/wardens/:id').put(updateWarden).delete(deleteWarden);

// Student Management
router.get('/students', getStudents);
router.put('/students/:id/approve', toggleApproveStudent);
router.put('/students/:id/assign-room', assignRoomToStudent);
router.delete('/students/:id', deleteStudent);

// Room Requests
router.get('/room-requests', getRoomRequests);
router.put('/room-requests/:id', handleRoomRequest);

// Room Management (within hostels)
router.get('/rooms', getRoomsForHostel);
router.post('/rooms', createRoom);
router.route('/rooms/:id').put(updateRoom).delete(deleteRoom);

// System Audit Logs
router.get('/logs', getSystemLogs);

export default router;
