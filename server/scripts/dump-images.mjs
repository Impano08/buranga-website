import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const docs = await Hairstyle.find({}).select('imageUrl title').limit(10).lean();
  console.log(docs);
  await mongoose.disconnect();
}
run();
