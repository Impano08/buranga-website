import mongoose from 'mongoose';

export const CATEGORIES = ["Men's Haircut", "Women's Haircut", "Children's Haircut", 'Trending Haircut'];
// Holding category for any legacy record that cannot be confidently
// reclassified. These stay in the DB (never deleted) but are hidden from the UI.
export const HIDDEN_CATEGORIES = ['Uncategorized (legacy)'];

export const HAIR_LENGTHS = ['Short', 'Medium', 'Long', 'Any'];
export const OCCASIONS = ['Everyday', 'Wedding', 'Party', 'Festival', 'Formal', 'Sports'];
export const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Coily', 'Mixed', 'Any'];

const hairstyleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    category: { type: String, required: true, enum: [...CATEGORIES, ...HIDDEN_CATEGORIES], index: true },
    imageUrl: { type: String, required: true },
    tags: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    hairLength: { type: String, enum: HAIR_LENGTHS, default: 'Any', index: true },
    occasion: { type: String, enum: OCCASIONS, default: 'Everyday', index: true },
    hairType: { type: String, enum: HAIR_TYPES, default: 'Any', index: true },
    // Used by the masonry layout to reserve space before the image loads.
    aspectRatio: { type: Number, default: 0.75 },
    savesCount: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

hairstyleSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text', keywords: 'text' });

hairstyleSchema.methods.toCardJSON = function toCardJSON(authorName, isFavorite = false) {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    category: this.category,
    imageUrl: this.imageUrl,
    tags: this.tags,
    keywords: this.keywords,
    hairLength: this.hairLength,
    occasion: this.occasion,
    hairType: this.hairType,
    aspectRatio: this.aspectRatio,
    savesCount: this.savesCount,
    createdAt: this.createdAt,
    author: this.author ? { id: this.author._id?.toString?.() || this.author, name: authorName || 'Community member' } : null,
    isFavorite,
  };
};

export default mongoose.model('Hairstyle', hairstyleSchema);
