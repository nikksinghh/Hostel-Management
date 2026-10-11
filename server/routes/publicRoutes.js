import express from 'express';
import Hostel from '../models/Hostel.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';

const router = express.Router();

// @desc    Get public hostels for registration & landing page
// @route   GET /api/public/hostels
// @access  Public
router.get('/hostels', async (req, res) => {
  try {
    const hostels = await Hostel.find()
      .select('name type block_number address contact_number institution')
      .populate('institution', 'name code status');
    // Only return hostels belonging to Approved institutions for public view
    const approvedHostels = hostels.filter((h) => !h.institution || h.institution.status === 'Approved');
    res.status(200).json({ success: true, hostels: approvedHostels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch hostels', error: error.message });
  }
});

// @desc    Get landing page overview stats
// @route   GET /api/public/overview
// @access  Public
router.get('/overview', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalHostels = await Hostel.countDocuments();
    const totalRooms = await Room.countDocuments();
    const roomCapacity = await Room.aggregate([
      { $group: { _id: null, total: { $sum: '$total_beds' } } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalHostels,
        totalRooms,
        totalBeds: roomCapacity.length > 0 ? roomCapacity[0].total : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch overview stats', error: error.message });
  }
});

import { registerInstitution } from '../controllers/institutionController.js';
import { rateLimit } from '../middleware/rateLimitMiddleware.js';

const registerLimiter = rateLimit({
  maxRequests: 30,
  windowMs: 15 * 60 * 1000,
  message: 'Too many institution registration requests, please try again later',
});

// @desc    Register a new Institution
// @route   POST /api/public/institutions/register
// @access  Public
router.post('/institutions/register', registerLimiter, registerInstitution);

export default router;
