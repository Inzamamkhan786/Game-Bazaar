const path = require('path');
const fs = require('fs');
const { DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');
const { isStorageConfigured, s3Client, SUPABASE_BUCKET, SUPABASE_STORAGE_PUBLIC_URL } = require('../config/s3');

const encodeObjectKey = (key) => key.split('/').map((segment) => encodeURIComponent(segment)).join('/');

const normalizeObjectKey = (value) => String(value || '').replace(/^\/+/, '').split('?')[0];

const buildPublicImageUrl = (key) => {
  if (!key) return '';
  const baseUrl = SUPABASE_STORAGE_PUBLIC_URL.replace(/\/+$/, '');
  return `${baseUrl}/${encodeObjectKey(normalizeObjectKey(key))}`;
};

const extractStorageKey = (image) => {
  if (!image) return null;

  const value = String(image).trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    const publicBase = SUPABASE_STORAGE_PUBLIC_URL
      ? `${SUPABASE_STORAGE_PUBLIC_URL.replace(/\/+$/, '')}/`
      : '';

    if (publicBase && value.startsWith(publicBase)) {
      return normalizeObjectKey(decodeURIComponent(value.slice(publicBase.length)));
    }

    const bucketMarker = `/object/public/${SUPABASE_BUCKET}/`;
    const bucketIndex = value.indexOf(bucketMarker);
    if (bucketIndex !== -1) {
      return normalizeObjectKey(decodeURIComponent(value.slice(bucketIndex + bucketMarker.length)));
    }

    return null;
  }

  return normalizeObjectKey(value);
};

const isLegacyLocalUploadPath = (image) => {
  const value = normalizeObjectKey(image);
  return /^uploads\//i.test(value) || /^uploads\\/i.test(value);
};

const deleteLegacyLocalFile = (imagePath) => {
  const fullPath = path.join(process.cwd(), normalizeObjectKey(imagePath));
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const uploadGameImage = async (file) => {
  if (!isStorageConfigured || !s3Client) {
    throw new Error('Supabase storage is not configured');
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const key = `games/${uniqueSuffix}${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: SUPABASE_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return {
    key,
    url: buildPublicImageUrl(key),
  };
};

const deleteStorageObject = async (imageOrKey) => {
  if (isLegacyLocalUploadPath(imageOrKey)) {
    deleteLegacyLocalFile(imageOrKey);
    return;
  }

  if (!isStorageConfigured || !s3Client) {
    return;
  }

  const key = extractStorageKey(imageOrKey);
  if (!key) return;

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: SUPABASE_BUCKET,
      Key: key,
    }));
  } catch (error) {
    logger.error('Failed to delete image from Supabase storage', {
      key,
      message: error.message,
    });
  }
};

const deleteStorageObjects = async (images = []) => {
  await Promise.allSettled(images.map((image) => deleteStorageObject(image)));
};

const uploadGameImages = async (files = []) => {
  const uploaded = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadGameImage(file));
    }

    return uploaded;
  } catch (error) {
    await deleteStorageObjects(uploaded.map((item) => item.key));
    throw error;
  }
};

module.exports = {
  buildPublicImageUrl,
  deleteStorageObject,
  deleteStorageObjects,
  extractStorageKey,
  uploadGameImages,
};