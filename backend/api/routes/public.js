import { z } from 'zod';
import { AUTH_COOKIE_NAMES, verifyAccessToken } from '../services/auth.js';
import { randomToken, sha256Hex } from '../utils/crypto.js';
import { noStoreHeaders, publicCacheHeaders } from '../utils/http.js';
import { createSystemStatsProvider } from '../services/public-system-stats.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const categoryPostsQuerySchema = paginationSchema.extend({
  path: z.string().trim().min(1).max(500).optional(),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
});

const categoryQuerySchema = z.object({
  menuOnly: z.coerce.boolean().default(false),
});

const routeQuerySchema = z.object({
  path: z.string().trim().min(1).max(500),
});

const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(280),
});

const idParamSchema = z.object({
  id: z.uuid(),
});
const publicCommentSchema = z.object({
  authorName: z.string().trim().min(2).max(160).optional(),
  authorEmail: z.string().trim().email().max(255).optional(),
  body: z.string().trim().min(3).max(2000),
  parentId: z.uuid().nullable().optional(),
});
const publicLikeSchema = z.object({
  liked: z.boolean().optional(),
});
const publicSaveSchema = z.object({
  saved: z.boolean().optional(),
});
const publicShareSchema = z.object({
  channel: z.enum(['native', 'copy', 'facebook', 'x', 'whatsapp', 'telegram', 'email']).default('native'),
});

const categorySlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(180),
});

const SITEMAP_EXCLUDED_PATHS = [
  '/buscar/',
  '/checkout/',
  '/cms/',
  '/crear-publicacion/',
  '/iniciar-sesion/',
  '/password-recover/',
  '/register/',
];
const SITEMAP_EXCLUDED_PREFIXES = [...SITEMAP_EXCLUDED_PATHS];
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_ORIGIN || 'https://hackeandoelsistema.net').replace(/\/+$/g, '');
const PUBLIC_VISITOR_COOKIE = 'hes_public_visitor';

let lastScheduledPublishCheckAt = 0;
let scheduledPublishInFlight = null;

function getCookieValue(cookieHeader, name) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function publicCookieOptions(app, maxAge) {
  return [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    app.config.AUTH_COOKIE_SECURE ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function ensurePublicVisitor(request, reply) {
  const existing = getCookieValue(request.headers.cookie, PUBLIC_VISITOR_COOKIE);
  const existingValid = /^[A-Za-z0-9_-]{24,128}$/.test(existing || '');
  const visitorId = existingValid ? existing : randomToken(32);

  if (!existingValid) {
    reply.header('Set-Cookie', `${PUBLIC_VISITOR_COOKIE}=${visitorId}; ${publicCookieOptions(request.server, 365 * 24 * 60 * 60)}`);
  }

  return visitorId;
}

async function getOptionalPublicUser(app, request) {
  const header = request.headers.authorization || '';
  const [scheme, bearerToken] = header.split(' ');
  const cookieToken = getCookieValue(request.headers.cookie, AUTH_COOKIE_NAMES.access);
  const token = scheme?.toLowerCase() === 'bearer' && bearerToken ? bearerToken : cookieToken;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(app.config, token);
    const user = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        displayName: true,
        email: true,
        status: true,
      },
    });

    return user?.status === 'ACTIVE' ? user : null;
  } catch {
    return null;
  }
}

function engagementActorHash({ app, user, visitorId }) {
  const rawActor = user?.id ? `user:${user.id}` : `visitor:${visitorId}`;

  return sha256Hex(rawActor, app.config.AUTH_JWT_SECRET);
}

function requestHashMeta(request) {
  const pepper = request.server.config.AUTH_JWT_SECRET;
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = request.ip || forwardedFor;
  const userAgent = request.headers['user-agent'] || '';

  return {
    ipHash: ip ? sha256Hex(`ip:${ip}`, pepper) : null,
    userAgentHash: userAgent ? sha256Hex(`ua:${userAgent}`, pepper) : null,
  };
}

async function findPublicPostForEngagement(app, postId) {
  return app.prisma.post.findFirst({
    where: {
      id: postId,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    },
    select: {
      id: true,
      likeCount: true,
      saveCount: true,
      shareCount: true,
      commentCount: true,
    },
  });
}

async function publishDueScheduledPosts(app) {
  const nowMs = Date.now();
  const shouldThrottle = app.config?.NODE_ENV !== 'test';

  if (scheduledPublishInFlight || (shouldThrottle && nowMs - lastScheduledPublishCheckAt < 30000)) {
    return scheduledPublishInFlight;
  }

  if (
    typeof app.prisma.post?.findMany !== 'function' ||
    typeof app.prisma.post?.updateMany !== 'function' ||
    typeof app.prisma.route?.updateMany !== 'function'
  ) {
    return null;
  }

  scheduledPublishInFlight = (async () => {
    const now = new Date();
    const duePosts = await app.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
        },
      },
      take: 100,
      select: {
        id: true,
        visibility: true,
      },
    });
    const postIds = duePosts.map((post) => post.id).filter(Boolean);
    const publicPostIds = duePosts
      .filter((post) => post.visibility === 'PUBLIC')
      .map((post) => post.id)
      .filter(Boolean);

    if (postIds.length === 0) {
      return;
    }

    await app.prisma.post.updateMany({
      where: {
        id: { in: postIds },
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
        },
      },
      data: {
        status: 'PUBLISHED',
        publishedAt: now,
        publishedGmtAt: now,
      },
    });

    let routeIds = [];

    if (publicPostIds.length > 0 && typeof app.prisma.route?.findMany === 'function') {
      const routes = await app.prisma.route.findMany({
        where: {
          entityType: 'POST',
          entityId: { in: publicPostIds },
        },
        select: {
          id: true,
        },
      });

      routeIds = routes.map((route) => route.id).filter(Boolean);
    }

    if (publicPostIds.length > 0) {
      await app.prisma.route.updateMany({
        where: {
          entityType: 'POST',
          entityId: { in: publicPostIds },
        },
        data: {
          status: 'ACTIVE',
          httpStatus: 200,
          includeInSitemap: true,
          lastmodAt: now,
        },
      });
    }

    if (routeIds.length > 0 && typeof app.prisma.seoMetadata?.updateMany === 'function') {
      await app.prisma.seoMetadata.updateMany({
        where: {
          routeId: { in: routeIds },
        },
        data: {
          robotsIndex: 'INDEX',
          robotsFollow: 'FOLLOW',
        },
      });
    }
  })();

  try {
    await scheduledPublishInFlight;
    if (shouldThrottle) {
      lastScheduledPublishCheckAt = Date.now();
    }
  } catch (error) {
    app.log.warn({ error }, 'Unable to publish due scheduled posts');
  } finally {
    scheduledPublishInFlight = null;
  }

  return null;
}

function normalizeRoutePath(path) {
  const rawPath = String(path || '').trim();
  let cleanPath;

  try {
    const url = new URL(rawPath, PUBLIC_SITE_URL);

    if (/^https?:\/\//i.test(rawPath)) {
      const site = new URL(PUBLIC_SITE_URL);

      if (url.origin !== site.origin) {
        return null;
      }
    }

    cleanPath = url.pathname;
  } catch {
    cleanPath = rawPath.split(/[?#]/, 1)[0];
  }

  const withLeadingSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeCategoryFullPath(value) {
  const cleanPath = String(value || '').trim().replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    return null;
  }

  const categoryPath = cleanPath.startsWith('category/') ? cleanPath : `category/${cleanPath}`;

  return `/${categoryPath}/`.replace(/\/+/g, '/');
}

function categoryFullPathCandidates(slug, path) {
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  const cleanPath = String(path || '').trim().replace(/^\/+|\/+$/g, '');
  const normalizedPath = normalizeCategoryFullPath(cleanPath || cleanSlug);
  const strippedPath = normalizedPath?.replace(/^\/category\//, '').replace(/\/$/g, '');

  return [
    normalizedPath,
    cleanPath,
    strippedPath,
    cleanSlug ? normalizeCategoryFullPath(cleanSlug) : null,
  ].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);
}

function canonicalPathFromUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const site = new URL(PUBLIC_SITE_URL);

    return url.origin === site.origin ? normalizeRoutePath(url.pathname) : url.href;
  } catch {
    return value.startsWith('/') ? normalizeRoutePath(value) : null;
  }
}

function isSitemapRouteAllowed(path) {
  const normalizedPath = normalizeRoutePath(path);

  return Boolean(normalizedPath) &&
    !SITEMAP_EXCLUDED_PATHS.includes(normalizedPath) &&
    !SITEMAP_EXCLUDED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function totalPagesFor(total, limit) {
  return Math.max(1, Math.ceil(Number(total || 0) / Number(limit || 1)));
}

function ensurePublicPageInRange(app, { page, total, limit, resourceName }) {
  const totalPages = totalPagesFor(total, limit);

  if (page > totalPages) {
    throw app.httpErrors.notFound(`${resourceName} page not found`);
  }

  return totalPages;
}

async function findActiveRedirect(app, request, sourcePath) {
  const redirect = await app.prisma.redirect.findFirst({
    where: {
      sourcePath,
      isActive: true,
    },
  });

  if (!redirect) {
    return null;
  }

  if (redirect.id && typeof app.prisma.redirect.update === 'function') {
    app.prisma.redirect
      .update({
        where: { id: redirect.id },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: new Date(),
        },
      })
      .catch((error) => request.log.warn({ error }, 'Unable to update redirect hit count'));
  }

  return {
    type: 'REDIRECT',
    statusCode: redirect.statusCode,
    targetUrl: redirect.targetUrl,
    preserveQuery: redirect.preserveQuery,
  };
}

function canonicalPathForPost(post, route = null) {
  return route?.canonicalRoute?.path ||
    canonicalPathFromUrl(route?.seoMetadata?.canonicalUrl) ||
    route?.path ||
    post.legacyUrl ||
    `/${post.slug}/`;
}

function rewriteLegacyMediaUrl(config, value) {
  if (!value || !config?.LEGACY_MEDIA_BASE_URL) {
    return value;
  }

  try {
    const legacyBaseUrl = config.LEGACY_MEDIA_BASE_URL.replace(/\/+$/g, '');
    const url = String(value).startsWith('/')
      ? new URL(String(value), legacyBaseUrl)
      : new URL(String(value));

    if (!url.pathname.startsWith('/wp-content/uploads/')) {
      return value;
    }

    return `${legacyBaseUrl}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function rewriteLegacyMediaHtml(config, value) {
  if (!value || !config?.LEGACY_MEDIA_BASE_URL) {
    return value;
  }

  return String(value).replace(
    /(https?:\/\/[^"'\s)]+\/wp-content\/uploads\/[^"'\s)]+|\/wp-content\/uploads\/[^"'\s)]+)/g,
    (url) => rewriteLegacyMediaUrl(config, url),
  );
}

function rewriteLegacyMediaContentJson(config, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const contentJson = { ...value };

  if (typeof contentJson.legacyContentHtml === 'string') {
    contentJson.legacyContentHtml = rewriteLegacyMediaHtml(config, contentJson.legacyContentHtml);
  }

  return contentJson;
}

function normalizePublicMediaAsset(config, media) {
  if (!media) {
    return null;
  }

  return {
    id: media.id,
    url: rewriteLegacyMediaUrl(config, media.url),
    altText: media.altText,
    width: media.width,
    height: media.height,
  };
}

function normalizePublicSeoMetadata(config, seoMetadata) {
  if (!seoMetadata) {
    return seoMetadata;
  }

  return {
    ...seoMetadata,
    ogImageUrl: rewriteLegacyMediaUrl(config, seoMetadata.ogImageUrl),
    ogImage: seoMetadata.ogImage ? normalizePublicMediaAsset(config, seoMetadata.ogImage) : seoMetadata.ogImage,
  };
}

function normalizePublicPost(post, options = {}) {
  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;
  const canonicalPath = canonicalPathForPost(post, options.route);
  const config = options.config;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    postType: post.postType,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount,
    commentCount: post.commentCount,
    likeCount: post.likeCount || 0,
    saveCount: post.saveCount || 0,
    shareCount: post.shareCount || 0,
    canonicalPath,
    author: post.author
      ? {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.displayName,
          legacyAuthorSlug: post.author.legacyAuthorSlug,
          legacyAuthorUrl: post.author.legacyAuthorUrl,
        }
      : null,
    primaryCategory: primaryCategory
      ? {
          id: primaryCategory.id,
          name: primaryCategory.name,
          slug: primaryCategory.slug,
          fullPath: primaryCategory.fullPath,
        }
      : null,
    featuredMedia: normalizePublicMediaAsset(config, post.featuredMedia),
  };
}

async function findPublicEntityRoute(app, entityType, entityId) {
  if (!entityId || typeof app.prisma.route?.findFirst !== 'function') {
    return null;
  }

  return app.prisma.route.findFirst({
    where: {
      entityType,
      entityId,
      status: 'ACTIVE',
    },
    select: {
      path: true,
      canonicalRoute: {
        select: {
          path: true,
        },
      },
      seoMetadata: {
        select: {
          canonicalUrl: true,
        },
      },
    },
  });
}

function normalizePublicComment(comment) {
  return {
    id: comment.id,
    user: comment.authorName || comment.user?.displayName || 'Visitante',
    text: comment.body,
    date: comment.createdAt,
  };
}

const publicPostAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  legacyAuthorSlug: true,
  legacyAuthorUrl: true,
};

async function findRelatedPosts(app, post, take = 3) {
  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;

  if (!primaryCategory?.id) {
    return [];
  }

  return app.prisma.post.findMany({
    where: {
      id: { not: post.id },
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      categories: {
        some: {
          categoryId: primaryCategory.id,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take,
    include: {
      author: {
        select: publicPostAuthorSelect,
      },
      featuredMedia: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
  });
}

const publicPostInclude = {
  author: {
    select: publicPostAuthorSelect,
  },
  featuredMedia: {
    select: {
      id: true,
      url: true,
      altText: true,
      width: true,
      height: true,
    },
  },
  categories: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          fullPath: true,
        },
      },
    },
  },
};

async function searchPublicPostsWithFullText(app, { q, page, limit }) {
  if (!q || typeof app.prisma.$queryRaw !== 'function') {
    return null;
  }

  try {
    const offset = (page - 1) * limit;
    const query = q.trim();
    const rows = await app.prisma.$queryRaw`
      SELECT
        id,
        MATCH(title, excerpt, content_text) AGAINST (${query} IN NATURAL LANGUAGE MODE) AS score
      FROM posts
      WHERE status = 'PUBLISHED'
        AND visibility = 'PUBLIC'
        AND MATCH(title, excerpt, content_text) AGAINST (${query} IN NATURAL LANGUAGE MODE)
      ORDER BY score DESC, published_at DESC, created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const totalRows = await app.prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM posts
      WHERE status = 'PUBLISHED'
        AND visibility = 'PUBLIC'
        AND MATCH(title, excerpt, content_text) AGAINST (${query} IN NATURAL LANGUAGE MODE)
    `;
    const total = Number(totalRows[0]?.total || 0);
    const ids = rows.map((row) => row.id).filter(Boolean);

    if (ids.length === 0 || total === 0) {
      return null;
    }

    const posts = await app.prisma.post.findMany({
      where: { id: { in: ids } },
      include: publicPostInclude,
    });
    const postsById = new Map(posts.map((post) => [post.id, post]));

    return {
      items: ids.map((id) => postsById.get(id)).filter(Boolean),
      total,
    };
  } catch (error) {
    app.log.warn({ error }, 'MySQL full-text public search unavailable; falling back to contains search');
    return null;
  }
}

function normalizePublicAuthor(author, posts = [], totalPosts = 0, config = null) {
  return {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    legacyAuthorSlug: author.legacyAuthorSlug,
    legacyAuthorUrl: author.legacyAuthorUrl,
    canonicalPath: author.legacyAuthorUrl || (author.legacyAuthorSlug ? `/author/${author.legacyAuthorSlug}/` : null),
    bio: author.profile?.bio || null,
    websiteUrl: author.profile?.websiteUrl || null,
    avatar: normalizePublicMediaAsset(config, author.avatarMedia),
    stats: {
      posts: totalPosts,
    },
    posts: posts.map((post) => normalizePublicPost(post, { config })),
  };
}

function normalizePublicProduct(product, config = null) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    descriptionHtml: rewriteLegacyMediaHtml(config, product.descriptionHtml),
    shortDescription: product.shortDescription,
    priceAmount: product.priceAmount,
    currency: product.currency,
    canonicalPath: product.legacyUrl || `/producto/${product.slug}/`,
    featuredMedia: normalizePublicMediaAsset(config, product.featuredMedia),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function normalizePublicWebStory(story, config = null) {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    contentJson: rewriteLegacyMediaContentJson(config, story.contentJson),
    canonicalPath: story.legacyUrl || `/web-stories/${story.slug}/`,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
    author: story.author
      ? {
          id: story.author.id,
          username: story.author.username,
          displayName: story.author.displayName,
        }
      : null,
    featuredMedia: normalizePublicMediaAsset(config, story.featuredMedia),
  };
}

function normalizePublicTag(tag) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: null,
    canonicalPath: tag.legacyUrl || `/tag/${tag.slug}/`,
  };
}

export async function registerPublicRoutes(app) {
  const systemStatsProvider = createSystemStatsProvider(app.config || {});

  app.addHook('preHandler', async (request) => {
    if (request.method === 'GET' && request.url.startsWith('/api/v1/public/')) {
      await publishDueScheduledPosts(app);
    }
  });

  app.get('/api/v1/public/categories', async (request, reply) => {
    const parsed = categoryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid category query');
    }

    publicCacheHeaders(reply, 300);

    const categories = await app.prisma.category.findMany({
      where: parsed.data.menuOnly ? { showInMenu: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        fullPath: true,
        description: true,
        showInMenu: true,
        showOnHome: true,
      },
    });

    return { data: categories };
  });

  app.get('/api/v1/public/categories/:slug/posts', async (request, reply) => {
    const params = categorySlugParamSchema.safeParse(request.params);
    const query = categoryPostsQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      throw app.httpErrors.badRequest('Invalid category posts query');
    }

    const { slug } = params.data;
    const { page, limit, path } = query.data;
    const fullPathCandidates = categoryFullPathCandidates(slug, path);
    const category = await app.prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          ...fullPathCandidates.map((fullPath) => ({ fullPath })),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        fullPath: true,
        description: true,
      },
    });

    if (!category) {
      throw app.httpErrors.notFound('Category not found');
    }

    publicCacheHeaders(reply, 180);

    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      categories: {
        some: {
          categoryId: category.id,
        },
      },
    };
    const [items, total] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: publicPostAuthorSelect,
          },
          featuredMedia: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
      app.prisma.post.count({ where }),
    ]);
    const totalPages = ensurePublicPageInRange(app, {
      page,
      total,
      limit,
      resourceName: 'Category',
    });

    return {
      data: {
        category,
        posts: items.map((post) => normalizePublicPost(post, { config: app.config })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });

  app.get('/api/v1/public/categories/id/:id/posts', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    const query = paginationSchema.safeParse(request.query);

    if (!params.success || !query.success) {
      throw app.httpErrors.badRequest('Invalid category posts query');
    }

    const { id } = params.data;
    const { page, limit } = query.data;
    const category = await app.prisma.category.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        fullPath: true,
        description: true,
      },
    });

    if (!category) {
      throw app.httpErrors.notFound('Category not found');
    }

    publicCacheHeaders(reply, 180);

    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      categories: {
        some: {
          categoryId: category.id,
        },
      },
    };
    const [items, total] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: publicPostAuthorSelect,
          },
          featuredMedia: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
      app.prisma.post.count({ where }),
    ]);
    const totalPages = ensurePublicPageInRange(app, {
      page,
      total,
      limit,
      resourceName: 'Category',
    });

    return {
      data: {
        category,
        posts: items.map((post) => normalizePublicPost(post, { config: app.config })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });

  app.get('/api/v1/public/tags/id/:id/posts', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    const query = paginationSchema.safeParse(request.query);

    if (!params.success || !query.success) {
      throw app.httpErrors.badRequest('Invalid tag posts query');
    }

    const { id } = params.data;
    const { page, limit } = query.data;
    const tag = await app.prisma.tag.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        legacyUrl: true,
      },
    });

    if (!tag) {
      throw app.httpErrors.notFound('Tag not found');
    }

    publicCacheHeaders(reply, 180);

    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      tags: {
        some: {
          tagId: tag.id,
        },
      },
    };
    const [items, total] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: publicPostAuthorSelect,
          },
          featuredMedia: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
      app.prisma.post.count({ where }),
    ]);
    const totalPages = ensurePublicPageInRange(app, {
      page,
      total,
      limit,
      resourceName: 'Tag',
    });

    return {
      data: {
        tag: normalizePublicTag(tag),
        posts: items.map((post) => normalizePublicPost(post, { config: app.config })),
      },
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });

  app.get('/api/v1/public/posts', async (request, reply) => {
    const parsed = paginationSchema.merge(searchSchema).safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid pagination query');
    }

    const { page, limit, q } = parsed.data;
    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { excerpt: { contains: q } },
              { contentText: { contains: q } },
            ],
          }
        : {}),
    };

    publicCacheHeaders(reply, q ? 60 : 180);

    const fullTextResult = q ? await searchPublicPostsWithFullText(app, { q, page, limit }) : null;
    const [items, total] = fullTextResult
      ? [fullTextResult.items, fullTextResult.total]
      : await Promise.all([
          app.prisma.post.findMany({
            where,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
            include: publicPostInclude,
          }),
          app.prisma.post.count({ where }),
        ]);
    const totalPages = ensurePublicPageInRange(app, {
      page,
      total,
      limit,
      resourceName: 'Posts',
    });

    return {
      data: items.map((post) => normalizePublicPost(post, { config: app.config })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });

  app.get('/api/v1/public/posts/:slug', async (request, reply) => {
    const { slug } = slugParamSchema.parse(request.params);

    const post = await app.prisma.post.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      include: {
        author: {
          select: publicPostAuthorSelect,
        },
        featuredMedia: true,
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        comments: {
          where: {
            status: 'APPROVED',
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50,
          select: {
            id: true,
            authorName: true,
            body: true,
            createdAt: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    publicCacheHeaders(reply, 180);
    const [relatedPosts, route] = await Promise.all([
      findRelatedPosts(app, post),
      findPublicEntityRoute(app, 'POST', post.id),
    ]);

    return {
      data: {
        ...normalizePublicPost(post, { route, config: app.config }),
        contentHtml: rewriteLegacyMediaHtml(app.config, post.contentHtml),
        contentJson: rewriteLegacyMediaContentJson(app.config, post.contentJson),
        relatedPosts: relatedPosts.map((relatedPost) => normalizePublicPost(relatedPost, { config: app.config })),
        comments: (post.comments || []).map(normalizePublicComment),
        tags: post.tags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
          slug: item.tag.slug,
        })),
      },
    };
  });

  app.get('/api/v1/public/posts/id/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    const post = await app.prisma.post.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      include: {
        author: {
          select: publicPostAuthorSelect,
        },
        featuredMedia: true,
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        comments: {
          where: {
            status: 'APPROVED',
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50,
          select: {
            id: true,
            authorName: true,
            body: true,
            createdAt: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    publicCacheHeaders(reply, 180);
    const [relatedPosts, route] = await Promise.all([
      findRelatedPosts(app, post),
      findPublicEntityRoute(app, 'POST', post.id),
    ]);

    return {
      data: {
        ...normalizePublicPost(post, { route, config: app.config }),
        contentHtml: rewriteLegacyMediaHtml(app.config, post.contentHtml),
        contentJson: rewriteLegacyMediaContentJson(app.config, post.contentJson),
        relatedPosts: relatedPosts.map((relatedPost) => normalizePublicPost(relatedPost, { config: app.config })),
        comments: (post.comments || []).map(normalizePublicComment),
        tags: post.tags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
          slug: item.tag.slug,
        })),
      },
    };
  });

  app.get('/api/v1/public/posts/id/:id/engagement', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);

    const [post, user] = await Promise.all([
      findPublicPostForEngagement(app, id),
      getOptionalPublicUser(app, request),
    ]);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    const visitorId = getCookieValue(request.headers.cookie, PUBLIC_VISITOR_COOKIE);
    const actorHash = visitorId || user ? engagementActorHash({ app, user, visitorId }) : null;
    const [like, saved] = await Promise.all([
      actorHash
        ? app.prisma.postLike.findUnique({
            where: {
              postId_actorHash: {
                postId: id,
                actorHash,
              },
            },
            select: { id: true },
          })
        : null,
      user
        ? app.prisma.savedPost.findUnique({
            where: {
              postId_userId: {
                postId: id,
                userId: user.id,
              },
            },
            select: { id: true },
          })
        : null,
    ]);

    return {
      data: {
        postId: id,
        liked: Boolean(like),
        saved: Boolean(saved),
        authenticated: Boolean(user),
        counts: {
          likes: post.likeCount,
          saves: post.saveCount,
          shares: post.shareCount,
          comments: post.commentCount,
        },
      },
    };
  });

  app.post('/api/v1/public/posts/id/:id/like', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = publicLikeSchema.safeParse(request.body || {});

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid like payload');
    }

    noStoreHeaders(reply);
    const post = await findPublicPostForEngagement(app, id);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    const user = await getOptionalPublicUser(app, request);
    const visitorId = ensurePublicVisitor(request, reply);
    const actorHash = engagementActorHash({ app, user, visitorId });
    const shouldLike = body.data.liked ?? true;

    const result = await app.prisma.$transaction(async (tx) => {
      const existing = await tx.postLike.findUnique({
        where: {
          postId_actorHash: {
            postId: id,
            actorHash,
          },
        },
        select: { id: true },
      });

      if (shouldLike && !existing) {
        await tx.postLike.create({
          data: {
            postId: id,
            userId: user?.id || null,
            actorHash,
          },
        });
        const updatedPost = await tx.post.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        });

        return { liked: true, likeCount: updatedPost.likeCount };
      }

      if (!shouldLike && existing) {
        await tx.postLike.delete({ where: { id: existing.id } });
        await tx.post.updateMany({
          where: {
            id,
            likeCount: { gt: 0 },
          },
          data: { likeCount: { decrement: 1 } },
        });
        const updatedPost = await tx.post.findUnique({
          where: { id },
          select: { likeCount: true },
        });

        return { liked: false, likeCount: updatedPost?.likeCount ?? 0 };
      }

      return { liked: Boolean(existing), likeCount: post.likeCount };
    });

    return {
      data: {
        postId: id,
        ...result,
      },
    };
  });

  app.post('/api/v1/public/posts/id/:id/save', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = publicSaveSchema.safeParse(request.body || {});

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid save payload');
    }

    noStoreHeaders(reply);
    const post = await findPublicPostForEngagement(app, id);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    const shouldSave = body.data.saved ?? true;
    const result = await app.prisma.$transaction(async (tx) => {
      const existing = await tx.savedPost.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId: request.auth.user.id,
          },
        },
        select: { id: true },
      });

      if (shouldSave && !existing) {
        await tx.savedPost.create({
          data: {
            postId: id,
            userId: request.auth.user.id,
          },
        });
        const updatedPost = await tx.post.update({
          where: { id },
          data: { saveCount: { increment: 1 } },
          select: { saveCount: true },
        });

        return { saved: true, saveCount: updatedPost.saveCount };
      }

      if (!shouldSave && existing) {
        await tx.savedPost.delete({ where: { id: existing.id } });
        await tx.post.updateMany({
          where: {
            id,
            saveCount: { gt: 0 },
          },
          data: { saveCount: { decrement: 1 } },
        });
        const updatedPost = await tx.post.findUnique({
          where: { id },
          select: { saveCount: true },
        });

        return { saved: false, saveCount: updatedPost?.saveCount ?? 0 };
      }

      return { saved: Boolean(existing), saveCount: post.saveCount };
    });

    return {
      data: {
        postId: id,
        ...result,
      },
    };
  });

  app.post('/api/v1/public/posts/id/:id/share', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = publicShareSchema.safeParse(request.body || {});

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid share payload');
    }

    noStoreHeaders(reply);
    const post = await findPublicPostForEngagement(app, id);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    const user = await getOptionalPublicUser(app, request);
    const visitorId = ensurePublicVisitor(request, reply);
    const actorHash = engagementActorHash({ app, user, visitorId });
    const result = await app.prisma.$transaction(async (tx) => {
      await tx.postShare.create({
        data: {
          postId: id,
          userId: user?.id || null,
          actorHash,
          channel: body.data.channel,
        },
      });
      const updatedPost = await tx.post.update({
        where: { id },
        data: { shareCount: { increment: 1 } },
        select: { shareCount: true },
      });

      return { shareCount: updatedPost.shareCount };
    });

    return {
      data: {
        postId: id,
        channel: body.data.channel,
        ...result,
      },
    };
  });

  app.post('/api/v1/public/posts/id/:id/comments', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = publicCommentSchema.safeParse(request.body || {});

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid comment payload');
    }

    noStoreHeaders(reply);
    const post = await findPublicPostForEngagement(app, id);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    if (body.data.parentId) {
      const parentComment = await app.prisma.comment.findFirst({
        where: {
          id: body.data.parentId,
          postId: id,
          status: 'APPROVED',
        },
        select: { id: true },
      });

      if (!parentComment) {
        throw app.httpErrors.badRequest('Invalid parent comment');
      }
    }

    const user = await getOptionalPublicUser(app, request);
    const { ipHash, userAgentHash } = requestHashMeta(request);
    const comment = await app.prisma.comment.create({
      data: {
        postId: id,
        userId: user?.id || null,
        parentId: body.data.parentId || null,
        authorName: user?.displayName || body.data.authorName || 'Visitante',
        authorEmail: user?.email || body.data.authorEmail || null,
        body: body.data.body,
        status: 'PENDING',
        ipHash,
        userAgentHash,
      },
      select: {
        id: true,
        authorName: true,
        body: true,
        status: true,
        createdAt: true,
      },
    });

    reply.code(201);

    return {
      data: {
        comment: {
          id: comment.id,
          user: comment.authorName || 'Visitante',
          text: comment.body,
          status: comment.status,
          date: comment.createdAt,
        },
        moderation: {
          status: 'PENDING',
          message: 'Comentario recibido y pendiente de moderacion.',
        },
      },
    };
  });

  app.get('/api/v1/public/pages/:slug', async (request, reply) => {
    const { slug } = slugParamSchema.parse(request.params);

    const page = await app.prisma.page.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!page) {
      throw app.httpErrors.notFound('Page not found');
    }

    publicCacheHeaders(reply, 180);

    return {
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        contentHtml: rewriteLegacyMediaHtml(app.config, page.contentHtml),
        contentText: page.contentText,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
        canonicalPath: page.legacyUrl || `/${page.slug}/`,
        author: page.author
          ? {
              id: page.author.id,
              username: page.author.username,
              displayName: page.author.displayName,
            }
          : null,
      },
    };
  });

  app.get('/api/v1/public/pages/id/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    const page = await app.prisma.page.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!page) {
      throw app.httpErrors.notFound('Page not found');
    }

    publicCacheHeaders(reply, 180);

    return {
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        contentHtml: rewriteLegacyMediaHtml(app.config, page.contentHtml),
        contentText: page.contentText,
        publishedAt: page.publishedAt,
        updatedAt: page.updatedAt,
        canonicalPath: page.legacyUrl || `/${page.slug}/`,
        author: page.author
          ? {
              id: page.author.id,
              username: page.author.username,
              displayName: page.author.displayName,
            }
          : null,
      },
    };
  });

  app.get('/api/v1/public/authors/id/:id', async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    const query = paginationSchema.safeParse(request.query);

    if (!params.success || !query.success) {
      throw app.httpErrors.badRequest('Invalid author archive query');
    }

    const { id } = params.data;
    const { page, limit } = query.data;

    const author = await app.prisma.user.findFirst({
      where: {
        id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        legacyAuthorSlug: true,
        legacyAuthorUrl: true,
        profile: {
          select: {
            bio: true,
            websiteUrl: true,
          },
        },
        avatarMedia: {
          select: {
            id: true,
            url: true,
            altText: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!author) {
      throw app.httpErrors.notFound('Author not found');
    }

    const where = {
      authorId: id,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };
    const [posts, totalPosts] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: publicPostAuthorSelect,
          },
          featuredMedia: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
      app.prisma.post.count({ where }),
    ]);
    const totalPages = ensurePublicPageInRange(app, {
      page,
      total: totalPosts,
      limit,
      resourceName: 'Author archive',
    });

    publicCacheHeaders(reply, 180);

    return {
      data: normalizePublicAuthor(author, posts, totalPosts, app.config),
      meta: {
        page,
        limit,
        total: totalPosts,
        totalPages,
      },
    };
  });

  app.get('/api/v1/public/products/id/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    const product = await app.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        featuredMedia: true,
      },
    });

    if (!product) {
      throw app.httpErrors.notFound('Product not found');
    }

    publicCacheHeaders(reply, 300);

    return {
      data: normalizePublicProduct(product, app.config),
    };
  });

  app.get('/api/v1/public/web-stories/id/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    const story = await app.prisma.webStory.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        featuredMedia: true,
      },
    });

    if (!story) {
      throw app.httpErrors.notFound('Web story not found');
    }

    publicCacheHeaders(reply, 300);

    return {
      data: normalizePublicWebStory(story, app.config),
    };
  });

  app.get('/api/v1/public/route', async (request, reply) => {
    const parsed = routeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid route query');
    }

    const normalizedPath = normalizeRoutePath(parsed.data.path);

    if (!normalizedPath) {
      throw app.httpErrors.badRequest('Invalid public route path');
    }

    const route = await app.prisma.route.findUnique({
      where: { path: normalizedPath },
      include: {
        canonicalRoute: {
          select: {
            path: true,
          },
        },
        seoMetadata: true,
      },
    });

    if (!route || route.status === 'REDIRECTED') {
      const redirect = await findActiveRedirect(app, request, normalizedPath);

      if (redirect) {
        publicCacheHeaders(reply, 120);
        return { data: redirect };
      }

      throw app.httpErrors.notFound('Route not found');
    }

    publicCacheHeaders(reply, 120);

    return {
      data: {
        id: route.id,
        path: route.path,
        canonicalPath: route.canonicalRoute?.path || canonicalPathFromUrl(route.seoMetadata?.canonicalUrl) || route.path,
        entityType: route.entityType,
        entityId: route.entityId,
        status: route.status,
        httpStatus: route.httpStatus,
        lastmodAt: route.lastmodAt,
        seo: normalizePublicSeoMetadata(app.config, route.seoMetadata),
      },
    };
  });

  app.get('/api/v1/public/site-summary', async (_request, reply) => {
    publicCacheHeaders(reply, 60);

    const [posts, pages, routes, categories, tags, latestImportRun, recentPosts] = await Promise.all([
      app.prisma.post.count({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' } }),
      app.prisma.page.count({ where: { status: 'PUBLISHED' } }),
      app.prisma.route.count({ where: { status: 'ACTIVE' } }),
      app.prisma.category.count(),
      app.prisma.tag.count(),
      app.prisma.importRun.findFirst({
        where: { source: 'wordpress-core' },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          source: true,
          startedAt: true,
          finishedAt: true,
          status: true,
          stats: true,
        },
      }),
      app.prisma.post.findMany({
        where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          featuredMedia: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
    ]);

    return {
      data: {
        counts: {
          posts,
          pages,
          routes,
          categories,
          tags,
        },
        latestImportRun,
        recentPosts: recentPosts.map((post) => normalizePublicPost(post, { config: app.config })),
      },
    };
  });

  app.get('/api/v1/public/system-stats', async (_request, reply) => {
    publicCacheHeaders(reply, Number(app.config?.PUBLIC_STATS_CACHE_SECONDS || 900));

    const data = await systemStatsProvider.get();

    return { data };
  });

  app.get('/api/v1/public/sitemap-routes', async (_request, reply) => {
    publicCacheHeaders(reply, 300);

    const routes = await app.prisma.route.findMany({
      where: {
        status: 'ACTIVE',
        httpStatus: 200,
        includeInSitemap: true,
        canonicalRouteId: null,
        OR: [
          {
            seoMetadata: {
              is: null,
            },
          },
          {
            seoMetadata: {
              is: {
                robotsIndex: 'INDEX',
              },
            },
          },
        ],
        path: {
          notIn: SITEMAP_EXCLUDED_PATHS,
        },
        NOT: SITEMAP_EXCLUDED_PREFIXES.map((prefix) => ({
          path: {
            startsWith: prefix,
          },
        })),
      },
      orderBy: [{ lastmodAt: 'desc' }, { path: 'asc' }],
      select: {
        path: true,
        lastmodAt: true,
        changefreq: true,
        priority: true,
      },
    });

    return { data: routes.filter((route) => isSitemapRouteAllowed(route.path)) };
  });
}
