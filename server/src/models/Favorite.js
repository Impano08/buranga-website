import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hairstyle: { type: mongoose.Schema.Types.ObjectId, ref: 'Hairstyle', required: true, index: true },
  },
  { timestamps: true }
);

// One user can save a hairstyle only once.
favoriteSchema.index({ user: 1, hairstyle: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
