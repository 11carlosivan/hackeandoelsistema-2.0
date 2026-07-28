import { z } from 'zod';
import { publicCacheHeaders } from '../utils/http.js';

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
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://hackeandoelsistema.net').replace(/\/+$/g, '');

let lastScheduledPublishCheckAt = 0;
let scheduledPublishInFlight = null;

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
      const prodSite = new URL('https://hackeandoelsistema.net');

      if (url.origin !== site.origin && url.origin !== prodSite.origin) {
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
    const prodSite = new URL('https://hackeandoelsistema.net');

    const isSameSite = url.origin === site.origin || url.origin === prodSite.origin;

    return isSameSite ? normalizeRoutePath(url.pathname) : url.href;
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

function normalizePublicPost(post, options = {}) {
  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;
  const canonicalPath = canonicalPathForPost(post, options.route);

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
    featuredMedia: post.featuredMedia
      ? {
          id: post.featuredMedia.id,
          url: post.featuredMedia.url,
          altText: post.featuredMedia.altText,
          width: post.featuredMedia.width,
          height: post.featuredMedia.height,
        }
      : null,
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

function normalizePublicAuthor(author, posts = [], totalPosts = 0) {
  return {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    legacyAuthorSlug: author.legacyAuthorSlug,
    legacyAuthorUrl: author.legacyAuthorUrl,
    canonicalPath: author.legacyAuthorUrl || (author.legacyAuthorSlug ? `/author/${author.legacyAuthorSlug}/` : null),
    bio: author.profile?.bio || null,
    websiteUrl: author.profile?.websiteUrl || null,
    avatar: author.avatarMedia
      ? {
          id: author.avatarMedia.id,
          url: author.avatarMedia.url,
          altText: author.avatarMedia.altText,
          width: author.avatarMedia.width,
          height: author.avatarMedia.height,
        }
      : null,
    stats: {
      posts: totalPosts,
    },
    posts: posts.map(normalizePublicPost),
  };
}

function normalizePublicProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    shortDescription: product.shortDescription,
    priceAmount: product.priceAmount,
    currency: product.currency,
    canonicalPath: product.legacyUrl || `/producto/${product.slug}/`,
    featuredMedia: product.featuredMedia
      ? {
          id: product.featuredMedia.id,
          url: product.featuredMedia.url,
          altText: product.featuredMedia.altText,
          width: product.featuredMedia.width,
          height: product.featuredMedia.height,
        }
      : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function normalizePublicWebStory(story) {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    contentJson: story.contentJson,
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
    featuredMedia: story.featuredMedia
      ? {
          id: story.featuredMedia.id,
          url: story.featuredMedia.url,
          altText: story.featuredMedia.altText,
          width: story.featuredMedia.width,
          height: story.featuredMedia.height,
        }
      : null,
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
        posts: items.map(normalizePublicPost),
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
        posts: items.map(normalizePublicPost),
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
        posts: items.map(normalizePublicPost),
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
      data: items.map(normalizePublicPost),
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
        ...normalizePublicPost(post, { route }),
        contentHtml: post.contentHtml,
        contentJson: post.contentJson,
        relatedPosts: relatedPosts.map(normalizePublicPost),
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
        ...normalizePublicPost(post, { route }),
        contentHtml: post.contentHtml,
        contentJson: post.contentJson,
        relatedPosts: relatedPosts.map(normalizePublicPost),
        comments: (post.comments || []).map(normalizePublicComment),
        tags: post.tags.map((item) => ({
          id: item.tag.id,
          name: item.tag.name,
          slug: item.tag.slug,
        })),
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
        contentHtml: page.contentHtml,
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
        contentHtml: page.contentHtml,
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
      data: normalizePublicAuthor(author, posts, totalPosts),
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
      data: normalizePublicProduct(product),
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
      data: normalizePublicWebStory(story),
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
        seo: route.seoMetadata,
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
        recentPosts: recentPosts.map(normalizePublicPost),
      },
    };
  });

  app.get('/api/v1/public/sitemap-routes', async (_request, reply) => {
    publicCacheHeaders(reply, 300);

    const routes = await app.prisma.route.findMany({
      where: {
        status: 'ACTIVE',
        httpStatus: 200,
        includeInSitemap: true,
        canonicalRouteId: null,
        entityType: {
          notIn: ['CATEGORY', 'TAG'],
        },
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
