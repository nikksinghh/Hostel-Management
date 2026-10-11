import express from 'express';
import {
  getPendingInstitutions,
  getAllInstitutions,
  getPlatformAnalytics,
  updateInstitutionStatus,
} from '../controllers/institutionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only super_admin can access these routes
router.use(protect);
router.use(authorize('super_admin'));

router.get('/analytics', getPlatformAnalytics);
router.get('/institutions', getAllInstitutions);
router.get('/institutions/pending', getPendingInstitutions);
router.put('/institutions/:id/status', updateInstitutionStatus);

export default router;

