const { S3Client } = require('@aws-sdk/client-s3');

const SUPABASE_S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT;
const SUPABASE_S3_REGION = process.env.SUPABASE_S3_REGION || 'us-east-1';
const SUPABASE_S3_ACCESS_KEY_ID = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const SUPABASE_S3_SECRET_ACCESS_KEY = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_NAME;
const SUPABASE_PROJECT_URL = process.env.SUPABASE_STORAGE_PUBLIC_URL
  ? process.env.SUPABASE_STORAGE_PUBLIC_URL.split('/storage/v1/object/public/')[0]
  : process.env.SUPABASE_URL;
const SUPABASE_STORAGE_PUBLIC_URL = process.env.SUPABASE_STORAGE_PUBLIC_URL || (
  SUPABASE_PROJECT_URL && SUPABASE_BUCKET
    ? `${SUPABASE_PROJECT_URL.replace(/\/+$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}`
    : ''
);

const isStorageConfigured = Boolean(
  SUPABASE_S3_ENDPOINT
  && SUPABASE_S3_ACCESS_KEY_ID
  && SUPABASE_S3_SECRET_ACCESS_KEY
  && SUPABASE_BUCKET
  && SUPABASE_STORAGE_PUBLIC_URL
);

const s3Client = isStorageConfigured ? new S3Client({
  region: SUPABASE_S3_REGION,
  endpoint: SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: SUPABASE_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
}) : null;

module.exports = {
  isStorageConfigured,
  s3Client,
  SUPABASE_BUCKET,
  SUPABASE_STORAGE_PUBLIC_URL,
};