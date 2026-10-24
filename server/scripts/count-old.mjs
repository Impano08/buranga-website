import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const c = await Hairstyle.countDocuments({ imageUrl: /\/uploads\/seed\/seed-[0-9]{3}\.jpg$/i });
  console.log(c);
  await mongoose.disconnect();
}
run();
