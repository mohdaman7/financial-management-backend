import mongoose from 'mongoose';
import { config } from '@config/index';
import { logger } from '@infrastructure/logging/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.MONGODB_URI);
      logger.info('MongoDB connected successfully');
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed`, { error });

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function getDatabaseStatus(): 'connected' | 'disconnected' | 'connecting' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}
