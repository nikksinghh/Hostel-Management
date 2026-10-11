import express from 'express';
import {
  login,
  registerStudent,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  googleAuth,
  verifyMfa,
  toggleAdminMfa,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload, validateUploadedFile } from '../middleware/uploadMiddleware.js';
import { rateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

const authLimiter = rateLimit({
  maxRequests: 50,
  windowMs: 5 * 60 * 1000,
  message: 'Too many attempts, please try again after 5 minutes',
});

const verifyLimiter = rateLimit({
  maxRequests: 20,
  windowMs: 5 * 60 * 1000,
  message: 'Too many verification attempts, please try again after 5 minutes',
});

const resendLimiter = rateLimit({
  maxRequests: 10,
  windowMs: 5 * 60 * 1000,
  message: 'Too many resend requests, please wait before requesting another code',
});

// Public routes
router.post('/login', authLimiter, login);
router.post('/register', upload.single('profile_image'), validateUploadedFile, registerStudent);
router.post('/verify-email', verifyLimiter, verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/google', authLimiter, googleAuth);
router.post('/verify-mfa', verifyLimiter, verifyMfa);

// Protected routes
router.get('/me', protect, getMe);
router.post('/mfa/toggle', protect, authorize('admin', 'super_admin', 'institution_admin'), toggleAdminMfa);

export default router;
