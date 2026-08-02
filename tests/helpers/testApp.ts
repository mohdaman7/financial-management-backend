import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';

export function getTestApp(): Application {
  return createApp();
}

export function getTestAgent(app: Application = getTestApp()) {
  return request(app);
}
