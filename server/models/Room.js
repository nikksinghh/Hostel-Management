import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
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
      required: [true, 'Hostel reference is required'],
    },
    room_number: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    room_type: {
      type: String,
      enum: ['Single', 'Double', 'Triple', 'Four Bed', 'Dormitory'],
      default: 'Double',
    },
    total_beds: {
      type: Number,
      required: [true, 'Total beds is required'],
      min: 1,
    },
    available_beds: {
      type: Number,
      required: [true, 'Available beds is required'],
      min: 0,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index to ensure unique room_number per hostel and institution
roomSchema.index({ institution: 1, hostel: 1, room_number: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);
export default Room;
