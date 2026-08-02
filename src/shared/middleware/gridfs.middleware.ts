import mongoose from 'mongoose';
import multer from 'multer';

let bucket: mongoose.mongo.GridFSBucket | null = null;

export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  if (bucket) return bucket;
  const conn = mongoose.connection;
  if (!conn.db) {
    throw new Error('Database connection is not open');
  }
  bucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'documents',
  });
  return bucket;
}

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});
