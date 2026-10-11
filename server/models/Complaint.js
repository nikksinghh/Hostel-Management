import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'Carpentry', 'Cleanliness', 'Mess', 'Internet/WiFi', 'Noise', 'Security', 'Other'],
      required: [true, 'Category is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    image_url: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Reopened'],
      default: 'Pending',
      index: true,
    },
    warden_remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

complaintSchema.index({ institution: 1, hostel: 1, status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
