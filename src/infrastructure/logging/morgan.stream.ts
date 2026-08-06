import { Writable } from 'stream';
import { logger } from './logger';

export const morganStream: Writable = new Writable({
  write(chunk: any, _encoding, callback) {
    logger.http(chunk.toString().trim());
    callback();
  },
});
