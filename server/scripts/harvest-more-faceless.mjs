import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'uploads', 'seed');
const API = 'https://commons.wikimedia.org/w/api.php';

const QUERIES = [
  'hair wig mannequin',
  'braid wig back',
  'hairstyle head form',
  'mannequin hair back view',
  'synthetic wig back',
  'hairpiece back view',
];

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function apiCall(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaStrictBot/1.0' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BurangaStrictBot/1.0' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/.test(type)) throw new Error(`bad type ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 6000) throw new Error(`too small`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const existing = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('seed-new-'));
  let n = existing.length;
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
    } catch (e) { /* ignore */ }
  }
  for (const page of candidates) {
    if (n >= 220) break;
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
      await download(url, path.join(OUT_DIR, file));
      process.stdout.write(`\r${n}`);
    } catch (e) { n--; }
  }
  console.log(`\ndone ${n}`);
}

main().catch(e=>{console.error(e);process.exit(1);});
