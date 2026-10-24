import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary is optional. When the CLOUDINARY_* environment variables are
 * present, uploaded photos are stored on Cloudinary. Otherwise the app falls
 * back to local disk storage (server/uploads/), which needs no credentials.
 */
const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('Cloudinary storage: ENABLED');
} else {
  console.log('Cloudinary storage: not configured - using local disk uploads');
}

cloudinary.isConfigured = () => configured;
export default cloudinary;
