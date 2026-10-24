import mongoose from 'mongoose';
import fs from 'node:fs';
import { ObjectId } from 'mongodb';
import Hairstyle from '../src/models/Hairstyle.js';

const FILE = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!FILE) throw new Error('Usage: node repair-duplicates.mjs <original-backup.json> [--apply]');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const C = mongoose.connection.collection('hairstyles');

  const backup = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const cleanById = new Map(backup.map((d) => [String(d._id), d]));
  console.log('Backup records:', backup.length);

  // Snapshot current corrupt state.
  const current = await C.find({}).toArray();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(`backups/pre-repair-snapshot-${stamp}.json`, JSON.stringify(current, null, 2));
  console.log('Snapshot saved: pre-repair-snapshot-' + stamp + '.json (' + current.length + ' docs)');

  const keep = [];
  const del = [];
  const noCleanCopy = [];

  // Group raw docs by their canonical id string.
  const groups = new Map();
  for (const doc of current) {
    const key = String(doc._id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  for (const [key, docs] of groups) {
    const clean = cleanById.get(key);
    if (!clean) { noCleanCopy.push(key); continue; }
    if (docs.length === 1) { keep.push(clean._id); continue; }
    // Prefer the doc that already matches a clean category; else the one that is not hidden.
    const winner = docs.find((d) => d.category === clean.category) || docs.find((d) => d.category !== 'Uncategorized (legacy)');
    for (const d of docs) if (winner && String(d._id) !== String(winner._id)) del.push(d._id);
    keep.push(clean._id);
  }

  console.log('Groups:', groups.size, '| to delete:', del.length, '| ids with no clean copy:', noCleanCopy.length);
  if (noCleanCopy.length) console.log('  no-clean-copy ids:', noCleanCopy.slice(0, 10));

  if (APPLY) {
    if (del.length) await C.deleteMany({ _id: { $in: del } });
    // Force every surviving doc to its clean category (undoes the bad parking).
    for (const d of backup) {
      await C.updateOne({ _id: new ObjectId(String(d._id)) }, { $set: { category: d.category } });
    }
    console.log('Deleted', del.length, 'corrupt duplicates and restored categories.');
  } else {
    console.log('DRY RUN - pass --apply to execute.');
  }

  const after = await C.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).toArray();
  console.log('Resulting distribution:');
  for (const c of after.sort((a, b) => b.count - a.count)) console.log('  ', c.count, c._id);
  console.log('Total docs:', await C.countDocuments());

  await mongoose.disconnect();
}
run();
