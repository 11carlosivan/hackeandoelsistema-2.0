import { z } from 'zod';
import { publicCacheHeaders } from '../utils/http.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
});

const routeQuerySchema = z.object({
  path: z.string().trim().min(1).max(500),
});

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
  app.get('/api/v1/public/categories', async (_request, reply) => {
    publicCacheHeaders(reply, 300);

    const categories = await app.prisma.category.findMany({
      where: { showInMenu: true },
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
    const slug = z.string().trim().min(1).max(280).parse(request.params.slug);

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

  app.get('/api/v1/public/route', async (request, reply) => {
    const parsed = routeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid route query');
    }

    const normalizedPath = parsed.data.path.startsWith('/')
      ? parsed.data.path
      : `/${parsed.data.path}`;

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
}
