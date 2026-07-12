import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

function createPrismaStub(overrides = {}) {
  return {
    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => undefined,
    category: {
      findMany: async () => [],
      findFirst: async () => null,
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
    user: {
      findFirst: async () => null,
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
    expect(response.json().data).toMatchObject({
      type: 'REDIRECT',
      statusCode: 301,
      targetUrl: '/new-route/',
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
      comments: [
        {
          id: 'comment-1',
          user: 'Visitante',
          text: 'Comentario aprobado',
        },
      ],
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
            (where?.status === 'SCHEDULED' ? [{ id: duePostId, visibility: 'PUBLIC' }] : []),
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
