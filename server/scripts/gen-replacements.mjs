import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(__dirname, '..', 'uploads', 'seed');

const newFiles = [];
for (let i = 1; i <= 94; i++) {
  const n = String(i).padStart(3, '0');
  for (const ext of ['jpg', 'png', 'webp']) {
    const f = `seed-new-${n}.${ext}`;
    if (fs.existsSync(path.join(seedDir, f))) {
      newFiles.push(f);
      break;
    }
  }
}

const creditsOld = JSON.parse(fs.readFileSync(path.join(seedDir, 'credits.json'), 'utf8'));
let idx = 0;
const reps = [];
for (const post of creditsOld) {
  reps.push({ from: post.file, to: idx < newFiles.length ? newFiles[idx++] : post.file });
}
fs.writeFileSync(path.join(seedDir, 'replacements.json'), JSON.stringify(reps, null, 2));
console.log('swapped', idx, 'out of', creditsOld.length);
