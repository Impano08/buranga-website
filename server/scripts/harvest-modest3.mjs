/**
 * harvest-modest3.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'uploads', 'seed');
const API = 'https://commons.wikimedia.org/w/api.php';
const NEW_CREDITS = path.join(OUT_DIR, 'credits-new3.json');

const QUERIES = [
  'black woman hairstyle back',
  'braided hairstyle back view woman',
  'cornrows back woman',
  'box braids back woman',
  'twists back woman',
  'locs back woman',
  'natural hair back woman',
  'bun back woman',
  'ponytail back woman',
];

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function apiCall(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaUpdateBot/1.0' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaUpdateBot/1.0' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/.test(type)) throw new Error(`bad type ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 6000) throw new Error(`too small`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const existing = new Set(fs.readdirSync(OUT_DIR).filter(f => f.startsWith('seed-new-')));
  const seen = new Set();
  const candidates = [];
  for (const q of QUERIES) {
    try {
      const data = await apiCall({
        action: 'query', generator: 'search', gsrsearch: q, gsrnamespace: '6', gsrlimit: '25',
        prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '900', format: 'json',
      });
      const pages = Object.values(data?.query?.pages || {});
      for (const p of pages) {
        if (!seen.has(p.title)) { seen.add(p.title); candidates.push(p); }
      }
      console.log(`  "${q}" -> ${pages.length}`);
    } catch (e) { console.warn('skip', e.message); }
  }
  let n = existing.size;
  const credits = [];
  const TARGET = 80;
  for (const page of candidates) {
    if (n >= existing.size + TARGET) break;
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    if (!['image/jpeg','image/png','image/webp'].includes(mime)) continue;
    const url = info.thumburl || info.url;
    if (!url) continue;
    const ext = url.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
    const extFinal = ext==='png'?'png':ext==='webp'?'webp':'jpg';
    n++;
    const file = `seed-new-${String(n).padStart(3,'0')}.${extFinal}`;
    try {
      const size = await download(url, path.join(OUT_DIR, file));
      const meta = info.extmetadata || {};
      credits.push({file, commonsTitle:page.title, source:`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`, artist:stripHtml(meta.Artist?.value).slice(0,120), license:stripHtml(meta.LicenseShortName?.value).slice(0,60)||'See Commons page', width:info.thumbwidth||info.width, height:info.thumbheight||info.height, bytes:size});
      process.stdout.write(`\r${n} ${file}`);
    } catch (e) { n--; }
  }
  fs.writeFileSync(NEW_CREDITS, JSON.stringify(credits,null,2));
  console.log(`\nDone. Total seed-new: ${n}`);
}

main().catch(e=>{console.error(e);process.exit(1);});
