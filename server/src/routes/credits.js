import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Pexels photo attributions (written by apply-pexels.mjs).
router.get('/api/credits', (_req, res) => {
  const p = path.resolve(__dirname, '..', '..', 'uploads', 'pexels', 'attribution.json');
  if (!fs.existsSync(p)) return res.json({ source: 'Pexels', photos: [] });
  res.json({ source: 'Pexels', photos: JSON.parse(fs.readFileSync(p, 'utf8')) });
});

export default router;
