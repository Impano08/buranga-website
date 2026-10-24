import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, '..', 'uploads', 'seed');

const newFiles = [];
for (let i = 1; i <= 250; i++) {
  const n = String(i).padStart(3, '0');
  const candidates = ['jpg', 'png', 'webp'];
  for (const ext of candidates) {
    const f = `seed-new-${n}.${ext}`;
    if (fs.existsSync(path.join(seedDir, f))) {
      newFiles.push(f);
      break;
    }
  }
  if (newFiles.length >= 166) break;
}
console.log('using', newFiles.length);

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const docs = await Hairstyle.find({}).sort({ createdAt: -1 }).select('_id');
  let updated = 0;
  for (let i = 0; i < docs.length && i < newFiles.length; i++) {
    await Hairstyle.updateOne({ _id: docs[i]._id }, { $set: { imageUrl: `/uploads/seed/${newFiles[i]}` } });
    updated++;
  }
  console.log('updated', updated);
  await mongoose.disconnect();
}
run();
