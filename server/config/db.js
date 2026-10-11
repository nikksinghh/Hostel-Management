import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campushome', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.log('[Note]: Please ensure MongoDB service is running locally or provide a valid MongoDB Atlas URI in server/.env');
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
};

export default connectDB;
