const { v2: cloudinary } = require('cloudinary');

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

let isCloudinaryConfigured = false;
if (CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
  isCloudinaryConfigured = true;
} else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  isCloudinaryConfigured = true;
} else {
  console.warn('Cloudinary is not configured. Optional test uploads will not use Cloudinary.');
}

module.exports = { cloudinary, isCloudinaryConfigured };
