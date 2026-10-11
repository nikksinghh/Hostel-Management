import Notice from '../models/Notice.js';
import Hostel from '../models/Hostel.js';

// @desc    Get Notices (Public or Student/Warden filtered)
// @route   GET /api/notices
// @access  Public / Protected
export const getNotices = async (req, res) => {
  try {
    const { hostel_id, institution } = req.query;
    let filter = {};

    if (institution) {
      filter.$or = [{ institution }, { institution: null }];
    }

    if (hostel_id) {
      const hostelFilter = { $or: [{ target_hostel: null }, { target_hostel: hostel_id }] };
      if (filter.$or) {
        filter = { $and: [filter, hostelFilter] };
      } else {
        filter = hostelFilter;
      }
    }

    const notices = await Notice.find(filter)
      .populate('target_hostel', 'name block_number')
      .populate('institution', 'name code')
      .sort({ is_pinned: -1, created_at: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: notices.length, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notices', error: error.message });
  }
};

// @desc    Create Notice (Admin / Warden with Tenant Scoping)
// @route   POST /api/notices
// @access  Private (Admin, Warden)
export const createNotice = async (req, res) => {
  try {
    const { title, content, category, target_hostel, is_pinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    // Tenant Scoping
    const instId = req.userRole === 'super_admin' ? (req.body.institution || null) : req.institutionId;

    // If target_hostel is provided, verify it belongs to this institution
    if (target_hostel && instId) {
      const hostel = await Hostel.findOne({ _id: target_hostel, institution: instId });
      if (!hostel) {
        return res.status(400).json({ success: false, message: 'Target hostel does not belong to your institution' });
      }
    }

    const posted_by = req.user.full_name || req.user.username || (req.userRole === 'warden' ? 'Hostel Warden' : 'Institution Admin');

    const notice = await Notice.create({
      institution: instId,
      title: title.trim(),
      content: content.trim(),
      category: category || 'General',
      target_hostel: target_hostel || null,
      posted_by,
      is_pinned: Boolean(is_pinned),
    });

    res.status(201).json({ success: true, message: 'Notice posted successfully', notice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create notice', error: error.message });
  }
};

// @desc    Get single notice by ID
// @route   GET /api/notices/:id
// @access  Public
export const getNoticeById = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('target_hostel', 'name block_number')
      .populate('institution', 'name code');
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }
    res.status(200).json({ success: true, notice });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Notice (Scoped to Tenant Institution)
// @route   DELETE /api/notices/:id
// @access  Private (Admin, Warden)
export const deleteNotice = async (req, res, next) => {
  try {
    const filter = req.userRole === 'super_admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, institution: req.institutionId };

    const notice = await Notice.findOneAndDelete(filter);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found or access denied' });
    }

    res.status(200).json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
