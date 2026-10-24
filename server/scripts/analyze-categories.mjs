import mongoose from 'mongoose';
import Hairstyle from '../src/models/Hairstyle.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga');
  const counts = await Hairstyle.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  counts.sort((a, b) => b.count - a.count);
  let total = 0;
  for (const c of counts) {
    total += c.count;
    console.log(String(c.count).padStart(5), '|', c._id);
    const docs = await Hairstyle.find({ category: c._id }).select('title tags').lean();
    for (const d of docs) console.log('        -', d.title, '::', (d.tags || []).join(','));
  }
  console.log('-----');
  console.log('TOTAL:', total, '| distinct categories:', counts.length);
  console.log('users:', await mongoose.connection.collection('users').countDocuments());
  console.log('favorites:', await mongoose.connection.collection('favorites').countDocuments());
  await mongoose.disconnect();
}
run();
