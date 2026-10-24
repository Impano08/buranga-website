import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const docs = await Hairstyle.find({}).sort({ createdAt: -1 }).limit(3).select('title imageUrl createdAt');
  console.log(docs);
  await mongoose.disconnect();
}
run();
