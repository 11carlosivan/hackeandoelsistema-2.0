import { z } from 'zod';
import { publicCacheHeaders } from '../utils/http.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
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

const categorySlugParamSchema = z.object({
  slug: z.string().trim().min(1).max(180),
});

function normalizeRoutePath(path) {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizePublicPost(post) {
  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;

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
    canonicalPath: `/${post.slug}/`,
    author: post.author
      ? {
          id: post.author.id,
          username: post.author.username,
          displayName: post.author.displayName,
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

export async function registerPublicRoutes(app) {
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
    const query = paginationSchema.safeParse(request.query);

    if (!params.success || !query.success) {
      throw app.httpErrors.badRequest('Invalid category posts query');
    }

    const { slug } = params.data;
    const { page, limit } = query.data;
    const category = await app.prisma.category.findFirst({
      where: { slug },
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
      app.prisma.post.count({ where }),
    ]);

    return {
      data: {
        category,
        posts: items.map(normalizePublicPost),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
              { title: { contains: q, mode: 'insensitive' } },
              { excerpt: { contains: q, mode: 'insensitive' } },
              { contentText: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    publicCacheHeaders(reply, q ? 60 : 180);

    const [items, total] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
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
        },
      }),
      app.prisma.post.count({ where }),
    ]);

    return {
      data: items.map(normalizePublicPost),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    publicCacheHeaders(reply, 180);

    return {
      data: {
        ...normalizePublicPost(post),
        contentHtml: post.contentHtml,
        contentJson: post.contentJson,
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

  app.get('/api/v1/public/route', async (request, reply) => {
    const parsed = routeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid route query');
    }

    const normalizedPath = normalizeRoutePath(parsed.data.path);

    const route = await app.prisma.route.findUnique({
      where: { path: normalizedPath },
      include: {
        seoMetadata: true,
      },
    });

    if (!route) {
      const redirect = await app.prisma.redirect.findFirst({
        where: {
          sourcePath: normalizedPath,
          isActive: true,
        },
      });

      if (redirect) {
        return {
          data: {
            type: 'REDIRECT',
            statusCode: redirect.statusCode,
            targetUrl: redirect.targetUrl,
            preserveQuery: redirect.preserveQuery,
          },
        };
      }

      throw app.httpErrors.notFound('Route not found');
    }

    publicCacheHeaders(reply, 120);

    return {
      data: {
        id: route.id,
        path: route.path,
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
        includeInSitemap: true,
      },
      orderBy: [{ lastmodAt: 'desc' }, { path: 'asc' }],
      select: {
        path: true,
        lastmodAt: true,
        changefreq: true,
        priority: true,
      },
    });

    return { data: routes };
  });
}
