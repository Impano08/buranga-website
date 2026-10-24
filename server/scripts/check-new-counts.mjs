import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const total = await Hairstyle.countDocuments({});
  const newCount = await Hairstyle.countDocuments({ imageUrl: /seed-new/ });
  console.log({ total, newCount });
  await mongoose.disconnect();
}
run();
