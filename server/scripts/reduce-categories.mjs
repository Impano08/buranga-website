import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ObjectId } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

// The five approved categories.
const NEW = ['Braids', 'Locs', "Men's Hairstyles", "Children's Hairstyles", 'Trending Hairstyles'];
// Where records that cannot be confidently reclassified are parked (hidden from UI).
const HOLDING = 'Uncategorized (legacy)';

// Whole-category remaps. Covers both the original names and the new names,
// so the script is safe to re-run (idempotent).
const REMAP = {
  'Braids & Box Braids': 'Braids',
  'Knotless Braids': 'Braids',
  Cornrows: 'Braids',
  'Natural African Hairstyles': 'Braids',
  'Curly Hairstyles': 'Braids',
  'Wedding & Bridal': 'Braids',
  'Locs & Dreadlocks': 'Locs',
  'Afro Hairstyles': 'Locs',
  'Short Hairstyles': "Men's Hairstyles",
  "Men's Hairstyles": "Men's Hairstyles",
  "Children's Hairstyles": "Children's Hairstyles",
  'Trending & Protective': 'Trending Hairstyles',
  'Trending Hairstyles': 'Trending Hairstyles',
  Braids: 'Braids',
  Locs: 'Locs',
};

// The two mixed categories are classified per-record by title keywords.
const MIXED = new Set(['Wigs & Lace Fronts', 'Long Hairstyles']);

const MEN_RX = /\b(fade|taper|buzz|crop|crew|undercut|line[- ]?up|slicked|frosted|waves|pixie|wedge|bob|asymmetrical|side[- ]?parted|side sweep)\b/;
const LOCS_RX = /\b(locs?|dreadlocks?|sisterlocks|faux locs?|butterfly locs?|freeform|afro|twa)\b/;
const KIDS_RX = /\b(kids?|toddler|children|boys?|girls?|pigtails?|beaded)\b/;
const BRAIDS_RX = /\b(braids?|cornrows?|feed[- ]?ins?|fulani|goddess|bantu|updo|chignon|bun|crown|ponytail|twists?|twisted|puff)\b/;
const TREND_RX = /\btrend/;

function classifyMixed(doc) {
  const text = [doc.title, ...(doc.tags || [])].join(' ').toLowerCase();
  if (MEN_RX.test(text)) return "Men's Hairstyles";
  if (KIDS_RX.test(text)) return "Children's Hairstyles";
  if (TREND_RX.test(text)) return 'Trending Hairstyles';
  if (LOCS_RX.test(text)) return 'Locs';
  if (BRAIDS_RX.test(text)) return 'Braids';
  return HOLDING; // unclear - park, never delete
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const C = mongoose.connection.collection('hairstyles');
  const all = await C.find({}).toArray();

  // Backup before any write.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, '..', 'backups', `hairstyles-before-category-reduce-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(all, null, 2));
  console.log(`Backup written: ${backupPath} (${all.length} records)`);
  console.log(`Current distribution:`, Object.fromEntries(
    Object.entries(all.reduce((a, d) => ((a[d.category] = (a[d.category] || 0) + 1), a), {})).sort((x, y) => y[1] - x[1])
  ));

  const plan = [];
  for (const d of all) {
    const from = d.category;
    let to;
    if (MIXED.has(from)) to = classifyMixed(d);
    else if (REMAP[from]) to = REMAP[from];
    else if (NEW.includes(from) || from === HOLDING) to = from; // already correct
    else to = HOLDING; // unknown category -> park, don't delete
    if (to !== from) plan.push({ id: d._id, from, to, title: d.title });
  }

  console.log(`\nPlanned changes: ${plan.length}`);
  const byTo = {};
  for (const p of plan) byTo[p.to] = (byTo[p.to] || 0) + 1;
  console.log('Target buckets:', byTo);
  for (const p of plan) console.log(`  [${p.from}] -> ${p.to} :: ${p.title}`);

  if (APPLY) {
    for (const p of plan) await C.updateOne({ _id: p.id }, { $set: { category: p.to } });
    console.log(`\nApplied ${plan.length} updates.`);
  } else {
    console.log('\nDRY RUN - re-run with --apply to write.');
  }

  const after = await C.find({}).toArray();
  const finalDist = after.reduce((a, d) => ((a[d.category] = (a[d.category] || 0) + 1), a), {});
  console.log('\nFinal distribution:');
  for (const [k, v] of Object.entries(finalDist).sort((x, y) => y[1] - x[1])) console.log('  ', v, k);
  console.log('Total:', after.length, '| distinct categories:', Object.keys(finalDist).length);

  await mongoose.disconnect();
}
run();
