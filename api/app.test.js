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
              canonicalUrl: 'https://hackeandoelsistema.net/ignored-by-canonical-route/',
            },
            canonicalRoute: {
              path: '/canonical-sample/',
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
      canonicalPath: '/canonical-sample/',
      entityType: 'POST',
      httpStatus: 200,
    });
  });

  it('normalizes absolute SEO canonicals when there is no canonical route alias', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async () => ({
            id: 'route-2',
            path: '/legacy-sample/',
            entityType: 'POST',
            entityId: 'post-2',
            status: 'ACTIVE',
            httpStatus: 200,
            lastmodAt: new Date('2026-01-01T00:00:00Z'),
            canonicalRoute: null,
            seoMetadata: {
              canonicalUrl: 'https://hackeandoelsistema.net/canonical-sample/',
            },
          }),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=/legacy-sample/',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data.canonicalPath).toBe('/canonical-sample/');
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

  it('returns redirect preserveQuery metadata for legacy URLs', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        redirect: {
          findFirst: async () => ({
            statusCode: 302,
            targetUrl: '/new-search/',
            preserveQuery: true,
          }),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=/old-search/',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      type: 'REDIRECT',
      statusCode: 302,
      targetUrl: '/new-search/',
      preserveQuery: true,
    });
  });

  it('returns public posts by entity id for route based rendering', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  slug: 'sample-post',
                  title: 'Sample Post',
                  excerpt: 'Sample excerpt',
                  contentHtml: '<p>Sample content</p>',
                  contentText: 'Sample content',
                  postType: 'NEWS',
                  publishedAt: new Date('2026-01-01T00:00:00Z'),
                  updatedAt: new Date('2026-01-02T00:00:00Z'),
                  viewCount: 12,
                  commentCount: 0,
                  legacyUrl: '/sample-post/',
                  author: {
                    id: '11111111-1111-4111-8111-111111111111',
                    username: 'admin',
                    displayName: 'Admin',
                  },
                  featuredMedia: null,
                  categories: [],
                  tags: [],
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/posts/id/${postId}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: postId,
      slug: 'sample-post',
      title: 'Sample Post',
      canonicalPath: '/sample-post/',
    });
  });

  it('returns public pages by entity id for hierarchical route rendering', async () => {
    const pageId = '33333333-3333-4333-8333-333333333333';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        page: {
          findFirst: async ({ where }) =>
            where.id === pageId
              ? {
                  id: pageId,
                  slug: 'equipo',
                  title: 'Equipo',
                  contentHtml: '<p>Pagina</p>',
                  contentText: 'Pagina',
                  publishedAt: new Date('2026-01-01T00:00:00Z'),
                  updatedAt: new Date('2026-01-02T00:00:00Z'),
                  legacyUrl: '/sobre-nosotros/equipo/',
                  author: null,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/pages/id/${pageId}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: pageId,
      slug: 'equipo',
      canonicalPath: '/sobre-nosotros/equipo/',
    });
  });
});
