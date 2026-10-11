import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    user_type: {
      type: String,
      enum: ['admin', 'warden', 'student', 'guest', 'system'],
      default: 'system',
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    ip_address: {
      type: String,
      default: '',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const SystemLog = mongoose.model('SystemLog', systemLogSchema);
export default SystemLog;
