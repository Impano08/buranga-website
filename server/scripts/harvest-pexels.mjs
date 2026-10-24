/**
 * harvest-pexels.mjs
 * ---------------------------------------------------------------------------
 * Downloads hairstyle photographs from the official Pexels API
 * (https://www.pexels.com/api/documentation/) into server/uploads/pexels/.
 *
 * Requires PEXELS_API_KEY in server/.env  (never commit the real key).
 *
 * Run:  node server/scripts/harvest-pexels.mjs
 * Out : server/uploads/pexels/pex-NNN.jpg + pexels-credits.json
 *
 * Pexels licence notes (https://www.pexels.com/license/):
 *  - Free to use, no attribution required, but attribution is appreciated.
 *  - The credits file records photographer name + Pexels link per image and
 *    is displayed on the website's footer.
 * ---------------------------------------------------------------------------
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'uploads', 'pexels');
const CREDITS_PATH = path.join(OUT_DIR, 'pexels-credits.json');
const API = 'https://api.pexels.com/v1/search';
const PER_PAGE = 80; // Pexels max
const TARGET = 180;

const QUERIES = [
  'knotless braids back view',
  'boho knotless braids back of head',
  'French curl braids back view',
  'Fulani braids close up',
  'stitch cornrows back view',
  'modern braided bob hairstyle',
  'sleek ponytail back view',
  'wig on faceless mannequin',
  'modern lace front wig back view',
  'box braids back of head',
  'braided updo back view',
  'cornrows back of head',
  'goddess braids back view',
  'hair bun back view',
  'curly hair back of head',
  'dreadlocks back view',
  'natural hair back view',
  'hair from behind hairstyle',
];

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error(
    'PEXELS_API_KEY is not set.\n' +
    '1. Create a free account at https://www.pexels.com/api/\n' +
    '2. Copy your API key from the dashboard.\n' +
    '3. Add to server/.env:  PEXELS_API_KEY=your_key_here\n' +
    '4. Re-run:  node server/scripts/harvest-pexels.mjs'
  );
  process.exit(1);
}

async function search(query) {
  const url = new URL(API);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(PER_PAGE));
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${query}"`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('too small');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const credits = fs.existsSync(CREDITS_PATH) ? JSON.parse(fs.readFileSync(CREDITS_PATH, 'utf8')) : [];
  const seen = new Set(credits.map((c) => String(c.pexelsId)));
  let n = credits.length;

  for (const q of QUERIES) {
    if (n >= TARGET) break;
    let data;
    try {
      data = await search(q);
    } catch (e) {
      console.warn(`  skip "${q}": ${e.message}`);
      continue;
    }
    const photos = data.photos || [];
    console.log(`  "${q}" -> ${photos.length}`);
    for (const ph of photos) {
      if (n >= TARGET) break;
      if (seen.has(String(ph.id))) continue;
      seen.add(String(ph.id));
      n++;
      const file = `pex-${String(n).padStart(3, '0')}.jpg`;
      try {
        // Use the 'large2x' size (~940px wide) - good quality, modest weight.
        const src = ph.src?.large2x || ph.src?.large || ph.src?.original;
        const size = await download(src, path.join(OUT_DIR, file));
        credits.push({
          file,
          pexelsId: ph.id,
          query: q,
          width: ph.width,
          height: ph.height,
          photographer: ph.photographer,
          pexelsUrl: ph.url, // link back to the photo on Pexels
          avgColor: ph.avg_color,
          bytes: size,
        });
        process.stdout.write(`\r${n}/${TARGET} ${file}`);
      } catch (e) {
        n--;
        console.warn(`\n  dl fail ${ph.id}: ${e.message}`);
      }
    }
  }

  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
  console.log(`\nDone. ${credits.length} images in ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
