import winston from 'winston';
import { config } from '@config/index';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: 'financial-management-api' },
  transports: [
    new winston.transports.Console({
      format:
        config.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp(), devFormat),
    }),
  ],
});

export default logger;
