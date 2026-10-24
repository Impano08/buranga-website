import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Hairstyle from '../models/Hairstyle.js';
import Favorite from '../models/Favorite.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/users/:id - public profile (name, bio, avatar, uploaded styles)
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id.' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const isOwner = req.user && req.user._id.toString() === user._id.toString();
  const posts = await Hairstyle.find({ author: user._id }).sort({ createdAt: -1 }).populate('author', 'name');

  let savedItems = [];
  if (isOwner) {
    // Saved styles are private - only the owner can see them.
    const favorites = await Favorite.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'hairstyle', populate: { path: 'author', select: 'name' } });
    savedItems = favorites
      .filter((f) => f.hairstyle)
      .map((f) => f.hairstyle.toCardJSON(f.hairstyle.author?.name, true));
  }

  res.json({
    profile: {
      id: user._id.toString(),
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      postCount: posts.length,
    },
    isOwner,
    posts: posts.map((p) => p.toCardJSON(user.name, false)),
    savedItems,
  });
});

// PUT /api/users/me - quick profile edit (same as /api/auth/profile, kept for clarity)
router.put('/me', requireAuth, async (req, res) => {
  const { name, bio, avatarUrl } = req.body || {};
  if (name !== undefined) req.user.name = String(name).trim().slice(0, 60);
  if (bio !== undefined) req.user.bio = String(bio).slice(0, 300);
  if (avatarUrl !== undefined) req.user.avatarUrl = String(avatarUrl).slice(0, 500);
  await req.user.save();
  res.json({ message: 'Profile updated.', user: req.user.toPublicJSON() });
});

export default router;
