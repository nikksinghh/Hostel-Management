import Notice from '../models/Notice.js';

// @desc    Get Notices (Public or Student/Warden filtered)
// @route   GET /api/notices
// @access  Public / Protected
export const getNotices = async (req, res) => {
  try {
    const { hostel_id } = req.query;
    let filter = {};

    if (hostel_id) {
      filter = {
        $or: [{ target_hostel: null }, { target_hostel: hostel_id }],
      };
    }

    const notices = await Notice.find(filter)
      .populate('target_hostel', 'name block_number')
      .sort({ is_pinned: -1, created_at: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: notices.length, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notices', error: error.message });
  }
};

// @desc    Create Notice (Admin / Warden)
// @route   POST /api/notices
// @access  Private (Admin, Warden)
export const createNotice = async (req, res) => {
  try {
    const { title, content, category, target_hostel, is_pinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const posted_by = req.user.full_name || req.user.username || (req.userRole === 'admin' ? 'Chief Warden / Admin' : 'Hostel Warden');

    const notice = await Notice.create({
      title,
      content,
      category: category || 'General',
      target_hostel: target_hostel || null,
      posted_by,
      is_pinned: is_pinned || false,
    });

    res.status(201).json({ success: true, message: 'Notice posted successfully', notice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create notice', error: error.message });
  }
};

// @desc    Delete Notice (Admin / Warden)
// @route   DELETE /api/notices/:id
// @access  Private (Admin, Warden)
export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

    res.status(200).json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete notice', error: error.message });
  }
};
