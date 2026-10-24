import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, '..', 'uploads', 'seed');

const newFiles = [];
for (let i = 1; i <= 150; i++) {
  const n = String(i).padStart(3, '0');
  for (const ext of ['jpg', 'png', 'webp']) {
    const f = `seed-new-${n}.${ext}`;
    if (fs.existsSync(path.join(seedDir, f))) {
      newFiles.push(f);
      break;
    }
  }
  if (newFiles.length >= 166) break;
}
console.log('available new:', newFiles.length);

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const docs = await Hairstyle.find({}).sort({ createdAt: -1 }).select('_id imageUrl');
  let i = 0;
  for (const d of docs) {
    if (i < newFiles.length) {
      await Hairstyle.updateOne({ _id: d._id }, { $set: { imageUrl: `/uploads/seed/${newFiles[i++]}` } });
    } else break;
  }
  console.log('updated', i);
  await mongoose.disconnect();
}
run();
