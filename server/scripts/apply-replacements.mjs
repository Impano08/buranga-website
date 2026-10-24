import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, '..', 'uploads', 'seed');

const reps = JSON.parse(fs.readFileSync(path.join(seedDir, 'replacements.json'), 'utf8'));
const map = new Map(reps.map(r => [r.from, r.to]));
const changed = [];
for (const [from, to] of map) {
  if (from !== to) changed.push({ from, to });
}

console.log('replacements with change:', changed.length);
fs.writeFileSync(path.join(seedDir, 'replacements-changed.json'), JSON.stringify(changed, null, 2));

// Apply to DB
import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  let updated = 0;
  for (const c of changed) {
    const res = await Hairstyle.updateMany({ imageUrl: `/uploads/seed/${c.from}` }, { $set: { imageUrl: `/uploads/seed/${c.to}` } });
    updated += res.modifiedCount || 0;
  }
  console.log('db updated:', updated);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
