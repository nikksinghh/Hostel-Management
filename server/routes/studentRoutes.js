import express from 'express';
import {
  getStudentProfile,
  updateStudentProfile,
  getMyAttendance,
  markSelfAttendance,
  applyLeave,
  getMyLeaves,
  lodgeComplaint,
  getMyComplaints,
  getMyMessMenu,
  getMyPayments,
  payFeeOnline,
  triggerSos,
  requestRoomChange,
  getMyRoomRequests,
} from '../controllers/studentController.js';
import { protect, authorize, authorizeInstitution } from '../middleware/authMiddleware.js';
import { upload, validateUploadedFile } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply protect, student authorization, and tenant isolation
router.use(protect);
router.use(authorize('student'));
router.use(authorizeInstitution);

// Profile
router.route('/profile')
  .get(getStudentProfile)
  .put(upload.single('profile_image'), validateUploadedFile, updateStudentProfile);

// Attendance
router.get('/attendance', getMyAttendance);
router.post('/attendance/check-in', markSelfAttendance);

// Leaves
router.route('/leaves')
  .get(getMyLeaves)
  .post(upload.single('leave_doc'), validateUploadedFile, applyLeave);

// Complaints
router.route('/complaints')
  .get(getMyComplaints)
  .post(upload.single('complaint_image'), validateUploadedFile, lodgeComplaint);

// Mess Menu
router.get('/mess-menu', getMyMessMenu);

// Payments & Dues
router.get('/payments', getMyPayments);
router.post('/payments/:id/pay', payFeeOnline);

// Emergency SOS
router.post('/sos', triggerSos);

// Room Request
router.post('/room-request', requestRoomChange);
router.get('/room-requests', getMyRoomRequests);

export default router;
