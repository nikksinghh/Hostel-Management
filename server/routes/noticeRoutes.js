import express from 'express';
import { getNotices, getNoticeById, createNotice, deleteNotice } from '../controllers/noticeController.js';
import { protect, authorize, authorizeInstitution } from '../middleware/authMiddleware.js';

const router = express.Router();

// View notices
router.get('/', getNotices);
router.get('/:id', getNoticeById);

// Protected: Admin & Warden can post/delete notices with tenant isolation
router.post(
  '/',
  protect,
  authorize('admin', 'super_admin', 'institution_admin', 'warden'),
  authorizeInstitution,
  createNotice
);

router.delete(
  '/:id',
  protect,
  authorize('admin', 'super_admin', 'institution_admin', 'warden'),
  authorizeInstitution,
  deleteNotice
);

export default router;
