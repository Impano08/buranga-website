/**
 * One-time, non-destructive migration to the four live categories:
 *
 *   Men's Haircut
 *   Women's Haircut
 *   Children's Haircut
 *   Trending Haircut
 *
 * It:
 *   1. Backs up every hairstyle record to server/backups first.
 *   2. Re-maps the old categories (Braids, Locs, Men's Hairstyles,
 *      Children's Hairstyles, Trending Hairstyles, legacy bucket) onto the four
 *      categories. No hairstyle, user or favourite is deleted.
 *   3. Adds one record for every hairstyle photo in client/src/assets, using
 *      the filename prefix to choose the category (men*, women*, children*,
 *      trending*). It only inserts a photo that is not already in the DB, so
 *      the script is safe to run more than once.
 *
 * Run from the server folder:  node scripts/migrate-four-categories.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Hairstyle from '../src/models/Hairstyle.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'client', 'src', 'assets');
const BACKUPS_DIR = path.resolve(__dirname, '..', 'backups');

const MEN = "Men's Haircut";
const WOMEN = "Women's Haircut";
const CHILDREN = "Children's Haircut";
const TRENDING = 'Trending Haircut';

const OLD_MEN = "Men's Hairstyles";
const OLD_CHILDREN = "Children's Hairstyles";
const OLD_TRENDING = 'Trending Hairstyles';

const KIDS_RX = /\b(kids?|toddler|toddlers|children|child|boys?|girls?)\b/i;
const MEN_RX = /\b(fade|taper|tapers|buzz|buzzed|crew|undercut|line[- ]?(up|design)|slicked|high[- ]?top|frosted tips|textured crop|nape-length wedge)\b/i;
const MEN_EXPLICIT_RX = /\b(for men|men's)\b/i;
const WOMEN_RX = /\b(wigs?|bob|pixie|waves?|curls?|updo|bridal|bun|braids?|locs?|afro|pigtails?|ponytails?|twists?|bantu|coils?|cornrows?)\b/i;
const TREND_RX = /\btrend/i;

function classifyExisting(doc) {
  const text = `${doc.title || ''} ${(doc.tags || []).join(' ')}`;
  if (TREND_RX.test(text)) return TRENDING;
  if (doc.category === OLD_TRENDING) return TRENDING;
  if (KIDS_RX.test(text)) return CHILDREN;
  if (doc.category === OLD_CHILDREN) return CHILDREN;
  if (MEN_RX.test(text) || MEN_EXPLICIT_RX.test(text)) return MEN;
  if (WOMEN_RX.test(text)) return WOMEN;
  if (doc.category === OLD_MEN) return MEN;
  // Braids, locs, wigs and long styles are predominantly women's collections.
  return WOMEN;
}

function categoryForFile(name) {
  const lower = name.toLowerCase();
  if (lower.startsWith('trending')) return TRENDING;
  if (lower.startsWith('children')) return CHILDREN;
  if (lower.startsWith('men')) return MEN;
  if (lower.startsWith('women')) return WOMEN;
  return null;
}

function pngDimensions(buffer) {
  const isPng = buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG';
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const COPY = {
  // Children
  'children1.png': ['Playful Kids Cut', 'A cheerful, easy-to-wear children’s cut from the BURANGA collection, styled to stay neat through playtime.'],
  'children2.png': ['Little One’s Neat Style', 'A tidy, comfortable children’s hairstyle that keeps hair off the face and looks great for school or family days.'],
  'children3.png': ['Junior Braided Look', 'A charming braided look for kids, created to be gentle on the scalp and easy to maintain during the week.'],
  'children4.png': ['Sweet Kids Hairstyle', 'A sweet, age-appropriate hairstyle for children who want a polished look without any fuss.'],
  'children5.png': ['Kids Party Style', 'A fun, celebration-ready children’s style that photographs beautifully for birthdays and special events.'],
  'children6.png': ['School-Day Kids Cut', 'A practical children’s haircut designed for busy school mornings, with a clean shape that stays tidy.'],
  'children7.png': ['Adorable Children’s Style', 'An adorable, low-maintenance children’s hairstyle that suits everyday family life and special outings.'],
  'children8.png': ['Kids Weekend Look', 'A relaxed weekend hairstyle for kids that is comfortable, playful and easy to refresh at home.'],
  'children9.png': ['Young Star Hairstyle', 'A confident children’s style with plenty of personality, perfect for little ones who love to stand out.'],
  // Men
  'men.png': ['Signature Men’s Cut', 'A versatile signature cut from the BURANGA men’s collection, clean at the edges with a natural finish.'],
  'men1.png': ['Sharp Men’s Style', 'A sharp, modern men’s hairstyle with a defined shape that works for both everyday wear and evenings out.'],
  'men2.png': ['Modern Men’s Cut', 'A contemporary men’s haircut with balanced proportions and an easy, confident finish.'],
  'men3.png': ['Clean Men’s Look', 'A clean, low-maintenance men’s look that keeps the silhouette neat and the styling simple.'],
  'men4.png': ['Bold Men’s Style', 'A bold men’s hairstyle with strong lines and a polished finish for anyone who wants to make an impression.'],
  'men5.png': ['Fresh Men’s Haircut', 'A fresh, wearable men’s haircut with a crisp outline and enough texture for natural movement.'],
  'men6.png': ['Classic Men’s Cut', 'A classic men’s cut that never goes out of style, finished with a tidy neckline and balanced shape.'],
  // Women
  'women.png': ['Elegant Women’s Style', 'An elegant women’s hairstyle from the BURANGA collection, finished to look polished from every angle.'],
  'women1.png': ['Radiant Women’s Haircut', 'A radiant women’s cut with a flattering shape and a soft, healthy-looking finish.'],
  'women2.png': ['Chic Women’s Look', 'A chic, contemporary women’s look that balances shape, texture and easy everyday styling.'],
  'women3.png': ['Beautiful Women’s Style', 'A beautiful women’s hairstyle with a graceful silhouette, ideal for both day and evening plans.'],
  'women4.png': ['Glamorous Women’s Haircut', 'A glamorous women’s haircut with a refined finish that photographs beautifully for special occasions.'],
  'women5.png': ['Trendy Women’s Cut', 'A trendy women’s cut with a modern edge, designed to feel fresh while remaining easy to maintain.'],
  // Trending
  'trending1.png': ['Trending Style of the Season', 'A standout style from the BURANGA trending collection, capturing the look clients are asking for right now.'],
};

const TAG_BY_CATEGORY = {
  [MEN]: ['men', 'haircut', 'local photo'],
  [WOMEN]: ['women', 'haircut', 'local photo'],
  [CHILDREN]: ['children', 'kids', 'haircut', 'local photo'],
  [TRENDING]: ['trending', 'haircut', 'local photo'],
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const collection = mongoose.connection.collection('hairstyles');

  const existing = await collection.find({}).toArray();
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUPS_DIR, `hairstyles-before-four-categories-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2));
  console.log(`Backup written: ${backupPath} (${existing.length} records)`);

  // 1. Re-map the existing collection onto the four categories.
  let moved = 0;
  const before = {};
  for (const doc of existing) {
    before[doc.category] = (before[doc.category] || 0) + 1;
    const next = classifyExisting(doc);
    if (next !== doc.category) {
      await collection.updateOne({ _id: doc._id }, { $set: { category: next } });
      moved += 1;
    }
  }
  console.log('Old distribution:', before);
  console.log(`Re-mapped records: ${moved}`);

  // 2. Make sure the author exists without creating a duplicate user.
  let author = await User.findOne({ email: 'studio@buranga.app' });
  if (!author) author = await User.findOne({});
  if (!author) {
    throw new Error('No user exists to own the seeded local photos. Register an account first.');
  }

  // 3. Add a record for every local photo, keyed by its stable served URL.
  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const unmatched = files.filter((name) => !categoryForFile(name));
  const created = [];
  const updated = [];
  for (const name of files) {
    const category = categoryForFile(name);
    if (!category) continue;

    const imageUrl = `/local-assets/${name}`;
    const buffer = fs.readFileSync(path.join(ASSETS_DIR, name));
    const size = pngDimensions(buffer);
    const aspectRatio = size ? Number((size.width / size.height).toFixed(4)) : 0.75;
    const copy = COPY[name] || [name.replace(/\.[^.]+$/, ''), 'A hairstyle photo from the BURANGA collection.'];
    const [title, description] = copy;
    const tags = TAG_BY_CATEGORY[category];

    const existingDoc = await Hairstyle.findOne({ imageUrl });
    if (existingDoc) {
      existingDoc.category = category;
      existingDoc.aspectRatio = aspectRatio;
      existingDoc.tags = tags;
      existingDoc.keywords = [title.toLowerCase(), category.toLowerCase(), 'local photo', name, ...tags];
      await existingDoc.save();
      updated.push(name);
    } else {
      await Hairstyle.create({
        title,
        description,
        category,
        imageUrl,
        tags,
        keywords: [title.toLowerCase(), category.toLowerCase(), 'local photo', name, ...tags],
        hairLength: 'Any',
        occasion: 'Everyday',
        hairType: 'Any',
        aspectRatio,
        savesCount: 0,
        author: author._id,
      });
      created.push(name);
    }
  }

  const all = await collection.find({}).toArray();
  const after = all.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});

  console.log(`\nLocal photos added: ${created.length}`, created);
  if (updated.length) console.log(`Local photos refreshed: ${updated.length}`, updated);
  if (unmatched.length) console.log('Unmatched image files (not assigned):', unmatched);
  console.log('\nFinal distribution:');
  for (const [name, count] of Object.entries(after).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${name}`);
  }
  console.log('Total hairstyles:', all.length);

  const missing = files
    .filter((name) => categoryForFile(name))
    .filter((name) => !all.some((doc) => doc.imageUrl === `/local-assets/${name}`));
  if (missing.length) {
    console.error('ERROR: these local photos were not assigned:', missing);
    process.exitCode = 1;
  } else {
    console.log('Every local hairstyle photo is assigned to a category.');
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
