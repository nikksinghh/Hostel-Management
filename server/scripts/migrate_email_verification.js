import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campushome';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for email verification compatibility migration...');

    const studentResult = await mongoose.connection.collection('students').updateMany(
      { is_email_verified: { $exists: false } },
      { $set: { is_email_verified: true } }
    );
    console.log(`Updated legacy students: ${studentResult.modifiedCount}`);

    const adminResult = await mongoose.connection.collection('admins').updateMany(
      { is_email_verified: { $exists: false } },
      { $set: { is_email_verified: true } }
    );
    console.log(`Updated legacy admins: ${adminResult.modifiedCount}`);

    const wardenResult = await mongoose.connection.collection('wardens').updateMany(
      { is_email_verified: { $exists: false } },
      { $set: { is_email_verified: true } }
    );
    console.log(`Updated legacy wardens: ${wardenResult.modifiedCount}`);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
