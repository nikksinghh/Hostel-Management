import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const wardenSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      default: 'warden',
      immutable: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_email_verified: {
      type: Boolean,
      default: true,
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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index for uniqueness per institution
wardenSchema.index({ institution: 1, email: 1 }, { unique: true });

// Hash password before save
wardenSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
wardenSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Warden = mongoose.model('Warden', wardenSchema);
export default Warden;
