import { Router } from 'express';
import mongoose from 'mongoose';
import Hairstyle, { CATEGORIES, HIDDEN_CATEGORIES, HAIR_LENGTHS, OCCASIONS, HAIR_TYPES } from '../models/Hairstyle.js';

// Records in a hidden category are kept in the DB but never shown in the UI.
const HIDDEN = { $nin: HIDDEN_CATEGORIES };
import Favorite from '../models/Favorite.js';
import { requireAuth } from '../middleware/auth.js';
import upload, { storeUpload } from '../middleware/upload.js';

const router = Router();

const SORTS = {
  latest: { createdAt: -1 },
  trending: { savesCount: -1, createdAt: -1 },
  popular: { savesCount: -1 },
};

/** Adds author name + isFavorite flag to an array of hairstyle docs. */
async function decorate(docs, user) {
  const favorites = user
    ? await Favorite.find({ user: user._id, hairstyle: { $in: docs.map((d) => d._id) } }).select('hairstyle')
    : [];
  const favSet = new Set(favorites.map((f) => f.hairstyle.toString()));
  return docs.map((d) => d.toCardJSON(d.author?.name, favSet.has(d._id.toString())));
}

function buildFilters(query) {
  const filter = {};
  // An unknown filter value must return nothing, not everything.
  if (query.category) filter.category = CATEGORIES.includes(query.category) ? query.category : '__invalid__';
  else filter.category = HIDDEN; // no category filter -> hide legacy/uncategorized records
  if (query.hairLength) filter.hairLength = HAIR_LENGTHS.includes(query.hairLength) ? query.hairLength : '__invalid__';
  if (query.occasion) filter.occasion = OCCASIONS.includes(query.occasion) ? query.occasion : '__invalid__';
  if (query.hairType) filter.hairType = HAIR_TYPES.includes(query.hairType) ? query.hairType : '__invalid__';

  // Every word of the search query must appear in title, description,
  // category, tags, keywords or the style attributes.
  const words = String(query.q || '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
  if (words.length) {
    filter.category = filter.category || HIDDEN; // never surface hidden records via search
    filter.$and = words.map((word) => {
      const rx = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return {
        $or: [
          { title: rx },
          { description: rx },
          { category: rx },
          { tags: rx },
          { keywords: rx },
          { hairLength: rx },
          { occasion: rx },
          { hairType: rx },
        ],
      };
    });
  }
  return filter;
}

// GET /api/hairstyles/meta - filter options + category counts (used by the UI)
router.get('/meta', async (_req, res) => {
  const counts = await Hairstyle.aggregate([{ $match: { category: HIDDEN } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const byCategory = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({
    categories: CATEGORIES.map((c) => ({ name: c, count: byCategory[c] || 0 })),
    hairLengths: HAIR_LENGTHS,
    occasions: OCCASIONS,
    hairTypes: HAIR_TYPES,
    total: counts.reduce((sum, c) => sum + c.count, 0),
  });
});

// GET /api/hairstyles?q=&category=&hairLength=&occasion=&hairType=&sort=&page=&limit=
router.get('/', async (req, res) => {
  const filter = buildFilters(req.query);
  const sort = SORTS[req.query.sort] || SORTS.latest;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));

  const [items, total] = await Promise.all([
    Hairstyle.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('author', 'name'),
    Hairstyle.countDocuments(filter),
  ]);

  res.json({
    items: await decorate(items, req.user),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/hairstyles/trending - most saved styles
router.get('/trending', async (req, res) => {
  const items = await Hairstyle.find({ category: HIDDEN }).sort({ savesCount: -1, createdAt: -1 }).limit(12).populate('author', 'name');
  res.json({ items: await decorate(items, req.user) });
});

// GET /api/hairstyles/latest - newest uploads
router.get('/latest', async (req, res) => {
  const items = await Hairstyle.find({ category: HIDDEN }).sort({ createdAt: -1 }).limit(12).populate('author', 'name');
  res.json({ items: await decorate(items, req.user) });
});

// GET /api/hairstyles/:id - one hairstyle with full details
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const doc = await Hairstyle.findById(req.params.id).populate('author', 'name bio avatarUrl');
  if (!doc) return res.status(404).json({ message: 'Hairstyle not found.' });
  const [item] = await decorate([doc], req.user);
  res.json({ item });
});

// GET /api/hairstyles/:id/related - related by category, keywords and tags
router.get('/:id/related', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const doc = await Hairstyle.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Hairstyle not found.' });

  const or = [{ category: doc.category }];
  const terms = [...doc.keywords, ...doc.tags].filter(Boolean).slice(0, 10);
  if (terms.length) {
    or.push({ keywords: { $in: terms } });
    or.push({ tags: { $in: terms } });
  }
  // Related styles, nearest first, never showing the same style twice.
  let items = await Hairstyle.find({ _id: { $ne: doc._id }, category: HIDDEN, $or: or })
    .sort({ savesCount: -1, createdAt: -1 })
    .limit(12)
    .populate('author', 'name');

  // Fallback: if a brand-new category has no siblings yet, show popular styles.
  if (items.length < 6) {
    const extra = await Hairstyle.find({ _id: { $ne: doc._id, $nin: items.map((i) => i._id) }, category: HIDDEN })
      .sort({ savesCount: -1 })
      .limit(12 - items.length)
      .populate('author', 'name');
    items = items.concat(extra);
  }
  res.json({ items: await decorate(items, req.user) });
});

// POST /api/hairstyles - publish a new hairstyle (signed-in users only)
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const { title, description, category, tags, hairLength, occasion, hairType } = req.body || {};

  if (!title || String(title).trim().length < 3) return res.status(400).json({ message: 'Please enter a title (at least 3 characters).' });
  if (!description || String(description).trim().length < 10) return res.status(400).json({ message: 'Please enter a description (at least 10 characters).' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Please choose a valid category.' });
  if (!req.file) return res.status(400).json({ message: 'Please choose an image file to upload (JPG, PNG or WebP, max 8 MB).' });

  const imageUrl = await storeUpload(req.file);
  const tagList = String(tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  const doc = await Hairstyle.create({
    title: String(title).trim(),
    description: String(description).trim(),
    category,
    imageUrl,
    tags: tagList,
    keywords: [String(title).toLowerCase(), category.toLowerCase(), ...tagList],
    hairLength: HAIR_LENGTHS.includes(hairLength) ? hairLength : 'Any',
    occasion: OCCASIONS.includes(occasion) ? occasion : 'Everyday',
    hairType: HAIR_TYPES.includes(hairType) ? hairType : 'Any',
    aspectRatio: 0.75,
    author: req.user._id,
  });

  res.status(201).json({ message: 'Hairstyle published!', item: doc.toCardJSON(req.user.name) });
});

// PUT /api/hairstyles/:id - edit your own post
router.put('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const doc = await Hairstyle.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Hairstyle not found.' });
  if (doc.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only edit your own posts.' });
  }

  const { title, description, category, tags, hairLength, occasion, hairType } = req.body || {};
  if (title !== undefined) {
    if (String(title).trim().length < 3) return res.status(400).json({ message: 'Title must be at least 3 characters.' });
    doc.title = String(title).trim();
  }
  if (description !== undefined) {
    if (String(description).trim().length < 10) return res.status(400).json({ message: 'Description must be at least 10 characters.' });
    doc.description = String(description).trim();
  }
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Invalid category.' });
    doc.category = category;
  }
  if (tags !== undefined) {
    doc.tags = String(tags)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (hairLength !== undefined && HAIR_LENGTHS.includes(hairLength)) doc.hairLength = hairLength;
  if (occasion !== undefined && OCCASIONS.includes(occasion)) doc.occasion = occasion;
  if (hairType !== undefined && HAIR_TYPES.includes(hairType)) doc.hairType = hairType;
  doc.keywords = [doc.title.toLowerCase(), doc.category.toLowerCase(), ...doc.tags];
  await doc.save();

  res.json({ message: 'Post updated.', item: doc.toCardJSON(req.user.name) });
});

// DELETE /api/hairstyles/:id - delete your own post
router.delete('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid hairstyle id.' });
  const doc = await Hairstyle.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Hairstyle not found.' });
  if (doc.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only delete your own posts.' });
  }
  await Favorite.deleteMany({ hairstyle: doc._id });
  await doc.deleteOne();
  res.json({ message: 'Post deleted.' });
});

export default router;
