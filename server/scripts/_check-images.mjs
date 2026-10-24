import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await mongoose.connect('mongodb://127.0.0.1:27017/buranga');
const docs = await mongoose.connection.collection('hairstyles').find({}, { projection: { imageUrl: 1, title: 1 } }).toArray();
let missing = 0;
for (const d of docs) {
  if (!d.imageUrl.startsWith('/uploads/')) { console.log('NON-LOCAL:', d.title, d.imageUrl); missing++; continue; }
  const p = path.join(__dirname, '..', d.imageUrl);
  if (!fs.existsSync(p)) { console.log('MISSING FILE:', d.title, d.imageUrl); missing++; }
}
console.log(`Checked ${docs.length} records, missing/broken: ${missing}`);
await mongoose.disconnect();
