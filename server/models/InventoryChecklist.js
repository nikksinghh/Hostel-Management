import mongoose from 'mongoose';

const inventoryChecklistSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
    },
    fan_status: {
      type: String,
      enum: ['Working', 'Damaged', 'Not Available'],
      default: 'Working',
    },
    light_status: {
      type: String,
      enum: ['Working', 'Damaged', 'Not Available'],
      default: 'Working',
    },
    bed_status: {
      type: String,
      enum: ['Good', 'Damaged', 'Repaired'],
      default: 'Good',
    },
    mattress_status: {
      type: String,
      enum: ['Good', 'Damaged', 'Not Issued'],
      default: 'Good',
    },
    table_status: {
      type: String,
      enum: ['Good', 'Damaged', 'Not Available'],
      default: 'Good',
    },
    chair_status: {
      type: String,
      enum: ['Good', 'Damaged', 'Not Available'],
      default: 'Good',
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
    verified_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const InventoryChecklist = mongoose.model('InventoryChecklist', inventoryChecklistSchema);
export default InventoryChecklist;
