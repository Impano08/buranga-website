import mongoose from 'mongoose';

/**
 * Connect to MongoDB. The connection string comes from the .env file
 * (MONGO_URI). If MongoDB is not reachable the server logs a clear error.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
