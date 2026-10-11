import Institution from '../models/Institution.js';
import Admin from '../models/Admin.js';
import SystemLog from '../models/SystemLog.js';

// @desc    Register a new Institution (Public Signup)
// @route   POST /api/public/institutions/register
// @access  Public
export const registerInstitution = async (req, res) => {
  try {
    const {
      name,
      institution_type,
      code,
      contact_email,
      contact_phone,
      address,
      city,
      state,
      country,
      website,
      admin_full_name,
      admin_email,
      admin_phone,
      admin_password,
    } = req.body;

    // Validate required fields
    if (!name || !institution_type || !code || !contact_email || !contact_phone || !address || !admin_full_name || !admin_email || !admin_password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check duplicate institution code or email
    const existingInst = await Institution.findOne({
      $or: [{ code: code.toUpperCase().trim() }, { contact_email: contact_email.toLowerCase().trim() }]
    });
    
    if (existingInst) {
      return res.status(400).json({ success: false, message: 'Institution with this code or contact email already exists' });
    }

    // Check if admin email is already in use
    const existingAdmin = await Admin.findOne({ email: admin_email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Administrator email is already registered' });
    }

    // Create the Institution with 'Pending' status
    const institution = await Institution.create({
      name: name.trim(),
      institution_type,
      code: code.toUpperCase().trim(),
      contact_email: contact_email.toLowerCase().trim(),
      contact_phone,
      address: address.trim(),
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      country: country ? country.trim() : 'India',
      website: website ? website.trim() : '',
      status: 'Pending',
      admin_details: {
        full_name: admin_full_name.trim(),
        email: admin_email.toLowerCase().trim(),
        phone: admin_phone ? admin_phone.trim() : '',
      }
    });

    // Create the initial institution_admin
    const adminUser = await Admin.create({
      username: admin_email.toLowerCase().trim().split('@')[0] + Math.floor(Math.random() * 1000), // generated username
      email: admin_email.toLowerCase().trim(),
      password: admin_password,
      full_name: admin_full_name.trim(),
      phone: admin_phone ? admin_phone.trim() : '',
      role: 'institution_admin',
      institution: institution._id,
      is_active: true, // They are active, but login will fail or APIs will fail because institution is Pending
    });

    res.status(201).json({
      success: true,
      message: 'Institution registration submitted successfully. Please wait for Main Admin approval.',
      institutionId: institution._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// @desc    Get all pending institutions
// @route   GET /api/super-admin/institutions/pending
// @access  Private (Super Admin only)
export const getPendingInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find({ status: 'Pending' }).sort({ created_at: -1 });
    res.status(200).json({ success: true, count: institutions.length, institutions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending institutions', error: error.message });
  }
};

// @desc    Get all institutions with filtering and metrics
// @route   GET /api/super-admin/institutions
// @access  Private (Super Admin only)
export const getAllInstitutions = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { contact_email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const institutions = await Institution.find(filter).sort({ created_at: -1 }).lean();

    const Student = (await import('../models/Student.js')).default;
    const Hostel = (await import('../models/Hostel.js')).default;
    const Room = (await import('../models/Room.js')).default;

    const enriched = await Promise.all(
      institutions.map(async (inst) => {
        const studentCount = await Student.countDocuments({ institution: inst._id });
        const hostelCount = await Hostel.countDocuments({ institution: inst._id });
        const roomCount = await Room.countDocuments({ institution: inst._id });
        return {
          ...inst,
          metrics: {
            students: studentCount,
            hostels: hostelCount,
            rooms: roomCount,
          },
        };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, institutions: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch institutions', error: error.message });
  }
};

// @desc    Get Platform Analytics
// @route   GET /api/super-admin/analytics
// @access  Private (Super Admin only)
export const getPlatformAnalytics = async (req, res) => {
  try {
    const totalInstitutions = await Institution.countDocuments();
    const approvedInstitutions = await Institution.countDocuments({ status: 'Approved' });
    const pendingInstitutions = await Institution.countDocuments({ status: 'Pending' });
    const suspendedInstitutions = await Institution.countDocuments({ status: 'Suspended' });
    const rejectedInstitutions = await Institution.countDocuments({ status: 'Rejected' });

    const Student = (await import('../models/Student.js')).default;
    const Hostel = (await import('../models/Hostel.js')).default;
    const Room = (await import('../models/Room.js')).default;

    const totalStudents = await Student.countDocuments();
    const totalHostels = await Hostel.countDocuments();
    const totalRooms = await Room.countDocuments();

    res.status(200).json({
      success: true,
      analytics: {
        totalInstitutions,
        approvedInstitutions,
        pendingInstitutions,
        suspendedInstitutions,
        rejectedInstitutions,
        totalStudents,
        totalHostels,
        totalRooms,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform analytics', error: error.message });
  }
};

// @desc    Approve, Reject, Suspend, or Reactivate Institution
// @route   PUT /api/super-admin/institutions/:id/status
// @access  Private (Super Admin only)
export const updateInstitutionStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!['Approved', 'Rejected', 'Suspended', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved, Rejected, Suspended, or Pending' });
    }

    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution not found' });
    }
    
    // Prevent self-approval (good practice)
    if (String(institution._id) === String(req.institutionId)) {
       return res.status(403).json({ success: false, message: 'Cannot modify your own institution status' });
    }

    institution.status = status;
    
    if (status === 'Approved') {
      institution.approved_at = new Date();
      institution.approved_by = req.user._id;
    } else if (status === 'Rejected') {
      institution.rejection_reason = reason || '';
    } else if (status === 'Suspended') {
      institution.suspension_reason = reason || '';
    }

    await institution.save();

    await SystemLog.create({
      user_id: req.user._id,
      user_type: 'admin',
      action: `Institution ${status}`,
      description: `Super Admin updated institution ${institution.name} status to ${status}${reason ? ' Reason: ' + reason : ''}`,
      ip_address: req.ip || '',
    });

    res.status(200).json({ success: true, message: `Institution status updated to ${status} successfully`, institution });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update institution status', error: error.message });
  }
};

