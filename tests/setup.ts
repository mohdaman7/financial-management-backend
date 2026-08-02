/// <reference types="jest" />
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters';
process.env.LOG_LEVEL = 'error';

jest.setTimeout(30000);
