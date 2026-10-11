import express from 'express';
import { getNotices, createNotice, deleteNotice } from '../controllers/noticeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public: View notices
router.get('/', getNotices);

// Protected: Admin & Warden can post/delete notices
router.post('/', protect, authorize('admin', 'warden'), createNotice);
router.delete('/:id', protect, authorize('admin', 'warden'), deleteNotice);

export default router;
