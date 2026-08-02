import { Writable } from 'stream';
import { logger } from './logger';

export const morganStream: Writable = new Writable({
  write(message: string, _encoding, callback) {
    logger.http(message.trim());
    callback();
  },
});
