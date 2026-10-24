import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { optionalAuth } from './middleware/auth.js';
import { UPLOADS_DIR } from './middleware/upload.js';
import authRoutes from './routes/auth.js';
import hairstyleRoutes from './routes/hairstyles.js';
import favoriteRoutes from './routes/favorites.js';
import userRoutes from './routes/users.js';
import creditsRoutes from './routes/credits.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The hairstyle photos that ship with the client live here. Serving the folder
// directly keeps one copy of every file while still giving the API stable URLs.
const CLIENT_ASSETS_DIR = path.resolve(__dirname, '..', '..', 'client', 'src', 'assets');

const app = express();
const PORT = Number(process.env.PORT) || 5050;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5175';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(optionalAuth);

// Seed photos + user uploads are stored locally and served statically.
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
app.use('/local-assets', express.static(CLIENT_ASSETS_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'BURANGA API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/hairstyles', hairstyleRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use(creditsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// Central error handler - turns thrown errors (multer, mongo...) into JSON.
app.use((err, _req, res, _next) => {
  console.error(err);
  const message =
    err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large. Maximum size is 8 MB.'
      : err.message || 'Something went wrong on the server.';
  res.status(err.status || 500).json({ message });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`BURANGA API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.error('Check that MongoDB is running and MONGO_URI in server/.env is correct.');
    process.exit(1);
  }
}

start();
