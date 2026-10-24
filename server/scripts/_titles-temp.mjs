import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/buranga');
const H = mongoose.connection.collection('hairstyles');
const docs = await H.find({}).project({title:1,category:1,tags:1,imageUrl:1}).toArray();
for (const d of docs) console.log(`${d.category}\t| ${d.title}`);
await mongoose.disconnect();
