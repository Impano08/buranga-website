import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/buranga');
const C = mongoose.connection.collection('hairstyles');
const U = mongoose.connection.collection('users');
const F = mongoose.connection.collection('favorites');

const counts = await C.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]).toArray();
console.log('Category distribution:');
for (const c of counts.sort((a, b) => b.n - a.n)) console.log(`  ${c.n}\t${c._id}`);
console.log('Total hairstyles:', await C.countDocuments({}));
console.log('Users:', await U.countDocuments({}));
console.log('Favorites:', await F.countDocuments({}));

console.log('\nSample imageUrls (first 8):');
const samples = await C.find({}, { projection: { title: 1, category: 1, imageUrl: 1 } }).limit(8).toArray();
for (const s of samples) console.log(`  [${s.category}] ${s.title} -> ${s.imageUrl}`);

const placeholderish = await C.countDocuments({ imageUrl: /placeholder|empty|todo|missing/i });
console.log('\nPlaceholder-like imageUrls:', placeholderish);

const httpImg = await C.countDocuments({ imageUrl: /^https?:/ });
const localImg = await C.countDocuments({ imageUrl: /^\/uploads/ });
console.log('http(s) imageUrls:', httpImg, '| local /uploads imageUrls:', localImg);

await mongoose.disconnect();
