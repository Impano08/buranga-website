import mongoose from 'mongoose';
import fs from 'node:fs';
import { ObjectId } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const FILE = process.argv[2];

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const C = mongoose.connection.collection('hairstyles');

  const current = await C.find({}).toArray();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(`backups/pre-cleanup-snapshot-${stamp}.json`, JSON.stringify(current, null, 2));
  console.log('Snapshot: pre-cleanup-snapshot-' + stamp + '.json (' + current.length + ' docs)');

  const stringIds = current.filter((d) => typeof d._id === 'string').map((d) => d._id);
  const objectIds = current.filter((d) => d._id instanceof ObjectId);
  console.log('docs with string _id (corrupt):', stringIds.length);
  console.log('docs with ObjectId _id (real):  ', objectIds.length);

  const dist = {};
  for (const d of objectIds) dist[d.category] = (dist[d.category] || 0) + 1;
  console.log('Real-doc category distribution (pre-restore):');
  for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log('  ', v, k);

  if (APPLY) {
    if (stringIds.length) {
      const r = await C.deleteMany({ _id: { $in: stringIds } });
      console.log('Deleted', r.deletedCount, 'corrupt (string-_id) docs.');
    }
    if (FILE) {
      const backup = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      for (const b of backup) {
        await C.updateOne({ _id: new ObjectId(String(b._id)) }, { $set: { category: b.category } });
      }
      console.log('Restored categories for', backup.length, 'docs from backup.');
    }
  } else {
    console.log('DRY RUN - pass --apply to execute.');
  }

  const after = await C.find({}).toArray();
  const afterDist = {};
  for (const d of after) afterDist[d.category] = (afterDist[d.category] || 0) + 1;
  console.log('Distribution after:');
  for (const [k, v] of Object.entries(afterDist).sort((a, b) => b[1] - a[1])) console.log('  ', v, k);
  console.log('Total docs:', after.length);

  await mongoose.disconnect();
}
run();
