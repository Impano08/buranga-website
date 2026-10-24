import { Router } from 'express';
import mongoose from 'mongoose';
import Favorite from '../models/Favorite.js';
import Hairstyle from '../models/Hairstyle.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/favorites - the signed-in user's saved hairstyles
router.get('/', requireAuth, async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'hairstyle', populate: { path: 'author', select: 'name' } });

  const items = favorites
    .filter((f) => f.hairstyle)
    .map((f) => f.hairstyle.toCardJSON(f.hairstyle.author?.name, true));

  res.json({ items, total: items.length });
});

// POST /api/favorites/:hairstyleId - save a hairstyle
router.post('/:hairstyleId', requireAuth, async (req, res) => {
  const { hairstyleId } = req.params;
  if (!mongoose.isValidObjectId(hairstyleId)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const doc = await Hairstyle.findById(hairstyleId);
  if (!doc) return res.status(404).json({ message: 'Hairstyle not found.' });

  const existing = await Favorite.findOne({ user: req.user._id, hairstyle: doc._id });
  if (existing) return res.json({ message: 'Already saved.', saved: true });

  await Favorite.create({ user: req.user._id, hairstyle: doc._id });
  doc.savesCount += 1;
  await doc.save();
  res.status(201).json({ message: 'Saved to your collection.', saved: true, savesCount: doc.savesCount });
});

// DELETE /api/favorites/:hairstyleId - remove from saved
router.delete('/:hairstyleId', requireAuth, async (req, res) => {
  const { hairstyleId } = req.params;
  if (!mongoose.isValidObjectId(hairstyleId)) return res.status(400).json({ message: 'Invalid hairstyle id.' });

  const removed = await Favorite.findOneAndDelete({ user: req.user._id, hairstyle: hairstyleId });
  if (removed) {
    await Hairstyle.updateOne({ _id: hairstyleId, savesCount: { $gt: 0 } }, { $inc: { savesCount: -1 } });
  }
  res.json({ message: 'Removed from your saved styles.', saved: false });
});

// GET /api/favorites/status/:hairstyleId - is this style saved by me?
router.get('/status/:hairstyleId', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.hairstyleId)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const found = await Favorite.exists({ user: req.user._id, hairstyle: req.params.hairstyleId });
  res.json({ saved: Boolean(found) });
});

export default router;
