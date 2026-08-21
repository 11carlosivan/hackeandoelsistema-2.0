import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { signAccessToken } from './services/auth.js';

function createPrismaStub(overrides = {}) {
  return {
    $queryRaw: async () => [{ '?column?': 1 }],
    $transaction: async (callback) => callback(createPrismaStub(overrides)),
    $disconnect: async () => undefined,
    category: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    post: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
      findUnique: async () => null,
    },
    route: {
      findUnique: async () => null,
    },
    redirect: {
      findFirst: async () => null,
    },
    user: {
      findFirst: async () => null,
      findUnique: async () => null,
    },
    postLike: {
      findUnique: async () => null,
      create: async () => ({}),
      delete: async () => ({}),
    },
    savedPost: {
      findUnique: async () => null,
      create: async () => ({}),
      delete: async () => ({}),
    },
    postShare: {
      create: async () => ({}),
    },
    comment: {
      findFirst: async () => null,
      create: async () => ({}),
    },
    product: {
      findFirst: async () => null,
    },
    tag: {
      findFirst: async () => null,
      count: async () => 0,
    },
    webStory: {
      findFirst: async () => null,
    },
    ...overrides,
  };
}

function createMemberUser(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'lector@example.com',
    displayName: 'Lector HES',
    username: 'lector',
    status: 'ACTIVE',
    roles: [
      {
        role: {
          name: 'MEMBER',
          permissions: [
            {
              permission: {
                permissionKey: 'account:read',
              },
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

const testEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
  WEB_ORIGIN: 'http://127.0.0.1:3000',
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: '1 minute',
  corsOrigins: ['http://127.0.0.1:3000'],
  isProduction: false,
  AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
};

describe('api app', () => {
  it('serves local CMS uploads through the backend without exposing paths outside the media root', async () => {
    const uploadDir = await mkdtemp(path.join(tmpdir(), 'hes-api-media-'));
    const nestedDir = path.join(uploadDir, '2026', '08');

    await mkdir(nestedDir, { recursive: true });
    await writeFile(path.join(nestedDir, 'probe.png'), Buffer.from('png-content'));

    const app = await buildApp({
      env: {
        ...testEnv,
        MEDIA_UPLOAD_DIR: uploadDir,
      },
      prisma: createPrismaStub(),
      logger: false,
    });

    try {
      const getResponse = await app.inject({
        method: 'GET',
        url: '/uploads/cms/2026/08/probe.png',
      });
      const headResponse = await app.inject({
        method: 'HEAD',
        url: '/uploads/cms/2026/08/probe.png',
      });
      const traversalResponse = await app.inject({
        method: 'GET',
        url: '/uploads/cms/../secrets.txt',
      });

      expect(getResponse.statusCode, getResponse.body).toBe(200);
      expect(getResponse.headers['content-type']).toContain('image/png');
      expect(getResponse.body).toBe('png-content');
      expect(headResponse.statusCode, headResponse.body).toBe(200);
      expect(headResponse.body).toBe('');
      expect(traversalResponse.statusCode).toBe(404);
    } finally {
      await app.close();
      await rm(uploadDir, { recursive: true, force: true });
    }
  });

  it('accepts auth preflight from configured alternate origins', async () => {
    const app = await buildApp({
      env: {
        ...testEnv,
        corsOrigins: [
          'https://hackeandoelsistema.net',
          'https://www.hackeandoelsistema.net',
          'https://test.hackeandoelsistema.net',
        ],
      },
      prisma: createPrismaStub(),
      logger: false,
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/register',
      headers: {
        origin: 'https://www.hackeandoelsistema.net',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://www.hackeandoelsistema.net');
  });

  it('does not rate-limit internal frontend-to-backend requests', async () => {
    const app = await buildApp({
      env: {
        ...testEnv,
        RATE_LIMIT_MAX: 1,
      },
      prisma: createPrismaStub(),
      logger: false,
    });

    const first = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: {
        host: 'backend:4000',
      },
    });
    const second = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: {
        host: 'backend:4000',
      },
    });

    await app.close();

    expect(first.statusCode, first.body).toBe(200);
    expect(second.statusCode, second.body).toBe(200);
  });

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

  it('returns live health status from operational aliases', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(),
      logger: false,
    });

    const [rootHealth, apiHealth, live] = await Promise.all([
      app.inject({ method: 'GET', url: '/health' }),
      app.inject({ method: 'GET', url: '/api/v1/health' }),
      app.inject({ method: 'GET', url: '/live' }),
    ]);

    await app.close();

    expect(rootHealth.statusCode).toBe(200);
    expect(apiHealth.statusCode).toBe(200);
    expect(live.statusCode).toBe(200);
    expect(rootHealth.json()).toMatchObject({
      ok: true,
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

  it('returns readiness from operational aliases', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(),
      logger: false,
    });

    const [rootReady, apiReady] = await Promise.all([
      app.inject({ method: 'GET', url: '/ready' }),
      app.inject({ method: 'GET', url: '/api/v1/health/ready' }),
    ]);

    await app.close();

    expect(rootReady.statusCode).toBe(200);
    expect(apiReady.statusCode).toBe(200);
    expect(apiReady.json()).toMatchObject({
      ok: true,
      status: 'ready',
      database: 'connected',
    });
  });

  it('returns 503 readiness when database is unavailable', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $queryRaw: async () => {
          throw new Error('database unavailable');
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      ok: false,
      status: 'not_ready',
      database: 'unavailable',
    });
  });

  it('resolves an active public route', async () => {
    const app = await buildApp({
      env: {
        ...testEnv,
        LEGACY_MEDIA_BASE_URL: 'https://media.hackeandoelsistema.net/wp-content/uploads',
      },
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
              ogImageUrl: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/social.jpg',
              ogImage: {
                id: 'media-1',
                url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/social-card.jpg',
                altText: 'Social card',
                width: 1200,
                height: 630,
              },
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
      seo: {
        ogImageUrl: 'https://media.hackeandoelsistema.net/wp-content/uploads/2026/01/social.jpg',
        ogImage: {
          url: 'https://media.hackeandoelsistema.net/wp-content/uploads/2026/01/social-card.jpg',
        },
      },
    });
  });

  it('excludes private app routes from the public sitemap API', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async () => null,
          findMany: async ({ where }) => {
            expect(where.status).toBe('ACTIVE');
            expect(where.httpStatus).toBe(200);
            expect(where.includeInSitemap).toBe(true);
            expect(where.canonicalRouteId).toBeNull();
            expect(where.entityType).toBeUndefined();
            expect(where.OR).toEqual([
              { seoMetadata: { is: null } },
              { seoMetadata: { is: { robotsIndex: 'INDEX' } } },
            ]);
            expect(where.path.notIn).toContain('/checkout/');
            expect(where.NOT).toContainEqual({ path: { startsWith: '/cms/' } });

            return [
              {
                path: '/sample-post/',
                lastmodAt: new Date('2026-01-01T00:00:00Z'),
                changefreq: 'weekly',
                priority: 0.8,
              },
              {
                path: '/category/nacionales/',
                lastmodAt: new Date('2026-01-01T00:00:00Z'),
                changefreq: 'daily',
                priority: 0.7,
              },
              {
                path: '/cms/publicaciones/',
                lastmodAt: new Date('2026-01-01T00:00:00Z'),
                changefreq: 'weekly',
                priority: 0.2,
              },
            ];
          },
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/sitemap-routes',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      {
        path: '/sample-post/',
        lastmodAt: '2026-01-01T00:00:00.000Z',
        changefreq: 'weekly',
        priority: 0.8,
      },
      {
        path: '/category/nacionales/',
        lastmodAt: '2026-01-01T00:00:00.000Z',
        changefreq: 'daily',
        priority: 0.7,
      },
    ]);
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

  it('preserves external SEO canonicals when there is no canonical route alias', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async () => ({
            id: 'route-3',
            path: '/syndicated-sample/',
            entityType: 'POST',
            entityId: 'post-3',
            status: 'ACTIVE',
            httpStatus: 200,
            lastmodAt: new Date('2026-01-01T00:00:00Z'),
            canonicalRoute: null,
            seoMetadata: {
              canonicalUrl: 'https://example.com/original-story/',
            },
          }),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=/syndicated-sample/',
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data.canonicalPath).toBe('https://example.com/original-story/');
  });

  it('normalizes redirect lookup for missing routes', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        redirect: {
          findFirst: async ({ where }) =>
            where.sourcePath === '/old-post/'
              ? {
                  statusCode: 301,
                  targetUrl: '/new-post/',
                  preserveQuery: false,
                }
              : null,
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

  it('normalizes full same-site legacy URLs before route lookup', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async ({ where }) =>
            where.path === '/legacy-post/'
              ? {
                  id: 'route-full-url',
                  path: '/legacy-post/',
                  entityType: 'POST',
                  entityId: '22222222-2222-4222-8222-222222222222',
                  status: 'ACTIVE',
                  httpStatus: 200,
                  canonicalRoute: null,
                  seoMetadata: null,
                }
              : null,
        },
      }),
      logger: false,
    });
    const legacyUrl = encodeURIComponent('https://hackeandoelsistema.net/legacy-post/?utm_source=wp#comments');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/route?path=${legacyUrl}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.path).toBe('/legacy-post/');
  });

  it('rejects external absolute URLs in public route lookup', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=https%3A%2F%2Fexample.com%2Flegacy-post%2F',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(400);
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
    expect(response.headers['cache-control']).toContain('public, max-age=120');
    expect(response.json().data).toMatchObject({
      type: 'REDIRECT',
      statusCode: 302,
      targetUrl: '/new-search/',
      preserveQuery: true,
    });
  });

  it('resolves redirected route records through the redirect table', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        route: {
          findUnique: async () => ({
            id: 'route-redirected',
            path: '/old-route/',
            entityType: 'POST',
            entityId: '22222222-2222-4222-8222-222222222222',
            status: 'REDIRECTED',
            httpStatus: 301,
            canonicalRoute: null,
            seoMetadata: null,
          }),
        },
        redirect: {
          findFirst: async ({ where }) =>
            where.sourcePath === '/old-route/'
              ? {
                  id: 'redirect-1',
                  statusCode: 301,
                  targetUrl: '/new-route/',
                  preserveQuery: false,
                }
              : null,
          update: async () => ({}),
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/route?path=/old-route/',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['cache-control']).toContain('public, max-age=120');
    expect(response.json().data).toMatchObject({
      type: 'REDIRECT',
      statusCode: 301,
      targetUrl: '/new-route/',
    });
  });

  it('returns public posts by entity id for route based rendering', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const app = await buildApp({
      env: {
        ...testEnv,
        LEGACY_MEDIA_BASE_URL: 'https://media.hackeandoelsistema.net',
      },
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
                  contentHtml: '<p>Sample content</p><img src="https://hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg">',
                  contentJson: {
                    legacyContentHtml: '<figure><img src="/wp-content/uploads/2026/01/body.jpg"></figure>',
                  },
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
                  featuredMedia: {
                    id: '55555555-5555-4555-8555-555555555555',
                    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg',
                    altText: 'Sample',
                    width: 1200,
                    height: 800,
                  },
                  categories: [],
                  tags: [],
                  comments: [
                    {
                      id: 'comment-1',
                      authorName: 'Visitante',
                      body: 'Comentario aprobado',
                      createdAt: new Date('2026-01-03T00:00:00Z'),
                      user: null,
                    },
                  ],
                }
              : null,
        },
        route: {
          findUnique: async () => null,
          findFirst: async ({ where }) =>
            where.entityType === 'POST' && where.entityId === postId
              ? {
                  path: '/sample-post/',
                  canonicalRoute: null,
                  seoMetadata: {
                    canonicalUrl: 'https://example.com/original-story/',
                  },
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
      canonicalPath: 'https://example.com/original-story/',
      featuredMedia: {
        url: 'https://media.hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg',
      },
      contentHtml: '<p>Sample content</p><img src="https://media.hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg">',
      contentJson: {
        legacyContentHtml: '<figure><img src="https://media.hackeandoelsistema.net/wp-content/uploads/2026/01/body.jpg"></figure>',
      },
      comments: [
        {
          id: 'comment-1',
          user: 'Visitante',
          text: 'Comentario aprobado',
        },
      ],
    });
  });

  it('does not expose same-site WordPress upload content media when the legacy base points to the public domain', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const app = await buildApp({
      env: {
        ...testEnv,
        WEB_ORIGIN: 'https://hackeandoelsistema.net',
        LEGACY_MEDIA_BASE_URL: 'https://hackeandoelsistema.net/wp-content/uploads',
      },
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
                  contentHtml: '<p>Sample content</p><figure><img src="https://hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg"></figure>',
                  contentJson: {
                    legacyContentHtml: '<figure><img src="/wp-content/uploads/2026/01/body.jpg"></figure>',
                  },
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
                  featuredMedia: {
                    id: '55555555-5555-4555-8555-555555555555',
                    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg',
                    altText: 'Sample',
                    width: 1200,
                    height: 800,
                  },
                  categories: [],
                  tags: [],
                  comments: [],
                }
              : null,
        },
        route: {
          findUnique: async () => null,
          findFirst: async () => ({ path: '/sample-post/', canonicalRoute: null, seoMetadata: null }),
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
    expect(response.json().data.featuredMedia).toMatchObject({
      id: `legacy-content:${postId}`,
      url: 'https://image.hackeandoelsistema.net/uploads/2026/01/sample.jpg',
      altText: 'Sample Post',
    });
    expect(response.json().data.contentHtml).not.toContain('/wp-content/uploads/');
    expect(response.json().data.contentJson.legacyContentHtml).not.toContain('/wp-content/uploads/');
  });

  it('derives public listing media from embedded legacy WordPress images', async () => {
    const app = await buildApp({
      env: {
        ...testEnv,
        WEB_ORIGIN: 'https://hackeandoelsistema.net',
        LEGACY_MEDIA_BASE_URL: 'https://image.hackeandoelsistema.net/uploads',
        MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net',
      },
      prisma: createPrismaStub({
        post: {
          findMany: async () => [
            {
              id: '22222222-2222-4222-8222-222222222222',
              slug: 'legacy-image-post',
              title: 'Legacy Image Post',
              excerpt: 'Sample excerpt',
              contentHtml: '<p>Sample content</p><img src="https://hackeandoelsistema.net/wp-content/uploads/2026/01/sample.jpg">',
              postType: 'NEWS',
              publishedAt: new Date('2026-01-01T00:00:00Z'),
              updatedAt: new Date('2026-01-02T00:00:00Z'),
              viewCount: 12,
              commentCount: 0,
              legacyUrl: '/legacy-image-post/',
              author: null,
              featuredMedia: null,
              categories: [],
            },
          ],
          count: async () => 1,
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts?limit=12',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0].featuredMedia).toMatchObject({
      id: 'legacy-content:22222222-2222-4222-8222-222222222222',
      url: 'https://image.hackeandoelsistema.net/uploads/2026/01/sample.jpg',
      altText: 'Legacy Image Post',
    });
  });

  it('prioritizes embedded WordPress post links as public related posts with their own media', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const relatedPosts = [
      {
        id: '33333333-3333-4333-8333-333333333333',
        slug: 'relacion-editorial-uno',
        title: 'Relacion Editorial Uno',
        excerpt: 'Relacion uno',
        contentText: 'Relacion uno',
        postType: 'NEWS',
        publishedAt: new Date('2026-01-03T00:00:00Z'),
        updatedAt: new Date('2026-01-03T00:00:00Z'),
        viewCount: 1,
        commentCount: 0,
        likeCount: 0,
        saveCount: 0,
        shareCount: 0,
        legacyUrl: '/relacion-editorial-uno/',
        author: { id: 'author-1', username: 'admin', displayName: 'Admin' },
        featuredMedia: {
          id: 'media-1',
          url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-uno.jpg',
          altText: 'Relacion uno',
          width: 1200,
          height: 800,
        },
        categories: [],
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        slug: 'relacion-editorial-dos',
        title: 'Relacion Editorial Dos',
        excerpt: 'Relacion dos',
        contentText: 'Relacion dos',
        postType: 'NEWS',
        publishedAt: new Date('2026-01-02T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        viewCount: 1,
        commentCount: 0,
        likeCount: 0,
        saveCount: 0,
        shareCount: 0,
        legacyUrl: '/relacion-editorial-dos/',
        author: { id: 'author-1', username: 'admin', displayName: 'Admin' },
        featuredMedia: {
          id: 'media-2',
          url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-dos.jpg',
          altText: 'Relacion dos',
          width: 1200,
          height: 800,
        },
        categories: [],
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        slug: 'relacion-editorial-tres',
        title: 'Relacion Editorial Tres',
        excerpt: 'Relacion tres',
        contentText: 'Relacion tres',
        postType: 'NEWS',
        publishedAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        viewCount: 1,
        commentCount: 0,
        likeCount: 0,
        saveCount: 0,
        shareCount: 0,
        legacyUrl: '/relacion-editorial-tres/',
        author: { id: 'author-1', username: 'admin', displayName: 'Admin' },
        featuredMedia: {
          id: 'media-3',
          url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-tres.jpg',
          altText: 'Relacion tres',
          width: 1200,
          height: 800,
        },
        categories: [],
      },
    ];
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async ({ where }) => {
            if (where.OR) {
              return relatedPosts.slice().reverse();
            }

            return [];
          },
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.slug === 'post-con-embeds'
              ? {
                  id: postId,
                  slug: 'post-con-embeds',
                  title: 'Post con embeds',
                  excerpt: 'Post principal',
                  contentHtml: `
                    <figure><div>https://hackeandoelsistema.net/relacion-editorial-uno/</div></figure>
                    <figure><div>https://hackeandoelsistema.net/relacion-editorial-dos/</div></figure>
                    <figure><div>https://hackeandoelsistema.net/relacion-editorial-tres/</div></figure>
                  `,
                  contentJson: null,
                  contentText: 'Post principal',
                  postType: 'NEWS',
                  publishedAt: new Date('2026-01-04T00:00:00Z'),
                  updatedAt: new Date('2026-01-04T00:00:00Z'),
                  viewCount: 12,
                  commentCount: 0,
                  likeCount: 0,
                  saveCount: 0,
                  shareCount: 0,
                  legacyUrl: '/post-con-embeds/',
                  author: { id: 'author-1', username: 'admin', displayName: 'Admin' },
                  featuredMedia: null,
                  categories: [],
                  tags: [],
                  comments: [],
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts/post-con-embeds',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.relatedPosts.map((post) => post.slug)).toEqual([
      'relacion-editorial-uno',
      'relacion-editorial-dos',
      'relacion-editorial-tres',
    ]);
    expect(response.json().data.relatedPosts.map((post) => post.featuredMedia.url)).toEqual([
      'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-uno.jpg',
      'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-dos.jpg',
      'https://hackeandoelsistema.net/wp-content/uploads/2026/01/relacion-tres.jpg',
    ]);
  });

  it('toggles anonymous public post likes and stores a visitor cookie', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    let createdLike = null;
    const tx = {
      postLike: {
        findUnique: async () => null,
        create: async ({ data }) => {
          createdLike = data;
          return { id: 'like-1' };
        },
      },
      post: {
        update: async ({ data }) => {
          expect(data).toEqual({ likeCount: { increment: 1 } });
          return { likeCount: 8 };
        },
      },
    };
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $transaction: async (callback) => callback(tx),
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  likeCount: 7,
                  saveCount: 2,
                  shareCount: 1,
                  commentCount: 0,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/like`,
      payload: { liked: true },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['set-cookie']).toContain('hes_public_visitor=');
    expect(createdLike).toMatchObject({
      postId,
      userId: null,
    });
    expect(createdLike.actorHash).toEqual(expect.any(String));
    expect(response.json().data).toMatchObject({
      postId,
      liked: true,
      likeCount: 8,
    });
  });

  it('removes anonymous public post likes without allowing negative counters', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    let deletedLikeId = null;
    let decrementGuard = null;
    const tx = {
      postLike: {
        findUnique: async () => ({ id: 'like-1' }),
        delete: async ({ where }) => {
          deletedLikeId = where.id;
          return { id: where.id };
        },
      },
      post: {
        updateMany: async ({ where, data }) => {
          decrementGuard = where;
          expect(data).toEqual({ likeCount: { decrement: 1 } });
          return { count: 1 };
        },
        findUnique: async () => ({ likeCount: 0 }),
      },
    };
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $transaction: async (callback) => callback(tx),
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  likeCount: 0,
                  saveCount: 0,
                  shareCount: 0,
                  commentCount: 0,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/like`,
      headers: {
        cookie: 'hes_public_visitor=visitor-token-for-test-123456',
      },
      payload: { liked: false },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(deletedLikeId).toBe('like-1');
    expect(decrementGuard).toEqual({
      id: postId,
      likeCount: { gt: 0 },
    });
    expect(response.json().data).toMatchObject({
      postId,
      liked: false,
      likeCount: 0,
    });
  });

  it('saves public posts for authenticated users', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';
    let createdSave = null;
    const tx = {
      savedPost: {
        findUnique: async () => null,
        create: async ({ data }) => {
          createdSave = data;
          return { id: 'save-1' };
        },
      },
      post: {
        update: async ({ data }) => {
          expect(data).toEqual({ saveCount: { increment: 1 } });
          return { saveCount: 3 };
        },
      },
    };
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $transaction: async (callback) => callback(tx),
        user: {
          findFirst: async () => null,
          findUnique: async ({ where }) =>
            where.id === userId
              ? {
                  id: userId,
                  email: 'admin@example.com',
                  username: 'admin',
                  displayName: 'Admin',
                  status: 'ACTIVE',
                  roles: [],
                }
              : null,
        },
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  likeCount: 0,
                  saveCount: 2,
                  shareCount: 1,
                  commentCount: 0,
                }
              : null,
        },
      }),
      logger: false,
    });
    const { token } = await signAccessToken({
      config: app.config,
      user: {
        id: userId,
        email: 'admin@example.com',
        roles: [],
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/save`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: { saved: true },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(createdSave).toEqual({
      postId,
      userId,
    });
    expect(response.json().data).toMatchObject({
      postId,
      saved: true,
      saveCount: 3,
    });
  });

  it('records public share events and increments the share count', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    let createdShare = null;
    const tx = {
      postShare: {
        create: async ({ data }) => {
          createdShare = data;
          return { id: 'share-1' };
        },
      },
      post: {
        update: async ({ data }) => {
          expect(data).toEqual({ shareCount: { increment: 1 } });
          return { shareCount: 6 };
        },
      },
    };
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $transaction: async (callback) => callback(tx),
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  likeCount: 0,
                  saveCount: 0,
                  shareCount: 5,
                  commentCount: 0,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/share`,
      payload: { channel: 'whatsapp' },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['set-cookie']).toContain('hes_public_visitor=');
    expect(createdShare).toMatchObject({
      postId,
      userId: null,
      channel: 'whatsapp',
    });
    expect(createdShare.actorHash).toEqual(expect.any(String));
    expect(response.json().data).toMatchObject({
      postId,
      channel: 'whatsapp',
      shareCount: 6,
    });
  });

  it('records public post views and increments the view count', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    let createdView = null;
    const tx = {
      postView: {
        create: async ({ data }) => {
          createdView = data;
          return { id: 'view-1' };
        },
      },
      post: {
        update: async ({ data }) => {
          expect(data).toEqual({ viewCount: { increment: 1 } });
          return { viewCount: 13 };
        },
      },
    };
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        $transaction: async (callback) => callback(tx),
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  viewCount: 12,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/view`,
      headers: {
        'user-agent': 'vitest',
        referer: 'https://hackeandoelsistema.net/sample-post/',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['set-cookie']).toContain('hes_public_visitor=');
    expect(createdView).toMatchObject({
      postId,
      userId: null,
      referrer: 'https://hackeandoelsistema.net/sample-post/',
    });
    expect(createdView.ipHash).toEqual(expect.any(String));
    expect(createdView.userAgentHash).toEqual(expect.any(String));
    expect(createdView.viewedAt).toBeInstanceOf(Date);
    expect(response.json().data).toMatchObject({
      postId,
      viewCount: 13,
    });
  });

  it('requires an active account to create public comments', async () => {
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
                  likeCount: 0,
                  saveCount: 0,
                  shareCount: 0,
                  commentCount: 4,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/comments`,
      payload: {
        body: 'Buen analisis para probar moderacion.',
      },
    });

    await app.close();

    expect(response.statusCode).toBe(401);
  });

  it('creates pending account comments without publishing them directly', async () => {
    const postId = '22222222-2222-4222-8222-222222222222';
    const user = createMemberUser();
    const access = await signAccessToken({ config: testEnv, user });
    let createdComment = null;
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        user: {
          findFirst: async () => null,
          findUnique: async ({ where }) => (where.id === user.id ? user : null),
        },
        post: {
          findMany: async () => [],
          count: async () => 0,
          findFirst: async ({ where }) =>
            where.id === postId
              ? {
                  id: postId,
                  likeCount: 0,
                  saveCount: 0,
                  shareCount: 0,
                  commentCount: 4,
                }
              : null,
        },
        comment: {
          create: async ({ data }) => {
            createdComment = data;
            return {
              id: 'comment-1',
              authorName: data.authorName,
              body: data.body,
              status: data.status,
              createdAt: new Date('2026-07-07T12:00:00Z'),
            };
          },
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/public/posts/id/${postId}/comments`,
      headers: {
        authorization: `Bearer ${access.token}`,
        'user-agent': 'vitest',
      },
      payload: {
        body: 'Buen analisis para probar moderacion.',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(createdComment).toMatchObject({
      postId,
      userId: user.id,
      authorName: 'Lector HES',
      authorEmail: 'lector@example.com',
      body: 'Buen analisis para probar moderacion.',
      status: 'PENDING',
    });
    expect(createdComment.ipHash).toEqual(expect.any(String));
    expect(createdComment.userAgentHash).toEqual(expect.any(String));
    expect(response.json().data.moderation).toMatchObject({
      status: 'PENDING',
    });
  });

  it('publishes due scheduled posts before serving public content', async () => {
    const duePostId = '99999999-9999-4999-8999-999999999999';
    let postUpdated = false;
    let routeUpdated = false;
    let seoUpdated = false;
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async ({ where }) =>
            (where?.status === 'SCHEDULED'
              ? [{ id: duePostId, visibility: 'PUBLIC', featuredMediaId: 'media-1' }]
              : []),
          updateMany: async ({ where, data }) => {
            postUpdated = where.id.in.includes(duePostId) && data.status === 'PUBLISHED';
            return { count: 1 };
          },
          count: async () => 0,
          findFirst: async () => null,
        },
        route: {
          findUnique: async () => null,
          findMany: async ({ where }) => (where.entityId.in.includes(duePostId) ? [{ id: 'route-1' }] : []),
          updateMany: async ({ where, data }) => {
            routeUpdated = where.entityId.in.includes(duePostId) && data.includeInSitemap === true;
            return { count: 1 };
          },
        },
        seoMetadata: {
          updateMany: async ({ where, data }) => {
            seoUpdated = where.routeId.in.includes('route-1') && data.robotsIndex === 'INDEX';
            return { count: 1 };
          },
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(postUpdated).toBe(true);
    expect(routeUpdated).toBe(true);
    expect(seoUpdated).toBe(true);
  });

  it('does not expose private scheduled posts to sitemap when publishing is due', async () => {
    const duePostId = '99999999-9999-4999-8999-999999999999';
    let postUpdated = false;
    let routeUpdated = false;
    let seoUpdated = false;
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async ({ where }) =>
            (where?.status === 'SCHEDULED' ? [{ id: duePostId, visibility: 'PRIVATE' }] : []),
          updateMany: async ({ where, data }) => {
            postUpdated = where.id.in.includes(duePostId) && data.status === 'PUBLISHED';
            return { count: 1 };
          },
          count: async () => 0,
          findFirst: async () => null,
        },
        route: {
          findUnique: async () => null,
          findMany: async () => {
            throw new Error('Private scheduled post routes must not be queried for sitemap activation');
          },
          updateMany: async () => {
            routeUpdated = true;
            return { count: 1 };
          },
        },
        seoMetadata: {
          updateMany: async () => {
            seoUpdated = true;
            return { count: 1 };
          },
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(postUpdated).toBe(true);
    expect(routeUpdated).toBe(false);
    expect(seoUpdated).toBe(false);
  });

  it('moves public scheduled posts without featured media back to draft', async () => {
    const duePostId = '99999999-9999-4999-8999-999999999999';
    let postUpdateData = null;
    let routeUpdateData = null;
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async ({ where }) =>
            (where?.status === 'SCHEDULED'
              ? [{ id: duePostId, visibility: 'PUBLIC', featuredMediaId: null, scheduledAt: new Date() }]
              : []),
          updateMany: async ({ data }) => {
            postUpdateData = data;
            return { count: 0 };
          },
          count: async () => 0,
          findFirst: async () => null,
        },
        route: {
          findUnique: async () => null,
          findMany: async () => [],
          updateMany: async ({ data }) => {
            routeUpdateData = data;
            return { count: 0 };
          },
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(postUpdateData).toMatchObject({
      status: 'DRAFT',
      scheduledAt: null,
    });
    expect(routeUpdateData).toMatchObject({
      status: 'GONE',
      httpStatus: 404,
      includeInSitemap: false,
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

  it('returns public author archives by entity id without sensitive fields', async () => {
    const authorId = '11111111-1111-4111-8111-111111111111';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        user: {
          findFirst: async ({ where }) =>
            where.id === authorId
              ? {
                  id: authorId,
                  username: 'redaccion',
                  displayName: 'Redaccion',
                  email: 'private@example.com',
                  legacyAuthorSlug: 'redaccion',
                  legacyAuthorUrl: '/author/redaccion/',
                  profile: {
                    bio: 'Equipo editorial.',
                    websiteUrl: 'https://hackeandoelsistema.net',
                  },
                  avatarMedia: null,
                }
              : null,
        },
        post: {
          findMany: async ({ where }) =>
            where.authorId === authorId
              ? [
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                    slug: 'sample-post',
                    title: 'Sample Post',
                    excerpt: 'Sample excerpt',
                    postType: 'NEWS',
                    publishedAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-02T00:00:00Z'),
                    viewCount: 12,
                    commentCount: 0,
                    legacyUrl: '/sample-post/',
                    author: {
                      id: authorId,
                      username: 'redaccion',
                      displayName: 'Redaccion',
                    },
                    featuredMedia: null,
                    categories: [],
                  },
                ]
              : [],
          count: async ({ where }) => (where.authorId === authorId ? 1 : 0),
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/authors/id/${authorId}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: authorId,
      username: 'redaccion',
      displayName: 'Redaccion',
      canonicalPath: '/author/redaccion/',
      bio: 'Equipo editorial.',
      stats: { posts: 1 },
      posts: [{ title: 'Sample Post', canonicalPath: '/sample-post/' }],
    });
    expect(response.json().data.email).toBeUndefined();
  });

  it('returns active public products by entity id', async () => {
    const productId = '44444444-4444-4444-8444-444444444444';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        product: {
          findFirst: async ({ where }) =>
            where.id === productId && where.isActive
              ? {
                  id: productId,
                  slug: 'plan-mensual',
                  title: 'Plan mensual',
                  descriptionHtml: '<p>Descripcion</p>',
                  shortDescription: 'Campana mensual',
                  priceAmount: 250000,
                  currency: 'DOP',
                  legacyUrl: '/producto/plan-mensual/',
                  featuredMedia: {
                    id: '55555555-5555-4555-8555-555555555555',
                    url: 'https://example.com/product.jpg',
                    altText: 'Producto',
                    width: 1200,
                    height: 800,
                  },
                  createdAt: new Date('2026-01-01T00:00:00Z'),
                  updatedAt: new Date('2026-01-02T00:00:00Z'),
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/products/id/${productId}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: productId,
      title: 'Plan mensual',
      canonicalPath: '/producto/plan-mensual/',
      featuredMedia: { altText: 'Producto' },
    });
  });

  it('returns published public web stories by entity id', async () => {
    const storyId = '55555555-5555-4555-8555-555555555555';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        webStory: {
          findFirst: async ({ where }) =>
            where.id === storyId && where.status === 'PUBLISHED'
              ? {
                  id: storyId,
                  slug: 'historia-demo',
                  title: 'Historia demo',
                  contentJson: { legacyContentHtml: '<p>Historia</p>' },
                  legacyUrl: '/web-stories/historia-demo/',
                  publishedAt: new Date('2026-01-01T00:00:00Z'),
                  updatedAt: new Date('2026-01-02T00:00:00Z'),
                  author: {
                    id: '11111111-1111-4111-8111-111111111111',
                    username: 'redaccion',
                    displayName: 'Redaccion',
                  },
                  featuredMedia: null,
                }
              : null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/web-stories/id/${storyId}`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: storyId,
      title: 'Historia demo',
      canonicalPath: '/web-stories/historia-demo/',
      author: { displayName: 'Redaccion' },
    });
  });

  it('returns category archives by entity id', async () => {
    const categoryId = '66666666-6666-4666-8666-666666666666';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        category: {
          findMany: async () => [],
          findFirst: async ({ where }) =>
            where.id === categoryId
              ? {
                  id: categoryId,
                  name: 'Politica',
                  slug: 'politica',
                  fullPath: '/category/politica/',
                  description: 'Archivo politico.',
                }
              : null,
        },
        post: {
          findMany: async ({ where }) =>
            where.categories?.some?.categoryId === categoryId
              ? [
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                    slug: 'sample-post',
                    title: 'Sample Post',
                    excerpt: 'Sample excerpt',
                    postType: 'NEWS',
                    publishedAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-02T00:00:00Z'),
                    viewCount: 12,
                    commentCount: 0,
                    legacyUrl: '/sample-post/',
                    author: null,
                    featuredMedia: null,
                    categories: [{ isPrimary: true, category: { id: categoryId, name: 'Politica', slug: 'politica', fullPath: '/category/politica/' } }],
                  },
                ]
              : [],
          count: async ({ where }) => (where.categories?.some?.categoryId === categoryId ? 1 : 0),
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/categories/id/${categoryId}/posts`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.category).toMatchObject({
      id: categoryId,
      slug: 'politica',
      fullPath: '/category/politica/',
    });
    expect(response.json().meta.total).toBe(1);
  });

  it('resolves public category archives by full WordPress category path', async () => {
    const categoryId = '66666666-6666-4666-8666-666666666666';
    const categoryFullPath = '/category/opinion/editorial/';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        category: {
          findMany: async () => [],
          findFirst: async ({ where }) =>
            where.OR?.some((item) => item.fullPath === categoryFullPath)
              ? {
                  id: categoryId,
                  name: 'Editorial',
                  slug: 'editorial',
                  fullPath: categoryFullPath,
                  description: 'Opinion editorial.',
                }
              : null,
        },
        post: {
          findMany: async ({ where }) =>
            where.categories?.some?.categoryId === categoryId
              ? [
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                    slug: 'sample-post',
                    title: 'Sample Post',
                    excerpt: 'Sample excerpt',
                    postType: 'NEWS',
                    publishedAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-02T00:00:00Z'),
                    viewCount: 12,
                    commentCount: 0,
                    legacyUrl: '/sample-post/',
                    author: null,
                    featuredMedia: null,
                    categories: [{ isPrimary: true, category: { id: categoryId, name: 'Editorial', slug: 'editorial', fullPath: categoryFullPath } }],
                  },
                ]
              : [],
          count: async ({ where }) => (where.categories?.some?.categoryId === categoryId ? 1 : 0),
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/categories/editorial/posts?path=category/opinion/editorial',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.category).toMatchObject({
      id: categoryId,
      slug: 'editorial',
      fullPath: categoryFullPath,
    });
    expect(response.json().meta.total).toBe(1);
  });

  it('returns 404 for public archive pages outside the available range', async () => {
    const categoryId = '66666666-6666-4666-8666-666666666666';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        category: {
          findMany: async () => [],
          findFirst: async ({ where }) =>
            where.id === categoryId
              ? {
                  id: categoryId,
                  name: 'Politica',
                  slug: 'politica',
                  fullPath: '/category/politica/',
                  description: 'Archivo politico.',
                }
              : null,
        },
        post: {
          findMany: async () => [],
          count: async ({ where }) => (where.categories?.some?.categoryId === categoryId ? 25 : 0),
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/categories/id/${categoryId}/posts?page=3&limit=24`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(404);
  });

  it('returns 404 for public post listing pages outside the available range', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        post: {
          findMany: async () => [],
          count: async () => 25,
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/posts?page=3&limit=24',
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(404);
  });

  it('returns tag archives by entity id', async () => {
    const tagId = '77777777-7777-4777-8777-777777777777';
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub({
        tag: {
          findFirst: async ({ where }) =>
            where.id === tagId
              ? {
                  id: tagId,
                  name: 'SEO',
                  slug: 'seo',
                  legacyUrl: '/tag/seo/',
                }
              : null,
          count: async () => 1,
        },
        post: {
          findMany: async ({ where }) =>
            where.tags?.some?.tagId === tagId
              ? [
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                    slug: 'sample-post',
                    title: 'Sample Post',
                    excerpt: 'Sample excerpt',
                    postType: 'NEWS',
                    publishedAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-02T00:00:00Z'),
                    viewCount: 12,
                    commentCount: 0,
                    legacyUrl: '/sample-post/',
                    author: null,
                    featuredMedia: null,
                    categories: [],
                  },
                ]
              : [],
          count: async ({ where }) => (where.tags?.some?.tagId === tagId ? 1 : 0),
          findFirst: async () => null,
        },
      }),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/tags/id/${tagId}/posts`,
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.tag).toMatchObject({
      id: tagId,
      slug: 'seo',
      canonicalPath: '/tag/seo/',
    });
    expect(response.json().meta.total).toBe(1);
  });
});
