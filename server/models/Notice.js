import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null, // null for platform-wide announcements, or tenant-scoped
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Notice content is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['General', 'Emergency', 'Maintenance', 'Rules & Timings', 'Mess & Dining', 'Holiday'],
      default: 'General',
    },
    target_hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null, // null means all hostels
    },
    posted_by: {
      type: String,
      default: 'Admin',
    },
    is_pinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
