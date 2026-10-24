/**
 * harvest-more.mjs - Downloads additional photos, continuing the numbering
 * from the existing seed-*.jpg files in uploads/seed/.
 * Run: node server/scripts/harvest-more.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'uploads', 'seed');
const CREDITS_PATH = path.join(OUT_DIR, 'credits.json');
const API = 'https://commons.wikimedia.org/w/api.php';

const SEARCH_QUERIES = [
  'braided hairstyle woman photo',
  'hair braiding salon',
  'box braids hair',
  'cornrows african woman',
  'dreadlocks portrait',
  'locs hairstyle',
  'wig hairstyle woman',
  'afro hair portrait',
  'natural hair portrait woman',
  'curly hair portrait',
  'hair salon styling',
  'hairstyle competition',
  'african hair braiding',
  'hair braid detail',
  'mohawk hairstyle',
  'ponytail hairstyle',
  'bun hairstyle woman',
  'hair cut salon woman',
  'short haircut woman',
  'long hairstyle woman portrait',
  'bridal hair',
  'flower girl hair braid',
  'boys haircut',
  'men hairstyle portrait',
  'toddler hairstyle braids',
  'twist hairstyle hair',
  'beaded braids hair',
  'hair weaving style',
  'pageant hairstyle',
  'prom hairstyle',
];

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function apiCall(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaSeedBot/1.0 (hairstyle gallery demo)' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function download(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaSeedBot/1.0 (hairstyle gallery demo)' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/.test(type)) throw new Error(`bad type ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`too small`);
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  const credits = JSON.parse(fs.readFileSync(CREDITS_PATH, 'utf8'));
  const seen = new Set(credits.map((c) => c.commonsTitle));
  let n = credits.length;

  const candidates = [];
  for (const q of SEARCH_QUERIES) {
    try {
      const data = await apiCall({
        action: 'query',
        generator: 'search',
        gsrsearch: q,
        gsrnamespace: '6',
        gsrlimit: '15',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata|mime|size',
        iiurlwidth: '900',
        format: 'json',
      });
      const pages = Object.values(data?.query?.pages || {});
      console.log(`  "${q}" -> ${pages.length}`);
      candidates.push(...pages);
    } catch (err) {
      console.warn(`  "${q}" failed: ${err.message}`);
    }
  }

  let added = 0;
  const TARGET_ADD = 40;
  for (const page of candidates) {
    if (added >= TARGET_ADD) break;
    if (seen.has(page.title)) continue;
    seen.add(page.title);
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) continue;
    const url = info.thumburl || info.url;
    if (!url) continue;

    const ext = url.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    const extFinal = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
    n += 1;
    const fileName = `seed-${String(n).padStart(3, '0')}.${extFinal}`;
    try {
      const size = await download(url, path.join(OUT_DIR, fileName));
      const meta = info.extmetadata || {};
      credits.push({
        file: fileName,
        commonsTitle: page.title,
        source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        artist: stripHtml(meta.Artist?.value).slice(0, 120),
        license: stripHtml(meta.LicenseShortName?.value).slice(0, 60) || 'See Commons page',
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        bytes: size,
      });
      added += 1;
      process.stdout.write(`\r  added ${added} (${fileName})`);
    } catch (err) {
      n -= 1;
      console.warn(`\n  skip ${page.title}: ${err.message}`);
    }
  }

  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
  console.log(`\nDone. Total photos: ${credits.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
