import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Only JPG, JPEG, PNG and WebP images are allowed.'));
  }
  cb(null, true);
}

// The file is first read into memory (max 8 MB), then saved to disk locally
// or uploaded to Cloudinary - see storeUpload() below.
const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

/**
 * Saves an uploaded file (multer memory buffer) and returns a URL path.
 * - With Cloudinary configured: returns the secure Cloudinary URL.
 * - Otherwise: writes to server/uploads/<yyyy-mm>/ and returns a local path.
 */
export function storeUpload(file) {
  if (cloudinary.isConfigured()) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'buranga', transformation: [{ width: 1400, height: 1800, crop: 'limit' }, { quality: 'auto' }] },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      stream.end(file.buffer);
    });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const monthDir = path.join(UPLOADS_DIR, new Date().toISOString().slice(0, 7));
  fs.mkdirSync(monthDir, { recursive: true });
  const fileName = `img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(monthDir, fileName), file.buffer);
  // Path stored in DB; served statically by Express at /uploads/...
  return Promise.resolve(`/uploads/${new Date().toISOString().slice(0, 7)}/${fileName}`);
}

export { cloudinary };
export default upload;
