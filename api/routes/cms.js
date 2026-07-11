import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { noStoreHeaders } from '../utils/http.js';

const postsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(120).optional(),
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
    .optional(),
});
const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  action: z.string().trim().min(1).max(160).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
});
const postParamsSchema = z.object({
  id: z.uuid(),
});
const postCreateSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z.string().trim().min(3).max(280).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  contentText: z.string().trim().max(50000).nullable().optional(),
  postType: z.enum(['NEWS', 'OPINION', 'SPONSORED', 'EXTERNAL_SUBMISSION', 'PAGE_ARTICLE']).default('NEWS'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).default('PUBLIC'),
});
const postUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    excerpt: z.string().trim().max(500).nullable().optional(),
    contentText: z.string().trim().max(50000).nullable().optional(),
    postType: z.enum(['NEWS', 'OPINION', 'SPONSORED', 'EXTERNAL_SUBMISSION', 'PAGE_ARTICLE']).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one post field is required',
  });
const workflowSchema = z.object({
  action: z.enum(['SUBMIT_REVIEW', 'RETURN_TO_DRAFT', 'PUBLISH', 'ARCHIVE']),
});
const seoUpdateSchema = z
  .object({
    title: z.string().trim().max(255).nullable().optional(),
    description: z.string().trim().max(320).nullable().optional(),
    canonicalUrl: z.string().trim().url().max(500).nullable().optional(),
    robotsIndex: z.enum(['INDEX', 'NOINDEX']).optional(),
    robotsFollow: z.enum(['FOLLOW', 'NOFOLLOW']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one SEO field is required',
  });
const EDITABLE_CONTENT_STATUSES = new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']);
const workflowTransitions = {
  SUBMIT_REVIEW: new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']),
  RETURN_TO_DRAFT: new Set(['PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED']),
  PUBLISH: new Set(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'SCHEDULED']),
  ARCHIVE: new Set(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'SCHEDULED', 'PUBLISHED']),
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(value) {
  const paragraphs = String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('\n');
}

async function createUniqueSlug(prisma, value) {
  const base = slugify(value) || `borrador-${Date.now()}`;

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const path = `/${slug}/`;
    const [existingPost, existingRoute] = await Promise.all([
      prisma.post.findUnique({ where: { slug }, select: { id: true } }),
      prisma.route.findUnique({ where: { path }, select: { id: true } }),
    ]);

    if (!existingPost && !existingRoute) {
      return slug;
    }
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

function normalizeCmsPost(post) {
  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    status: post.status,
    visibility: post.visibility,
    postType: post.postType,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount,
    commentCount: post.commentCount,
    canonicalPath: post.legacyUrl || `/${post.slug}/`,
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
  };
}

function normalizePostDetail(post, route, importMapping) {
  return {
    ...normalizeCmsPost(post),
    legacyWordpressId: post.legacyWordpressId,
    legacyUrl: post.legacyUrl,
    legacyGuid: post.legacyGuid,
    readingTimeMinutes: post.readingTimeMinutes,
    submittedAt: post.submittedAt,
    reviewedAt: post.reviewedAt,
    scheduledAt: post.scheduledAt,
    createdAt: post.createdAt,
    contentHtml: post.contentHtml,
    contentText: post.contentText,
    author: post.author,
    reviewedBy: post.reviewedBy,
    featuredMedia: post.featuredMedia,
    categories: post.categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
      fullPath: item.category.fullPath,
      isPrimary: item.isPrimary,
    })),
    tags: post.tags.map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      slug: item.tag.slug,
    })),
    route: route
      ? {
          id: route.id,
          path: route.path,
          status: route.status,
          httpStatus: route.httpStatus,
          includeInSitemap: route.includeInSitemap,
          changefreq: route.changefreq,
          priority: route.priority,
          lastmodAt: route.lastmodAt,
          canonicalPath: route.canonicalRoute?.path || route.path,
          seo: route.seoMetadata,
        }
      : null,
    importMapping,
  };
}

export async function registerCmsRoutes(app) {
  app.get('/api/v1/cms/summary', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    noStoreHeaders(reply);

    const now = new Date();
    const [
      posts,
      publishedPosts,
      draftPosts,
      pendingPosts,
      scheduledPosts,
      pages,
      routes,
      redirects,
      categories,
      tags,
      activeUsers,
      activeSessions,
      pendingComments,
      mediaAssets,
      latestImportRun,
      recentPosts,
      securityEvents,
    ] = await Promise.all([
      app.prisma.post.count(),
      app.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      app.prisma.post.count({ where: { status: 'DRAFT' } }),
      app.prisma.post.count({ where: { status: 'PENDING_REVIEW' } }),
      app.prisma.post.count({ where: { status: 'SCHEDULED' } }),
      app.prisma.page.count(),
      app.prisma.route.count({ where: { status: 'ACTIVE' } }),
      app.prisma.redirect.count({ where: { isActive: true } }),
      app.prisma.category.count(),
      app.prisma.tag.count(),
      app.prisma.user.count({ where: { status: 'ACTIVE' } }),
      app.prisma.userSession.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
      app.prisma.comment.count({ where: { status: 'PENDING' } }),
      app.prisma.mediaAsset.count(),
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
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
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
      app.prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          eventType: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: {
        viewer: request.auth.safeUser,
        counts: {
          posts,
          pages,
          routes,
          redirects,
          categories,
          tags,
          users: activeUsers,
          sessions: activeSessions,
          commentsPending: pendingComments,
          mediaAssets,
        },
        editorial: {
          published: publishedPosts,
          drafts: draftPosts,
          pendingReview: pendingPosts,
          scheduled: scheduledPosts,
        },
        latestImportRun,
        recentPosts: recentPosts.map(normalizeCmsPost),
        securityEvents,
      },
    };
  });

  app.get('/api/v1/cms/audit-logs', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = auditLogsQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS audit logs query');
    }

    noStoreHeaders(reply);

    const { page, limit, action, entityType } = parsed.data;
    const where = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
    };
    const [items, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      app.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          action: action || null,
          entityType: entityType || null,
        },
      },
    };
  });

  app.get('/api/v1/cms/posts', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = postsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS posts query');
    }

    noStoreHeaders(reply);

    const { page, limit, q, status } = parsed.data;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { excerpt: { contains: q, mode: 'insensitive' } },
              { contentText: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.post.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
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
      data: items.map(normalizeCmsPost),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          q: q || null,
          status: status || null,
        },
      },
    };
  });

  app.post('/api/v1/cms/posts', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const parsed = postCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS post create payload');
    }

    noStoreHeaders(reply);

    const input = parsed.data;
    const slug = await createUniqueSlug(app.prisma, input.slug || input.title);
    const path = `/${slug}/`;
    const contentHtml = textToHtml(input.contentText);

    const result = await app.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: request.auth.user.id,
          title: input.title,
          slug,
          excerpt: input.excerpt || null,
          contentText: input.contentText || null,
          contentHtml,
          status: 'DRAFT',
          visibility: input.visibility,
          postType: input.postType,
        },
      });
      const route = await tx.route.create({
        data: {
          path,
          entityType: 'POST',
          entityId: post.id,
          status: 'GONE',
          httpStatus: 404,
          includeInSitemap: false,
          changefreq: 'weekly',
          priority: 0.5,
        },
      });
      const seo = await tx.seoMetadata.create({
        data: {
          routeId: route.id,
          title: input.title,
          description: input.excerpt || null,
          robotsIndex: 'NOINDEX',
          robotsFollow: 'FOLLOW',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'POST_DRAFT_CREATED',
          entityType: 'POST',
          entityId: post.id,
          metadata: {
            routeId: route.id,
            path,
          },
        },
      });

      return { post, route, seo };
    });

    reply.code(201);
    return {
      data: {
        post: {
          ...normalizeCmsPost({
            ...result.post,
            author: request.auth.safeUser,
            categories: [],
          }),
          route: {
            path: result.route.path,
            status: result.route.status,
            includeInSitemap: result.route.includeInSitemap,
            seo: result.seo,
          },
        },
      },
    };
  });

  app.patch('/api/v1/cms/posts/:id', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const params = postParamsSchema.safeParse(request.params);
    const body = postUpdateSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS post update payload');
    }

    noStoreHeaders(reply);

    const { id } = params.data;
    const existingPost = await app.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingPost) {
      throw app.httpErrors.notFound('CMS post not found');
    }

    if (!EDITABLE_CONTENT_STATUSES.has(existingPost.status)) {
      throw app.httpErrors.conflict('Only draft-like posts can be edited from this endpoint');
    }

    const data = {
      ...body.data,
      ...(Object.hasOwn(body.data, 'contentText') ? { contentHtml: textToHtml(body.data.contentText) } : {}),
    };
    const post = await app.prisma.post.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
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
    });

    await app.prisma.auditLog.create({
      data: {
        actorId: request.auth.user.id,
        action: 'POST_CONTENT_UPDATED',
        entityType: 'POST',
        entityId: id,
        metadata: {
          fields: Object.keys(body.data),
        },
      },
    });

    return {
      data: {
        post: normalizeCmsPost(post),
      },
    };
  });

  app.patch(
    '/api/v1/cms/posts/:id/workflow',
    { preHandler: app.requirePermission('posts:manage') },
    async (request, reply) => {
      const params = postParamsSchema.safeParse(request.params);
      const body = workflowSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw app.httpErrors.badRequest('Invalid CMS workflow payload');
      }

      noStoreHeaders(reply);

      const { id } = params.data;
      const { action } = body.data;
      const existingPost = await app.prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          publishedAt: true,
        },
      });

      if (!existingPost) {
        throw app.httpErrors.notFound('CMS post not found');
      }

      if (!workflowTransitions[action].has(existingPost.status)) {
        throw app.httpErrors.conflict(`Cannot apply ${action} from ${existingPost.status}`);
      }

      const now = new Date();
      const postDataByAction = {
        SUBMIT_REVIEW: {
          status: 'PENDING_REVIEW',
          submittedAt: now,
        },
        RETURN_TO_DRAFT: {
          status: 'DRAFT',
        },
        PUBLISH: {
          status: 'PUBLISHED',
          publishedAt: existingPost.publishedAt || now,
          publishedGmtAt: existingPost.publishedAt || now,
        },
        ARCHIVE: {
          status: 'ARCHIVED',
        },
      };
      const routeDataByAction = {
        SUBMIT_REVIEW: {},
        RETURN_TO_DRAFT: {},
        PUBLISH: {
          status: 'ACTIVE',
          httpStatus: 200,
          includeInSitemap: true,
          lastmodAt: now,
        },
        ARCHIVE: {
          status: 'GONE',
          httpStatus: 410,
          includeInSitemap: false,
          lastmodAt: now,
        },
      };
      const seoDataByAction = {
        SUBMIT_REVIEW: {},
        RETURN_TO_DRAFT: {},
        PUBLISH: {
          robotsIndex: 'INDEX',
          robotsFollow: 'FOLLOW',
        },
        ARCHIVE: {
          robotsIndex: 'NOINDEX',
          robotsFollow: 'NOFOLLOW',
        },
      };

      const result = await app.prisma.$transaction(async (tx) => {
        const post = await tx.post.update({
          where: { id },
          data: postDataByAction[action],
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
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
        });
        const route = await tx.route.findFirst({
          where: {
            entityType: 'POST',
            entityId: id,
          },
          select: {
            id: true,
          },
        });
        let updatedRoute = null;
        let updatedSeo = null;

        if (route && Object.keys(routeDataByAction[action]).length > 0) {
          updatedRoute = await tx.route.update({
            where: { id: route.id },
            data: routeDataByAction[action],
          });
        }

        if (route && Object.keys(seoDataByAction[action]).length > 0) {
          updatedSeo = await tx.seoMetadata.upsert({
            where: { routeId: route.id },
            create: {
              routeId: route.id,
              ...seoDataByAction[action],
            },
            update: seoDataByAction[action],
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: request.auth.user.id,
            action: `POST_${action}`,
            entityType: 'POST',
            entityId: id,
            metadata: {
              from: existingPost.status,
              to: post.status,
              routeId: route?.id || null,
            },
          },
        });

        return { post, route: updatedRoute, seo: updatedSeo };
      });

      return {
        data: {
          post: normalizeCmsPost(result.post),
          route: result.route,
          seo: result.seo,
        },
      };
    },
  );

  app.get('/api/v1/cms/posts/:id', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = postParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS post id');
    }

    noStoreHeaders(reply);

    const { id } = parsed.data;
    const [post, route, importMapping] = await Promise.all([
      app.prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              status: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
          featuredMedia: {
            select: {
              id: true,
              url: true,
              originalUrl: true,
              mimeType: true,
              fileName: true,
              width: true,
              height: true,
              altText: true,
              caption: true,
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
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      app.prisma.route.findFirst({
        where: {
          entityType: 'POST',
          entityId: id,
        },
        include: {
          canonicalRoute: {
            select: {
              path: true,
            },
          },
          seoMetadata: {
            include: {
              ogImage: {
                select: {
                  id: true,
                  url: true,
                  altText: true,
                  width: true,
                  height: true,
                },
              },
            },
          },
        },
      }),
      app.prisma.importMapping.findFirst({
        where: {
          newEntityType: 'POST',
          newEntityId: id,
        },
        select: {
          id: true,
          legacyId: true,
          legacyUrl: true,
          newUrl: true,
          checksum: true,
          createdAt: true,
        },
      }),
    ]);

    if (!post) {
      throw app.httpErrors.notFound('CMS post not found');
    }

    return { data: normalizePostDetail(post, route, importMapping) };
  });

  app.patch('/api/v1/cms/posts/:id/seo', { preHandler: app.requirePermission('seo:manage') }, async (request, reply) => {
    const params = postParamsSchema.safeParse(request.params);
    const body = seoUpdateSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS SEO update payload');
    }

    noStoreHeaders(reply);

    const { id } = params.data;
    const route = await app.prisma.route.findFirst({
      where: {
        entityType: 'POST',
        entityId: id,
      },
      select: {
        id: true,
      },
    });

    if (!route) {
      throw app.httpErrors.notFound('Post route not found');
    }

    const seo = await app.prisma.seoMetadata.upsert({
      where: {
        routeId: route.id,
      },
      create: {
        routeId: route.id,
        ...body.data,
      },
      update: body.data,
    });

    await app.prisma.auditLog.create({
      data: {
        actorId: request.auth.user.id,
        action: 'POST_SEO_UPDATED',
        entityType: 'POST',
        entityId: id,
        metadata: {
          routeId: route.id,
          fields: Object.keys(body.data),
        },
      },
    });

    return {
      data: {
        seo,
      },
    };
  });
}
