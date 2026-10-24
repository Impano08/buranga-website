import mongoose from 'mongoose';
import fs from 'node:fs';
import Hairstyle from '../src/models/Hairstyle.js';

const FILE = process.argv[2];
if (!FILE) throw new Error('Usage: node restore-backup.mjs <path-to-backup.json>');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const docs = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log('Restoring', docs.length, 'records from', FILE);

  // Safety snapshot of the CURRENT (corrupt) state before overwriting.
  const current = await Hairstyle.find({}).lean();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(`backups/pre-restore-snapshot-${stamp}.json`, JSON.stringify(current, null, 2));
  console.log('Snapshot of current state saved as pre-restore-snapshot-' + stamp + '.json');

  for (const d of docs) {
    const { _id, __v, ...rest } = d;
    await Hairstyle.collection.replaceOne({ _id: d._id }, { ...rest, _id: d._id }, { upsert: true });
  }
  const after = await Hairstyle.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  console.log('Category distribution after restore:');
  for (const c of after.sort((a, b) => b.count - a.count)) console.log('  ', c.count, c._id);
  console.log('Total:', await Hairstyle.countDocuments());
  await mongoose.disconnect();
}
run();
