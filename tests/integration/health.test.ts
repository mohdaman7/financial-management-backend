import { getTestAgent } from '../helpers/testApp';

describe('Health Check', () => {
  it('GET /api/v1/health should return health status', async () => {
    const response = await getTestAgent().get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: 'degraded',
      database: 'disconnected',
    });
    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(response.body.data.timestamp).toBeDefined();
  });
});

describe('404 Handler', () => {
  it('should return structured error for unknown routes', async () => {
    const response = await getTestAgent().get('/api/v1/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        details: [],
      },
    });
  });
});

describe('Swagger Docs', () => {
  it('GET /api/docs should serve swagger UI', async () => {
    const response = await getTestAgent().get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger');
  });
});
