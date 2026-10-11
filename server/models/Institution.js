import mongoose from 'mongoose';

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Institution slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    institution_type: {
      type: String,
      enum: ['University', 'College', 'Institute', 'School', 'Polytechnic', 'Other'],
      default: 'College',
      required: [true, 'Institution type is required'],
    },
    code: {
      type: String,
      required: [true, 'Institution code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    contact_email: {
      type: String,
      required: [true, 'Official contact email is required'],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid official email address'],
    },
    contact_phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Physical campus address is required'],
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    logo_url: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Suspended'],
      default: 'Pending',
      index: true,
    },
    subscription_plan: {
      type: String,
      enum: ['Free Trial', 'Standard', 'Premium', 'Enterprise'],
      default: 'Standard',
    },
    admin_details: {
      full_name: {
        type: String,
        required: [true, 'Designated administrator name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Designated administrator email is required'],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
      designation: {
        type: String,
        default: 'Chief Warden / Campus Admin',
        trim: true,
      },
    },
    rejection_reason: {
      type: String,
      default: '',
      trim: true,
    },
    suspension_reason: {
      type: String,
      default: '',
      trim: true,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Slug generator helper
institutionSchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

const Institution = mongoose.model('Institution', institutionSchema);
export default Institution;
