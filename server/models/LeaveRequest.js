import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    from_date: {
      type: String, // YYYY-MM-DD
      required: [true, 'From date is required'],
    },
    to_date: {
      type: String, // YYYY-MM-DD
      required: [true, 'To date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    document_url: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    warden_remarks: {
      type: String,
      default: '',
      trim: true,
    },
    action_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warden',
      default: null,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

leaveRequestSchema.index({ institution: 1, created_at: -1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
