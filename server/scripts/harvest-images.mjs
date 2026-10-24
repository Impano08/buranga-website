/**
 * harvest-images.mjs
 * ---------------------------------------------------------------------------
 * Downloads freely-licensed hairstyle photographs from Wikimedia Commons into
 * server/uploads/seed/ so the gallery always loads (no external hotlinking).
 *
 * Run:  node server/scripts/harvest-images.mjs
 * Output: server/uploads/seed/*.jpg + server/uploads/seed/credits.json
 * ---------------------------------------------------------------------------
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'uploads', 'seed');
const CREDITS_PATH = path.join(OUT_DIR, 'credits.json');
const TARGET = 150; // stop after this many good images
const API = 'https://commons.wikimedia.org/w/api.php';

const CATEGORY_QUERIES = [
  'Braided hairstyles',
  'Box braids',
  'Cornrows',
  'Dreadlocks',
  'Afro (hairstyle)',
  'Hair weaves',
  'Wigs',
  'Lace front wigs',
  'Curly hair',
  'Bun (hairstyle)',
  'Twists (hairstyle)',
  'Senegalese twists',
  'Bantu knots',
  'Fade (haircut)',
  'Long hair',
  'Short hair',
  'Natural hair movement',
  'Braids',
  'Hairstyles of women',
  'Hairstyles of children',
  'Men hairstyles',
  'Mohawk (hairstyle)',
  'Ponytail',
  'Braid hairbands',
  'Hair styling',
  'Black hair',
  'African-American hairstyles',
  'Fulani braids',
  'Goddess locs',
  'Microbraids',
  'Plaits (hairstyle)',
  'Hair buns',
  'Wedding hairstyles',
  'Braided crowns',
  'Chignon (hairstyle)',
  'French braid',
  'Hair clips',
  'Teens with braided hairstyles',
];

const SEARCH_QUERIES = [
  'box braids hairstyle',
  'knotless braids',
  'cornrows hairstyle woman',
  'goddess locs',
  'lace front wig',
  'afro hairstyle woman',
  'natural hairstyle black woman',
  'braided updo',
  'children braided hairstyle',
  'men fade haircut',
  'curly hairstyle woman',
  'bridal hairstyle',
  'short natural hair',
  'long box braids',
  'mohawk natural hair',
  'bantu knots',
  'twist out hair',
  'protective hairstyle',
  'hairstyle model salon',
  'french braid',
];

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function apiCall(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BurangaSeedBot/1.0 (hairstyle gallery demo)' },
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
  return res.json();
}

async function collectFromCategory(cat) {
  try {
    const data = await apiCall({
      action: 'query',
      generator: 'categorymembers',
      gcmtitle: `Category:${cat}`,
      gcmtype: 'file',
      gcmlimit: '40',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime|size',
      iiurlwidth: '900',
      format: 'json',
      origin: '*',
    });
    return Object.values(data?.query?.pages || {});
  } catch (err) {
    console.warn(`  category "${cat}" failed: ${err.message}`);
    return [];
  }
}

async function collectFromSearch(query) {
  try {
    const data = await apiCall({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '20',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime|size',
      iiurlwidth: '900',
      format: 'json',
      origin: '*',
    });
    return Object.values(data?.query?.pages || {});
  } catch (err) {
    console.warn(`  search "${query}" failed: ${err.message}`);
    return [];
  }
}

async function download(url, destPath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BurangaSeedBot/1.0 (hairstyle gallery demo)' },
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/.test(type)) throw new Error(`bad type ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`too small ${buf.length}`);
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seenTitles = new Set();
  const candidates = [];

  console.log('Collecting candidates from Commons categories...');
  for (const cat of CATEGORY_QUERIES) {
    if (candidates.length >= TARGET * 2) break;
    const pages = await collectFromCategory(cat);
    console.log(`  Category:${cat} -> ${pages.length}`);
    for (const p of pages) candidates.push(p);
  }

  console.log('Collecting candidates from Commons search...');
  for (const q of SEARCH_QUERIES) {
    if (candidates.length >= TARGET * 2.5) break;
    const pages = await collectFromSearch(q);
    console.log(`  search "${q}" -> ${pages.length}`);
    for (const p of pages) candidates.push(p);
  }

  console.log(`Total raw candidates: ${candidates.length}`);

  const credits = [];
  let n = 0;
  for (const page of candidates) {
    if (n >= TARGET) break;
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (seenTitles.has(page.title)) continue;
    seenTitles.add(page.title);

    const mime = info.mime || '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) continue;
    const url = info.thumburl || info.url;
    if (!url) continue;

    const ext = url.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    const extFinal = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
    n += 1;
    const fileName = `seed-${String(n).padStart(3, '0')}.${extFinal}`;
    const dest = path.join(OUT_DIR, fileName);
    try {
      const size = await download(url, dest);
      const meta = info.extmetadata || {};
      credits.push({
        file: fileName,
        commonsTitle: page.title,
        source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace('File:', 'File:'))}`,
        artist: stripHtml(meta.Artist?.value).slice(0, 120),
        license: stripHtml(meta.LicenseShortName?.value).slice(0, 60) || 'See Commons page',
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        bytes: size,
      });
      process.stdout.write(`\r  downloaded ${n}/${TARGET} (${fileName}, ${(size / 1024).toFixed(0)} KB)`);
    } catch (err) {
      n -= 1;
      console.warn(`\n  skip ${page.title}: ${err.message}`);
    }
  }

  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
  console.log(`\nDone. ${credits.length} images in ${OUT_DIR}`);
  console.log(`Credits written to ${CREDITS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
