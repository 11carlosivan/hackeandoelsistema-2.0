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
    scheduledAt: null,
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
        if (where.id === post.id) return post;
        if (where.slug === post.slug) return post;
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
    page: { count },
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
      update: async ({ data }) => ({
        id: 'route-1',
        path: '/sample-post/',
        status: data.status,
        httpStatus: data.httpStatus,
        includeInSitemap: data.includeInSitemap,
        lastmodAt: data.lastmodAt,
      }),
    },
    redirect: { count },
    category: { count },
    tag: { count },
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
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
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
          robotsIndex: 'NOINDEX',
        },
      },
    });
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
