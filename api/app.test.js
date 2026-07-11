import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

function createPrismaStub(overrides = {}) {
  return {
    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => undefined,
    category: {
      findMany: async () => [],
    },
    post: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
    },
    route: {
      findUnique: async () => null,
    },
    redirect: {
      findFirst: async () => null,
    },
    ...overrides,
  };
}

const testEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
  WEB_ORIGIN: 'http://127.0.0.1:3000',
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: '1 minute',
  corsOrigins: ['http://127.0.0.1:3000'],
  isProduction: false,
};

describe('api app', () => {
  it('returns live health status', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'hackeando-api',
      status: 'live',
    });
  });

  it('returns readiness when database responds', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      database: 'connected',
    });
  });

  it('resolves an active public route', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async () => ({
            id: 'route-1',
            path: '/sample-post/',
            entityType: 'POST',
            entityId: 'post-1',
            status: 'ACTIVE',
            httpStatus: 200,
            lastmodAt: new Date('2026-01-01T00:00:00Z'),
            seoMetadata: {
              title: 'Sample',
              robotsIndex: 'INDEX',
              robotsFollow: 'FOLLOW',
            },
          }),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=/sample-post/',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      path: '/sample-post/',
      entityType: 'POST',
      httpStatus: 200,
    });
  });

  it('normalizes redirect lookup for missing routes', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        redirect: {
          findFirst: async () => ({
            statusCode: 301,
            targetUrl: '/new-post/',
            preserveQuery: false,
          }),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=old-post/',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      type: 'REDIRECT',
      statusCode: 301,
      targetUrl: '/new-post/',
    });
  });
});
