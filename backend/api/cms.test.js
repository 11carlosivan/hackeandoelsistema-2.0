// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import FormData from 'form-data';
import { buildApp } from './app.js';
import { signAccessToken } from './services/auth.js';

function createAuthUser() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    displayName: 'Admin',
    username: 'admin',
    status: 'ACTIVE',
    roles: [
      {
        role: {
          name: 'ADMIN',
          permissions: [
            { permission: { permissionKey: 'cms:read' } },
            { permission: { permissionKey: 'posts:manage' } },
            { permission: { permissionKey: 'seo:manage' } },
            { permission: { permissionKey: 'media:manage' } },
          ],
        },
      },
    ],
  };
}

function createPrismaStub(user, options = {}) {
  const count = async () => 1;
  const createdDraftId = '33333333-3333-4333-8333-333333333333';
  const post = {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'sample-post',
    title: 'Sample Post',
    excerpt: 'Sample excerpt',
    contentHtml: '<p>Sample content</p>',
    contentText: 'Sample content',
    status: options.postStatus || 'DRAFT',
    visibility: 'PUBLIC',
    postType: 'NEWS',
    publishedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    viewCount: 0,
    commentCount: 0,
    legacyUrl: '/sample-post/',
    legacyGuid: 'https://example.com/?p=1',
    legacyWordpressId: 1,
    readingTimeMinutes: 1,
    submittedAt: null,
    reviewedAt: null,
    scheduledAt: options.scheduledAt || null,
    author: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
    },
    reviewedBy: null,
    featuredMedia: null,
    categories: [],
    tags: [],
  };
  const page = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    authorId: user.id,
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    contentHtml: '<p>Privacy content</p>',
    contentText: 'Privacy content',
    status: 'DRAFT',
    legacyWordpressId: 50,
    legacyGuid: 'https://example.com/?page_id=50',
    legacyUrl: '/privacy-policy/',
    legacySlug: 'privacy-policy',
    publishedAt: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-15T00:00:00Z'),
    author: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    },
  };
  const comment = {
    id: '44444444-4444-4444-8444-444444444444',
    postId: post.id,
    userId: null,
    authorName: 'Visitante',
    authorEmail: 'visitante@example.com',
    body: 'Comentario pendiente',
    status: 'PENDING',
    legacyWordpressId: 10,
    createdAt: new Date('2026-01-04T00:00:00Z'),
    updatedAt: new Date('2026-01-04T00:00:00Z'),
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
    },
    user: null,
  };
  const media = {
    id: '55555555-5555-4555-8555-555555555555',
    uploadedById: user.id,
    disk: 'wordpress',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/sample.jpg',
    path: '/wp-content/uploads/sample.jpg',
    originalUrl: 'https://hackeandoelsistema.net/wp-content/uploads/sample.jpg',
    legacyWordpressId: 20,
    legacyGuid: 'https://example.com/wp-content/uploads/sample.jpg',
    legacyMetadata: {},
    mimeType: 'image/jpeg',
    fileName: 'sample.jpg',
    fileSize: 12345,
    width: 1200,
    height: 800,
    altText: 'Alt anterior',
    caption: 'Caption anterior',
    credit: 'Credito anterior',
    createdAt: new Date('2026-01-06T00:00:00Z'),
    uploadedBy: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    },
    variants: [
      {
        id: 'variant-1',
        mediaId: '55555555-5555-4555-8555-555555555555',
        variantName: 'thumbnail',
        url: 'https://hackeandoelsistema.net/wp-content/uploads/sample-150x150.jpg',
        path: '/wp-content/uploads/sample-150x150.jpg',
        width: 150,
        height: 150,
        fileSize: 1000,
        createdAt: new Date('2026-01-06T00:00:00Z'),
      },
    ],
    featuredPosts: [
      {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
      },
    ],
    seoMetadata: [],
    _count: {
      featuredPosts: 1,
      seoMetadata: 0,
      ads: 0,
    },
  };
  const category = {
    id: '77777777-7777-4777-8777-777777777777',
    parentId: null,
    name: 'Nacionales',
    slug: 'nacionales',
    fullPath: 'nacionales',
    description: 'Actualidad dominicana',
    sortOrder: 1,
    showInMenu: true,
    showOnHome: true,
    legacyWordpressId: 30,
    legacyUrl: '/category/nacionales/',
    createdAt: new Date('2026-01-08T00:00:00Z'),
    updatedAt: new Date('2026-01-08T00:00:00Z'),
    parent: null,
    _count: {
      posts: 3,
      children: 0,
    },
  };
  const tag = {
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Economia',
    slug: 'economia',
    legacyWordpressId: 40,
    legacyUrl: '/tag/economia/',
    createdAt: new Date('2026-01-09T00:00:00Z'),
    _count: {
      posts: 2,
    },
  };
  const redirect = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    sourcePath: '/vieja-url/',
    targetUrl: '/nueva-url/',
    statusCode: 301,
    preserveQuery: true,
    source: 'MANUAL',
    isActive: true,
    hitCount: 5,
    lastHitAt: new Date('2026-01-12T00:00:00Z'),
    createdAt: new Date('2026-01-12T00:00:00Z'),
    updatedAt: new Date('2026-01-12T00:00:00Z'),
  };
  let assignedCategoryRelations = [];
  let assignedTagRelations = [];
  const routeUpdateManyCalls = options.routeUpdateManyCalls || [];

  const prisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => undefined,
    user: {
      findUnique: async ({ where }) => (where.id === user.id ? user : null),
      count,
    },
    post: {
      count,
      findMany: async () => [post],
      findUnique: async ({ where }) => {
        const normalizedPost = {
          ...post,
          categories: assignedCategoryRelations.length > 0 ? assignedCategoryRelations : post.categories,
          tags: assignedTagRelations.length > 0 ? assignedTagRelations : post.tags,
        };
        if (where.id === post.id) return normalizedPost;
        if (where.slug === post.slug) return normalizedPost;
        return null;
      },
      create: async ({ data }) => ({
        id: createdDraftId,
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        createdAt: new Date('2026-01-02T00:00:00Z'),
        viewCount: 0,
        commentCount: 0,
        publishedAt: null,
        ...data,
      }),
      update: async ({ data }) => ({
        ...post,
        ...data,
        featuredMedia: data.featuredMediaId === media.id ? media : post.featuredMedia,
        updatedAt: new Date('2026-01-03T00:00:00Z'),
      }),
    },
    page: {
      count,
      findMany: async () => [page],
      findUnique: async ({ where }) => {
        if (where.id === page.id) return page;
        if (where.slug === page.slug) return page;
        return null;
      },
      create: async ({ data }) => ({
        ...page,
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        legacyWordpressId: null,
        legacyGuid: null,
        legacyUrl: null,
        legacySlug: null,
        createdAt: new Date('2026-01-16T00:00:00Z'),
        updatedAt: new Date('2026-01-16T00:00:00Z'),
        publishedAt: null,
        author: page.author,
        ...data,
      }),
      update: async ({ data }) => ({
        ...page,
        ...data,
        updatedAt: new Date('2026-01-17T00:00:00Z'),
      }),
    },
    route: {
      count,
      findUnique: async () => null,
      findFirst: async () => ({
        id: 'route-1',
        path: '/sample-post/',
        status: 'ACTIVE',
        httpStatus: 200,
        includeInSitemap: true,
        changefreq: 'weekly',
        priority: '0.8',
        lastmodAt: new Date('2026-01-01T00:00:00Z'),
        canonicalRoute: null,
        seoMetadata: {
          title: 'SEO Sample',
          description: 'SEO description',
          canonicalUrl: 'https://example.com/sample-post/',
          robotsIndex: 'INDEX',
          robotsFollow: 'FOLLOW',
          ogImage: null,
        },
      }),
      create: async ({ data }) => ({
        id: 'draft-route-1',
        lastmodAt: null,
        ...data,
      }),
      upsert: async ({ create, update }) => ({
        id: 'taxonomy-route-1',
        lastmodAt: new Date('2026-01-18T00:00:00Z'),
        ...(create || {}),
        ...(update || {}),
      }),
      update: async ({ data }) => ({
        id: 'route-1',
        path: data.path || '/sample-post/',
        status: data.status,
        httpStatus: data.httpStatus,
        includeInSitemap: data.includeInSitemap,
        lastmodAt: data.lastmodAt,
      }),
      updateMany: async (args = {}) => {
        routeUpdateManyCalls.push(args);
        return { count: 1 };
      },
    },
    redirect: {
      count,
      findMany: async () => [redirect],
      findUnique: async ({ where }) => {
        if (where.id === redirect.id) return redirect;
        if (where.sourcePath === redirect.sourcePath) return redirect;
        return null;
      },
      create: async ({ data }) => ({
        ...redirect,
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        hitCount: 0,
        lastHitAt: null,
        createdAt: new Date('2026-01-13T00:00:00Z'),
        updatedAt: new Date('2026-01-13T00:00:00Z'),
        ...data,
      }),
      update: async ({ data }) => ({
        ...redirect,
        ...data,
        updatedAt: new Date('2026-01-14T00:00:00Z'),
      }),
      upsert: async ({ create, update }) => ({
        ...redirect,
        id: 'page-slug-redirect',
        hitCount: 0,
        lastHitAt: null,
        createdAt: new Date('2026-01-14T00:00:00Z'),
        updatedAt: new Date('2026-01-14T00:00:00Z'),
        ...(create || {}),
        ...(update || {}),
      }),
    },
    category: {
      count,
      findMany: async () => [category],
      findFirst: async ({ where }) => (where?.slug === category.slug ? category : null),
      findUnique: async ({ where }) => (where.id === category.id ? category : null),
      create: async ({ data }) => ({
        ...category,
        id: '99999999-9999-4999-8999-999999999999',
        legacyWordpressId: null,
        legacyUrl: null,
        createdAt: new Date('2026-01-10T00:00:00Z'),
        updatedAt: new Date('2026-01-10T00:00:00Z'),
        _count: {
          posts: 0,
          children: 0,
        },
        ...data,
      }),
      update: async ({ data }) => ({
        ...category,
        ...data,
        updatedAt: new Date('2026-01-11T00:00:00Z'),
      }),
    },
    tag: {
      count,
      findMany: async () => [tag],
      findFirst: async ({ where }) => (where?.slug === tag.slug ? tag : null),
      findUnique: async ({ where }) => (where.id === tag.id ? tag : null),
      create: async ({ data }) => ({
        ...tag,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        legacyWordpressId: null,
        legacyUrl: null,
        createdAt: new Date('2026-01-10T00:00:00Z'),
        _count: {
          posts: 0,
        },
        ...data,
      }),
      update: async ({ data }) => ({
        ...tag,
        ...data,
      }),
    },
    postCategory: {
      deleteMany: async () => {
        assignedCategoryRelations = [];
        return { count: 1 };
      },
      createMany: async ({ data }) => {
        assignedCategoryRelations = data.map((item) => ({
          id: `post-category-${item.categoryId}`,
          postId: item.postId,
          categoryId: item.categoryId,
          isPrimary: item.isPrimary,
          category,
        }));

        return { count: data.length };
      },
    },
    postTag: {
      deleteMany: async () => {
        assignedTagRelations = [];
        return { count: 1 };
      },
      createMany: async ({ data }) => {
        assignedTagRelations = data.map((item) => ({
          id: `post-tag-${item.tagId}`,
          postId: item.postId,
          tagId: item.tagId,
          tag,
        }));

        return { count: data.length };
      },
    },
    userSession: { count },
    comment: {
      count,
      findMany: async () => [comment],
      findUnique: async ({ where }) => (where.id === comment.id ? comment : null),
      update: async ({ data }) => ({
        ...comment,
        ...data,
        updatedAt: new Date('2026-01-05T00:00:00Z'),
      }),
    },
    mediaAsset: {
      count,
      findMany: async () => [media],
      findUnique: async ({ where }) => (where.id === media.id ? media : null),
      create: async ({ data }) => ({
        id: '66666666-6666-4666-8666-666666666666',
        createdAt: new Date('2026-01-07T00:00:00Z'),
        ...data,
        uploadedBy: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
        variants: [],
        _count: {
          featuredPosts: 0,
          seoMetadata: 0,
          ads: 0,
        },
      }),
      update: async ({ data }) => ({
        ...media,
        ...data,
        createdAt: media.createdAt,
      }),
    },
    importRun: {
      findFirst: async () => ({
        id: 'import-1',
        source: 'wordpress-core',
        status: 'COMPLETED',
        startedAt: new Date('2026-01-01T00:00:00Z'),
        finishedAt: new Date('2026-01-01T00:01:00Z'),
        stats: {},
      }),
    },
    securityEvent: {
      findMany: async () => [
        {
          id: 'event-1',
          eventType: 'LOGIN_SUCCESS',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
          },
        },
      ],
    },
    importMapping: {
      findFirst: async () => ({
        id: 'mapping-1',
        legacyId: '1',
        legacyUrl: '/sample-post/',
        newUrl: '/sample-post/',
        checksum: 'checksum',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    },
    seoMetadata: {
      create: async ({ data }) => ({
        id: 'draft-seo-1',
        ...data,
      }),
      upsert: async ({ create, update }) => ({
        id: 'seo-1',
        routeId: create?.routeId || 'route-1',
        title: update?.title ?? create?.title ?? null,
        description: update?.description ?? create?.description ?? null,
        canonicalUrl: update?.canonicalUrl ?? create?.canonicalUrl ?? null,
        robotsIndex: update?.robotsIndex ?? create?.robotsIndex ?? 'INDEX',
        robotsFollow: update?.robotsFollow ?? create?.robotsFollow ?? 'FOLLOW',
      }),
    },
    auditLog: {
      create: async ({ data }) => ({ id: 'audit-1', ...data }),
      count,
      findMany: async () => [
        {
          id: 'audit-1',
          actorId: user.id,
          action: 'POST_CONTENT_UPDATED',
          entityType: 'POST',
          entityId: post.id,
          metadata: { fields: ['title'] },
          createdAt: new Date('2026-01-01T00:00:00Z'),
          actor: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
          },
        },
      ],
    },
  };
  prisma.$transaction = async (callback) => callback(prisma);

  return prisma;
}

const testEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
  WEB_ORIGIN: 'http://127.0.0.1:3000',
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: '1 minute',
  AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
  AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
  AUTH_COOKIE_SECURE: false,
  AUTH_MAX_LOGIN_ATTEMPTS: 5,
  AUTH_LOCKOUT_MINUTES: 15,
  corsOrigins: ['http://127.0.0.1:3000'],
  isProduction: false,
};

describe('cms routes', () => {
  it('requires authentication for the CMS summary', async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(createAuthUser()),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/summary',
    });

    await app.close();

    expect(response.statusCode).toBe(401);
  });

  it('returns a protected CMS summary for users with cms:read', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/summary',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.viewer.roles).toContain('ADMIN');
    expect(response.json().data.editorial).toMatchObject({
      published: 1,
      drafts: 1,
      pendingReview: 1,
      scheduled: 1,
    });
    expect(response.json().data.recentPosts[0]).toMatchObject({
      title: 'Sample Post',
      status: 'DRAFT',
    });
  });

  it('lists CMS categories with usage metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/categories?q=nacionales',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      name: 'Nacionales',
      fullPath: 'nacionales',
      usage: {
        posts: 3,
        children: 0,
      },
    });
  });

  it('creates and updates CMS categories with audit events', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/categories',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        name: 'Investigacion',
        showInMenu: true,
      },
    });
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/categories/77777777-7777-4777-8777-777777777777',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        name: 'Politica',
        slug: 'politica',
        showInMenu: true,
        showOnHome: false,
      },
    });

    await app.close();

    expect(createResponse.statusCode, createResponse.body).toBe(201);
    expect(createResponse.json().data.category).toMatchObject({
      id: '99999999-9999-4999-8999-999999999999',
      slug: 'investigacion',
      fullPath: '/category/investigacion/',
    });
    expect(updateResponse.statusCode, updateResponse.body).toBe(200);
    expect(updateResponse.json().data.category).toMatchObject({
      id: '77777777-7777-4777-8777-777777777777',
      name: 'Politica',
      slug: 'politica',
      fullPath: '/category/politica/',
    });
  });

  it('requires CSRF headers for cookie-authenticated CMS mutations', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });
    const csrfToken = 'csrf-test-token-with-valid-length-123456';
    const cookie = `hes_access_token=${access.token}; hes_csrf_token=${csrfToken}`;

    const missingCsrfResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/categories',
      headers: {
        cookie,
      },
      payload: {
        name: 'Seguridad',
      },
    });
    const validCsrfResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/categories',
      headers: {
        cookie,
        'x-csrf-token': csrfToken,
      },
      payload: {
        name: 'Seguridad',
      },
    });

    await app.close();

    expect(missingCsrfResponse.statusCode, missingCsrfResponse.body).toBe(403);
    expect(validCsrfResponse.statusCode, validCsrfResponse.body).toBe(201);
  });

  it('lists, creates and updates CMS tags', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/tags?q=economia',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/tags',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        name: 'Fiscalidad',
      },
    });
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/tags/88888888-8888-4888-8888-888888888888',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        name: 'Macroeconomia',
      },
    });

    await app.close();

    expect(listResponse.statusCode, listResponse.body).toBe(200);
    expect(listResponse.json().data[0]).toMatchObject({
      name: 'Economia',
      usage: {
        posts: 2,
      },
    });
    expect(createResponse.statusCode, createResponse.body).toBe(201);
    expect(createResponse.json().data.tag).toMatchObject({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      slug: 'fiscalidad',
    });
    expect(updateResponse.statusCode, updateResponse.body).toBe(200);
    expect(updateResponse.json().data.tag).toMatchObject({
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Macroeconomia',
      slug: 'macroeconomia',
    });
  });

  it('lists CMS redirects with SEO metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/redirects?q=vieja&isActive=true',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      sourcePath: '/vieja-url/',
      targetUrl: '/nueva-url/',
      statusCode: 301,
      preserveQuery: true,
      isActive: true,
      hitCount: 5,
    });
    expect(response.json().meta.filters).toMatchObject({
      q: 'vieja',
      isActive: true,
    });
  });

  it('creates and updates CMS redirects with normalized paths', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: 'antigua-ruta?utm=legacy',
        targetUrl: '/nueva-ruta?utm=wp#comentarios',
        statusCode: 301,
        preserveQuery: true,
      },
    });
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/redirects/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/vieja-url-editada',
        targetUrl: 'https://hackeandoelsistema.net/nueva-url/',
        statusCode: 308,
        isActive: false,
      },
    });

    await app.close();

    expect(createResponse.statusCode, createResponse.body).toBe(201);
    expect(createResponse.json().data.redirect).toMatchObject({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      sourcePath: '/antigua-ruta/',
      targetUrl: '/nueva-ruta/?utm=wp#comentarios',
      statusCode: 301,
      preserveQuery: true,
    });
    expect(updateResponse.statusCode, updateResponse.body).toBe(200);
    expect(updateResponse.json().data.redirect).toMatchObject({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      sourcePath: '/vieja-url-editada/',
      targetUrl: 'https://hackeandoelsistema.net/nueva-url/',
      statusCode: 308,
      isActive: false,
    });
  });

  it('rejects redirects that would conflict with public routes or loop to the same site path', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const prisma = createPrismaStub(user);
    prisma.route.findUnique = async ({ where }) => (where.path === '/sample-post/' ? { id: 'route-1' } : null);
    const app = await buildApp({
      env: testEnv,
      prisma,
      logger: false,
    });

    const routeConflictResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/sample-post/',
        targetUrl: '/nueva-ruta/',
      },
    });
    const loopResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/sin-bucle/',
        targetUrl: 'https://hackeandoelsistema.net/sin-bucle/',
      },
    });
    const systemPathResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/cms/publicaciones/',
        targetUrl: '/archivo/',
      },
    });

    await app.close();

    expect(routeConflictResponse.statusCode, routeConflictResponse.body).toBe(409);
    expect(loopResponse.statusCode, loopResponse.body).toBe(400);
    expect(systemPathResponse.statusCode, systemPathResponse.body).toBe(400);
  });

  it('allows redirects for route records already marked as redirected', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const prisma = createPrismaStub(user);
    prisma.route.findUnique = async ({ where }) =>
      where.path === '/old-route/'
        ? { id: 'route-redirected', status: 'REDIRECTED' }
        : null;
    const app = await buildApp({
      env: testEnv,
      prisma,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/old-route/',
        targetUrl: '/new-route/',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.redirect).toMatchObject({
      sourcePath: '/old-route/',
      targetUrl: '/new-route/',
    });
  });

  it('rejects malformed or ambiguous CMS redirect targets', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const malformedUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/url-rota/',
        targetUrl: 'https://',
      },
    });
    const protocolRelativeResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/url-ambigua/',
        targetUrl: '//evil.example/ruta',
      },
    });
    const unsupportedSchemeResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/redirects',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        sourcePath: '/url-js/',
        targetUrl: 'javascript:alert(1)',
      },
    });

    await app.close();

    expect(malformedUrlResponse.statusCode, malformedUrlResponse.body).toBe(400);
    expect(protocolRelativeResponse.statusCode, protocolRelativeResponse.body).toBe(400);
    expect(unsupportedSchemeResponse.statusCode, unsupportedSchemeResponse.body).toBe(400);
  });

  it('lists protected CMS pages with pagination metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/pages?status=DRAFT&q=privacy&page=1&limit=10',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      status: 'DRAFT',
      legacyWordpressId: 50,
    });
    expect(response.json().meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      filters: {
        q: 'privacy',
        status: 'DRAFT',
      },
    });
  });

  it('creates a draft CMS page with a protected route and SEO metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/pages',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'About HES',
        contentText: 'About content',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.page).toMatchObject({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      title: 'About HES',
      slug: 'about-hes',
      status: 'DRAFT',
      route: {
        path: '/about-hes/',
        status: 'GONE',
        includeInSitemap: false,
        seo: {
          robotsIndex: 'NOINDEX',
        },
      },
    });
  });

  it('returns CMS page detail with route and import metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/pages/dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      title: 'Privacy Policy',
      route: {
        path: '/sample-post/',
        seo: {
          title: 'SEO Sample',
        },
      },
      importMapping: {
        legacyUrl: '/sample-post/',
      },
    });
  });

  it('updates and publishes a CMS page while opening its route for indexing', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/pages/dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Privacy Policy Updated',
        slug: 'privacy-policy-updated',
        contentText: 'Updated privacy',
        status: 'PUBLISHED',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.page).toMatchObject({
      title: 'Privacy Policy Updated',
      slug: 'privacy-policy-updated',
      status: 'PUBLISHED',
      route: {
        path: '/privacy-policy-updated/',
        status: 'ACTIVE',
        httpStatus: 200,
        includeInSitemap: true,
        seo: {
          robotsIndex: 'INDEX',
          robotsFollow: 'FOLLOW',
        },
      },
    });
  });

  it('returns filtered CMS posts with pagination metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/posts?status=DRAFT&q=sample&page=2&limit=10',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      title: 'Sample Post',
      status: 'DRAFT',
    });
    expect(response.json().meta).toMatchObject({
      page: 2,
      limit: 10,
      total: 1,
      filters: {
        q: 'sample',
        status: 'DRAFT',
      },
    });
  });

  it('returns protected audit logs with pagination metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/audit-logs?action=POST_CONTENT_UPDATED&entityType=POST&page=1&limit=10',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      action: 'POST_CONTENT_UPDATED',
      entityType: 'POST',
      actor: {
        email: 'admin@example.com',
      },
    });
    expect(response.json().meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      filters: {
        action: 'POST_CONTENT_UPDATED',
        entityType: 'POST',
      },
    });
  });

  it('returns protected comments with filters and pagination metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/comments?status=PENDING&q=pendiente&page=1&limit=10',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      body: 'Comentario pendiente',
      status: 'PENDING',
      post: {
        title: 'Sample Post',
      },
    });
    expect(response.json().meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      filters: {
        q: 'pendiente',
        status: 'PENDING',
      },
    });
  });

  it('updates comment moderation status and returns approved count', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/comments/44444444-4444-4444-8444-444444444444/status',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        status: 'APPROVED',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.comment).toMatchObject({
      id: '44444444-4444-4444-8444-444444444444',
      status: 'APPROVED',
    });
    expect(response.json().data.approvedCount).toBe(1);
  });

  it('returns protected media assets with filters and pagination metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/media?type=IMAGE&q=sample&page=1&limit=12',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data[0]).toMatchObject({
      fileName: 'sample.jpg',
      type: 'IMAGE',
      altText: 'Alt anterior',
      usage: {
        featuredPosts: 1,
      },
    });
    expect(response.json().meta).toMatchObject({
      page: 1,
      limit: 12,
      total: 1,
      filters: {
        q: 'sample',
        type: 'IMAGE',
      },
    });
  });

  it('returns protected media detail with variants and usage', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/media/55555555-5555-4555-8555-555555555555',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: '55555555-5555-4555-8555-555555555555',
      variants: [
        {
          variantName: 'thumbnail',
        },
      ],
      featuredPosts: [
        {
          title: 'Sample Post',
        },
      ],
    });
  });

  it('uploads a new CMS media asset and records audit metadata', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const uploadDir = await mkdtemp(path.join(tmpdir(), 'hes-media-upload-'));
    const app = await buildApp({
      env: {
        ...testEnv,
        MEDIA_UPLOAD_DIR: uploadDir,
        MEDIA_PUBLIC_BASE_PATH: '/uploads/cms-test',
        MEDIA_MAX_FILE_SIZE_BYTES: 1024 * 1024,
      },
      prisma: createPrismaStub(user),
      logger: false,
    });
    const form = new FormData();
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex',
    );

    form.append('file', png, {
      filename: 'Prueba CMS.png',
      contentType: 'image/png',
      knownLength: png.length,
    });
    form.append('altText', 'Imagen subida desde CMS');
    form.append('credit', 'Redaccion HES');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/media',
      headers: {
        authorization: `Bearer ${access.token}`,
        ...form.getHeaders(),
      },
      payload: form,
    });

    await app.close();
    await rm(uploadDir, { recursive: true, force: true });

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.media).toMatchObject({
      id: '66666666-6666-4666-8666-666666666666',
      disk: 'local',
      type: 'IMAGE',
      mimeType: 'image/png',
      altText: 'Imagen subida desde CMS',
      credit: 'Redaccion HES',
      width: 1,
      height: 1,
    });
    expect(response.json().data.media.url).toMatch(/^\/uploads\/cms-test\/\d{4}\/\d{2}\/prueba-cms-[a-f0-9-]+\.png$/);
  });

  it('rejects media uploads when the file signature does not match the declared type', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const uploadDir = await mkdtemp(path.join(tmpdir(), 'hes-media-upload-'));
    const app = await buildApp({
      env: {
        ...testEnv,
        MEDIA_UPLOAD_DIR: uploadDir,
        MEDIA_PUBLIC_BASE_PATH: '/uploads/cms-test',
        MEDIA_MAX_FILE_SIZE_BYTES: 1024 * 1024,
      },
      prisma: createPrismaStub(user),
      logger: false,
    });
    const form = new FormData();
    const fakePng = Buffer.from('this is not a png file');

    form.append('file', fakePng, {
      filename: 'fake.png',
      contentType: 'image/png',
      knownLength: fakePng.length,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/media',
      headers: {
        authorization: `Bearer ${access.token}`,
        ...form.getHeaders(),
      },
      payload: form,
    });

    await app.close();
    await rm(uploadDir, { recursive: true, force: true });

    expect(response.statusCode, response.body).toBe(415);
  });

  it('updates media SEO metadata and records an audit event', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/media/55555555-5555-4555-8555-555555555555',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        altText: 'Alt actualizado',
        caption: 'Caption actualizado',
        credit: 'Redaccion HES',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.media).toMatchObject({
      id: '55555555-5555-4555-8555-555555555555',
      altText: 'Alt actualizado',
      caption: 'Caption actualizado',
      credit: 'Redaccion HES',
    });
  });

  it('creates a draft CMS post without exposing it to the sitemap', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/posts',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Nuevo borrador E2E',
        excerpt: 'Resumen del borrador',
        contentText: 'Primer parrafo\n\nSegundo parrafo',
        featuredMediaId: '55555555-5555-4555-8555-555555555555',
        categoryIds: ['77777777-7777-4777-8777-777777777777'],
        primaryCategoryId: '77777777-7777-4777-8777-777777777777',
        tagIds: ['88888888-8888-4888-8888-888888888888'],
        newTagNames: ['Codigo Penal', 'Justicia'],
        seoTitle: 'SEO borrador E2E',
        seoDescription: 'Descripcion SEO inicial',
        robotsIndex: 'NOINDEX',
        robotsFollow: 'FOLLOW',
        isBreaking: true,
        isFeatured: true,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.post).toMatchObject({
      id: '33333333-3333-4333-8333-333333333333',
      slug: 'nuevo-borrador-e2e',
      status: 'DRAFT',
      route: {
        path: '/nuevo-borrador-e2e/',
        status: 'GONE',
        includeInSitemap: false,
        seo: {
          title: 'SEO borrador E2E',
          description: 'Descripcion SEO inicial',
          robotsIndex: 'NOINDEX',
          robotsFollow: 'FOLLOW',
        },
      },
    });
  });

  it('sanitizes rich HTML when creating a draft CMS post', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/posts',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Borrador con editor visual',
        contentHtml: '<h2 onclick="alert(1)">Titulo</h2><p>Texto <a href="javascript:alert(1)">link</a></p><script>alert(1)</script>',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.post.contentHtml).toContain('<h2>Titulo</h2>');
    expect(response.json().data.post.contentHtml).not.toContain('onclick');
    expect(response.json().data.post.contentHtml).not.toContain('javascript:');
    expect(response.json().data.post.contentHtml).not.toContain('<script>');
    expect(response.json().data.post.contentText).toContain('Titulo');
  });

  it('deduplicates draft slugs against existing posts and routes', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/posts',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Sample Post',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().data.post.slug).toBe('sample-post-2');
  });

  it('updates editable draft content and records an audit event', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Draft updated',
        excerpt: 'Updated excerpt',
        contentText: 'Linea actualizada',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post).toMatchObject({
      title: 'Draft updated',
      excerpt: 'Updated excerpt',
      status: 'DRAFT',
    });
  });

  it('updates editable draft slug, editorial flags and route path together', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const routeUpdateManyCalls = [];
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user, { routeUpdateManyCalls }),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Draft updated',
        slug: 'Mi Slug Nuevo',
        isBreaking: true,
        isFeatured: true,
        isSponsored: false,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post).toMatchObject({
      title: 'Draft updated',
      slug: 'mi-slug-nuevo',
      isBreaking: true,
      isFeatured: true,
      isSponsored: false,
    });
    expect(routeUpdateManyCalls).toContainEqual(
      expect.objectContaining({
        where: {
          entityType: 'POST',
          entityId: '22222222-2222-4222-8222-222222222222',
        },
        data: expect.objectContaining({
          path: '/mi-slug-nuevo/',
        }),
      }),
    );
  });

  it('sanitizes rich HTML when updating editable draft content', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        contentHtml: '<p onclick="alert(1)">Contenido seguro</p><img src="javascript:alert(1)" onerror="alert(1)">',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post.contentHtml).toContain('<p>Contenido seguro</p>');
    expect(response.json().data.post.contentHtml).not.toContain('onclick');
    expect(response.json().data.post.contentHtml).not.toContain('onerror');
    expect(response.json().data.post.contentHtml).not.toContain('javascript:');
    expect(response.json().data.post.contentText).toContain('Contenido seguro');
  });

  it('updates CMS post taxonomy with a primary category and tags', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/taxonomy',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        categoryIds: ['77777777-7777-4777-8777-777777777777'],
        primaryCategoryId: '77777777-7777-4777-8777-777777777777',
        tagIds: ['88888888-8888-4888-8888-888888888888'],
        newTagNames: ['Justicia'],
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      primaryCategory: {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Nacionales',
      },
    });
    expect(response.json().data.post.tags).toHaveLength(2);
  });

  it('rejects content edits for published posts', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user, { postStatus: 'PUBLISHED' }),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Published updated',
      },
    });

    await app.close();

    expect(response.statusCode).toBe(409);
  });

  it('submits a draft post to editorial review', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'SUBMIT_REVIEW',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post.status).toBe('PENDING_REVIEW');
  });

  it('publishes a draft post and opens the route for sitemap indexing', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'PUBLISH',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post.status).toBe('PUBLISHED');
    expect(response.json().data.route).toMatchObject({
      status: 'ACTIVE',
      httpStatus: 200,
      includeInSitemap: true,
    });
    expect(response.json().data.seo).toMatchObject({
      robotsIndex: 'INDEX',
      robotsFollow: 'FOLLOW',
    });
  });

  it('rejects scheduling a post without a future scheduled date', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'SCHEDULE',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(400);
  });

  it('schedules a post with a future scheduled date and keeps it out of sitemap', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user, { scheduledAt: futureDate }),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'SCHEDULE',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post.status).toBe('SCHEDULED');
    expect(response.json().data.route).toMatchObject({
      status: 'ACTIVE',
      httpStatus: 200,
      includeInSitemap: false,
    });
    expect(response.json().data.seo).toMatchObject({
      robotsIndex: 'NOINDEX',
      robotsFollow: 'FOLLOW',
    });
  });

  it('archives a published post and removes it from indexing', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user, { postStatus: 'PUBLISHED' }),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'ARCHIVE',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post.status).toBe('ARCHIVED');
    expect(response.json().data.route).toMatchObject({
      status: 'GONE',
      httpStatus: 410,
      includeInSitemap: false,
    });
    expect(response.json().data.seo).toMatchObject({
      robotsIndex: 'NOINDEX',
      robotsFollow: 'NOFOLLOW',
    });
  });

  it('rejects invalid workflow transitions', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user, { postStatus: 'PUBLISHED' }),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/workflow',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        action: 'SUBMIT_REVIEW',
      },
    });

    await app.close();

    expect(response.statusCode).toBe(409);
  });

  it('updates a post featured media using an existing image', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/featured-media',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        mediaId: '55555555-5555-4555-8555-555555555555',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.post).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
    });
    expect(response.json().data.featuredMedia).toMatchObject({
      id: '55555555-5555-4555-8555-555555555555',
      mimeType: 'image/jpeg',
    });
  });

  it('returns a protected CMS post detail with SEO route data', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      title: 'Sample Post',
      contentHtml: '<p>Sample content</p>',
      legacyWordpressId: 1,
      route: {
        path: '/sample-post/',
        seo: {
          title: 'SEO Sample',
          robotsIndex: 'INDEX',
        },
      },
      importMapping: {
        legacyId: '1',
      },
    });
  });

  it('updates CMS post SEO metadata for users with seo:manage', async () => {
    const user = createAuthUser();
    const access = await signAccessToken({ config: testEnv, user });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/cms/posts/22222222-2222-4222-8222-222222222222/seo',
      headers: {
        authorization: `Bearer ${access.token}`,
      },
      payload: {
        title: 'Updated SEO title',
        description: 'Updated SEO description',
        robotsIndex: 'INDEX',
        robotsFollow: 'FOLLOW',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.seo).toMatchObject({
      title: 'Updated SEO title',
      description: 'Updated SEO description',
      robotsIndex: 'INDEX',
      robotsFollow: 'FOLLOW',
    });
  });
});
