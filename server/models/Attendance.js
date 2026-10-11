import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
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
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      default: null,
    },
    attendance_date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Leave'],
      required: [true, 'Attendance status is required'],
      default: 'Present',
    },
    gps_location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      distance_meters: { type: Number, default: null },
      is_within_radius: { type: Boolean, default: null },
    },
    marked_by: {
      type: String,
      enum: ['self_gps', 'warden_manual', 'system'],
      default: 'self_gps',
    },
    marked_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One attendance entry per student per day within institution
attendanceSchema.index({ institution: 1, student: 1, attendance_date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
