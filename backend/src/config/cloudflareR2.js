// Cloudflare R2 is S3-compatible, so we use the standard AWS S3 SDK pointed at R2's endpoint.
const { S3Client } = require('@aws-sdk/client-s3');

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;

let r2Client = null;
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn('Cloudflare R2 is not fully configured. Offer letter uploads are disabled for local development.');
}

const BUCKET_NAME = R2_BUCKET_NAME;
const PUBLIC_URL = R2_PUBLIC_URL;

module.exports = { r2Client, BUCKET_NAME, PUBLIC_URL };
