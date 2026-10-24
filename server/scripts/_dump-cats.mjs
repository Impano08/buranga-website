import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/buranga');
const docs = await mongoose.connection.collection('hairstyles').find({}, { projection: { title: 1, category: 1 } }).toArray();
for (const d of docs) console.log(`${d.category}\t${d.title}`);
await mongoose.disconnect();
