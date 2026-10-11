import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true,
    },
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    recipient_role: {
      type: String,
      enum: ['student', 'warden', 'institution_admin', 'super_admin'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['leave', 'complaint', 'room', 'payment', 'attendance', 'sos', 'general'],
      default: 'general',
    },
    link: {
      type: String,
      default: '',
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

notificationSchema.index({ recipient_id: 1, is_read: 1, created_at: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
