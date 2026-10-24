/**
 * apply-pexels.mjs
 * ---------------------------------------------------------------------------
 * Maps Pexels images (downloaded by harvest-pexels.mjs) onto the existing
 * MongoDB hairstyle records. Only the imageUrl field is modified - users,
 * favourites, auth data and post text are preserved.
 *
 * A metadata filter rejects photos whose query/alt text signals a portrait,
 * full body, selfie, food, event or unrelated subject. Remaining photos are
 * matched to posts by shared keywords (category/title vs search query).
 *
 * Run:  node server/scripts/apply-pexels.mjs
 * ---------------------------------------------------------------------------
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PEX_DIR = path.resolve(__dirname, '..', 'uploads', 'pexels');
const CREDITS_PATH = path.join(PEX_DIR, 'pexels-credits.json');

const REDUCE = 1400; // Pexels allows hotlinking at any size; we store locally.

// Metadata terms that suggest the photo is NOT a head-and-hair close-up.
const REJECT_RX = /\b(portrait|selfie|full body|standing|walking|street|food|watermelon|smiling at|group|crowd|wedding ceremony|beach|beachwear|bikini|lingerie|makeup|face of|closeup of face)\b/i;

function slugWords(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

async function main() {
  if (!fs.existsSync(CREDITS_PATH)) {
    console.error('No pexels-credits.json. Run harvest-pexels.mjs first.');
    process.exit(1);
  }
  const credits = JSON.parse(fs.readFileSync(CREDITS_PATH, 'utf8'));

  // ---- filter ----
  const accepted = [];
  const rejected = [];
  for (const c of credits) {
    const file = path.join(PEX_DIR, c.file);
    if (!fs.existsSync(file)) continue;
    const signal = `${c.query} ${c.alt || ''} ${c.photographer || ''}`;
    if (REJECT_RX.test(signal)) {
      rejected.push({ file: c.file, reason: 'metadata', signal });
      continue;
    }
    accepted.push(c);
  }
  console.log(`accepted ${accepted.length}, rejected ${rejected.length} (metadata filter)`);
  console.log('NOTE: metadata filtering cannot visually confirm "no face".');
  console.log('Review the images in server/uploads/pexels/ before going live.');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const posts = await Hairstyle.find({}).sort({ createdAt: -1 }).lean();
  console.log(`posts: ${posts.length}`);

  // ---- match by keywords ----
  const used = new Set();
  const assignments = [];
  for (const post of posts) {
    const postWords = new Set(slugWords(`${post.title} ${post.category} ${post.tags.join(' ')}`));
    let best = null;
    let bestScore = 0;
    for (const c of accepted) {
      if (used.has(c.file)) continue;
      const qw = slugWords(c.query);
      let score = 0;
      for (const w of qw) if (postWords.has(w)) score += 2;
      // query terms that are pure style words count double
      if (/braid|cornrow|bun|ponytail|wig|loc|curl|afro|twist/i.test(c.query)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) {
      // fallback: any unused accepted image
      best = accepted.find((c) => !used.has(c.file));
    }
    if (best) {
      used.add(best.file);
      assignments.push({ id: post._id, title: post.title, file: best.file, photographer: best.photographer, pexelsUrl: best.pexelsUrl });
    }
  }

  // ---- update DB ----
  let updated = 0;
  for (const a of assignments) {
    await Hairstyle.updateOne({ _id: a.id }, { $set: { imageUrl: `/uploads/pexels/${a.file}` } });
    updated++;
  }
  console.log(`db updated: ${updated}`);

  // ---- attribution data for the frontend ----
  const attribution = assignments.map((a) => ({
    file: a.file,
    photographer: a.photographer,
    pexelsUrl: a.pexelsUrl,
    title: a.title,
  }));
  fs.writeFileSync(path.join(PEX_DIR, 'attribution.json'), JSON.stringify(attribution, null, 2));
  console.log('attribution.json written');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
