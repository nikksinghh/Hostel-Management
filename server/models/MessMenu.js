import mongoose from 'mongoose';

const messMenuSchema = new mongoose.Schema(
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
      index: true,
    },
    day_of_week: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: [true, 'Day of week is required'],
    },
    meal_type: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      required: [true, 'Meal type is required'],
    },
    menu_item: {
      type: String,
      required: [true, 'Menu items are required'],
      trim: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

messMenuSchema.index({ hostel: 1, day_of_week: 1, meal_type: 1 }, { unique: true });

const MessMenu = mongoose.model('MessMenu', messMenuSchema);
export default MessMenu;
