import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true,
    },
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email'],
    },
    roll_number: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    drcc_id: {
      type: String,
      sparse: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    profile_image: {
      type: String,
      default: '',
    },
    parent_name: {
      type: String,
      default: '',
      trim: true,
    },
    parent_phone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    emergency_contact: {
      type: String,
      default: '',
      trim: true,
    },
    is_approved: {
      type: Boolean,
      default: false,
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    email_verification_token: {
      type: String,
      select: false,
    },
    email_verification_otp: {
      type: String,
      select: false,
    },
    email_verification_expires: {
      type: Date,
      select: false,
    },
    email_verification_otp_expires: {
      type: Date,
      select: false,
    },
    verification_otp_attempts: {
      type: Number,
      default: 0,
      select: false,
    },
    resend_available_at: {
      type: Date,
      default: null,
      select: false,
    },
    reset_password_token: {
      type: String,
      select: false,
    },
    reset_password_expires: {
      type: Date,
      select: false,
    },
    google_id: {
      type: String,
      sparse: true,
      index: true,
    },
    password_changed_at: {
      type: Date,
      default: null,
      select: false,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockout_until: {
      type: Date,
      default: null,
      select: false,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    role: {
      type: String,
      default: 'student',
      immutable: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound indexes for strict multi-tenant uniqueness
studentSchema.index({ institution: 1, email: 1 }, { unique: true });
studentSchema.index({ institution: 1, roll_number: 1 }, { unique: true });

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);
export default Student;
