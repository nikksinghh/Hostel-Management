import mongoose from 'mongoose';

const hostelSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Boys', 'Girls', 'Co-ed'],
      required: [true, 'Hostel type is required (Boys/Girls/Co-ed)'],
    },
    block_number: {
      type: String,
      required: [true, 'Block number is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    contact_number: {
      type: String,
      default: '',
      trim: true,
    },
    gps_latitude: {
      type: Number,
      default: 0.0,
    },
    gps_longitude: {
      type: Number,
      default: 0.0,
    },
    gps_radius: {
      type: Number,
      default: 200, // radius in meters
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index to ensure uniqueness of hostel name per institution
hostelSchema.index({ institution: 1, name: 1 }, { unique: true });

const Hostel = mongoose.model('Hostel', hostelSchema);
export default Hostel;
