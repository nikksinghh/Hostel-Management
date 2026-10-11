import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: 0,
    },
    fine_type: {
      type: String,
      enum: ['Late Entry', 'Property Damage', 'Indiscipline', 'Mess Due', 'Hostel Fee', 'Other'],
      required: [true, 'Fine type is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
      index: true,
    },
    transaction_id: {
      type: String,
      default: '',
      trim: true,
    },
    payment_date: {
      type: Date,
      default: null,
    },
    idempotency_key: {
      type: String,
      default: null,
      sparse: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

paymentSchema.index({ institution: 1, student: 1, created_at: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

