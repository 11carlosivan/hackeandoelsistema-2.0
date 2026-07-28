import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { removeLocalMediaFile, storeMediaUpload } from '../services/media-storage.js';
import { noStoreHeaders } from '../utils/http.js';

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_ORIGIN || 'https://hackeandoelsistema.net').replace(/\/+$/g, '');
const REDIRECT_SOURCE_RESERVED_PREFIXES = ['/api/', '/_next/', '/cms/'];

function isValidRedirectTarget(value) {
  const target = String(value || '').trim();
  const hasControlCharacter = Array.from(target).some((character) => {
    const code = character.charCodeAt(0);

    return code <= 31 || code === 127;
  });

  if (!target || hasControlCharacter || target.startsWith('//')) {
    return false;
  }

  if (target.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(target);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCanonicalUrl(value) {
  const target = String(value || '').trim();
  const hasControlCharacter = Array.from(target).some((character) => {
    const code = character.charCodeAt(0);

    return code <= 31 || code === 127;
  });

  if (!target || hasControlCharacter || target.startsWith('//')) {
    return false;
  }

  if (target.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(target);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const postsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(120).optional(),
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])
    .optional(),
});
const pagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});
const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  action: z.string().trim().min(1).max(160).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
});
const commentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'SPAM', 'TRASHED']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});
const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  q: z.string().trim().min(1).max(120).optional(),
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER']).optional(),
});
const taxonomyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().min(1).max(120).optional(),
});
const redirectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().min(1).max(160).optional(),
  isActive: z.coerce.boolean().optional(),
});
const postParamsSchema = z.object({
  id: z.uuid(),
});
const pageParamsSchema = z.object({
  id: z.uuid(),
});
const commentParamsSchema = z.object({
  id: z.uuid(),
});
const mediaParamsSchema = z.object({
  id: z.uuid(),
});
const categoryParamsSchema = z.object({
  id: z.uuid(),
});
const tagParamsSchema = z.object({
  id: z.uuid(),
});
const redirectParamsSchema = z.object({
  id: z.uuid(),
});
const commentStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SPAM', 'TRASHED']),
});
const mediaUpdateSchema = z
  .object({
    altText: z.string().trim().max(255).nullable().optional(),
    caption: z.string().trim().max(1000).nullable().optional(),
    credit: z.string().trim().max(255).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one media field is required',
  });
const mediaUploadFieldSchema = z.object({
  altText: z.string().trim().max(255).optional(),
  caption: z.string().trim().max(1000).optional(),
  credit: z.string().trim().max(255).optional(),
});
const categoryWriteSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).optional(),
  parentId: z.uuid().nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  showInMenu: z.coerce.boolean().optional(),
  showOnHome: z.coerce.boolean().optional(),
});
const tagWriteSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).optional(),
});
const redirectWriteSchema = z.object({
  sourcePath: z.string().trim().min(1).max(500),
  targetUrl: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine(isValidRedirectTarget, {
      message: 'Target URL must be a valid http(s) URL or an internal path',
    }),
  statusCode: z.coerce.number().int().refine((value) => [301, 302, 307, 308].includes(value), {
    message: 'Redirect status must be 301, 302, 307 or 308',
  }).default(301),
  preserveQuery: z.coerce.boolean().default(false),
  source: z.enum(['WORDPRESS', 'YOAST', 'MANUAL', 'IMPORTER', 'SYSTEM']).default('MANUAL'),
  isActive: z.coerce.boolean().default(true),
});
const postCreateSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z.string().trim().min(3).max(280).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  contentText: z.string().trim().max(50000).nullable().optional(),
  contentHtml: z.string().trim().max(100000).nullable().optional(),
  postType: z.enum(['NEWS', 'OPINION', 'SPONSORED', 'EXTERNAL_SUBMISSION', 'PAGE_ARTICLE']).default('NEWS'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).default('PUBLIC'),
  featuredMediaId: z.uuid().nullable().optional(),
  categoryIds: z.array(z.uuid()).max(12).default([]),
  primaryCategoryId: z.uuid().nullable().optional(),
  tagIds: z.array(z.uuid()).max(30).default([]),
  newTagNames: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
  seoTitle: z.string().trim().max(255).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
  robotsIndex: z.enum(['INDEX', 'NOINDEX']).default('NOINDEX'),
  robotsFollow: z.enum(['FOLLOW', 'NOFOLLOW']).default('FOLLOW'),
  isFeatured: z.coerce.boolean().default(false),
  isBreaking: z.coerce.boolean().default(false),
  isSponsored: z.coerce.boolean().default(false),
  scheduledAt: z.coerce.date().nullable().optional(),
});
const pageCreateSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z.string().trim().min(3).max(280).optional(),
  contentText: z.string().trim().max(50000).nullable().optional(),
});
const postUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    slug: z.string().trim().min(3).max(280).optional(),
    excerpt: z.string().trim().max(500).nullable().optional(),
    contentText: z.string().trim().max(50000).nullable().optional(),
    contentHtml: z.string().trim().max(100000).nullable().optional(),
    postType: z.enum(['NEWS', 'OPINION', 'SPONSORED', 'EXTERNAL_SUBMISSION', 'PAGE_ARTICLE']).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
    isFeatured: z.coerce.boolean().optional(),
    isBreaking: z.coerce.boolean().optional(),
    isSponsored: z.coerce.boolean().optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one post field is required',
  });
const pageUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    slug: z.string().trim().min(3).max(280).optional(),
    contentText: z.string().trim().max(50000).nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one page field is required',
  });
const postTaxonomySchema = z.object({
  categoryIds: z.array(z.uuid()).max(12).default([]),
  primaryCategoryId: z.uuid().nullable().optional(),
  tagIds: z.array(z.uuid()).max(30).default([]),
  newTagNames: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
});
const workflowSchema = z.object({
  action: z.enum(['SUBMIT_REVIEW', 'RETURN_TO_DRAFT', 'SCHEDULE', 'PUBLISH', 'ARCHIVE']),
});
const seoUpdateSchema = z
  .object({
    title: z.string().trim().max(255).nullable().optional(),
    description: z.string().trim().max(320).nullable().optional(),
    canonicalUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isValidCanonicalUrl, {
        message: 'Canonical must be a valid http(s) URL or an internal path',
      })
      .nullable()
      .optional(),
    robotsIndex: z.enum(['INDEX', 'NOINDEX']).optional(),
    robotsFollow: z.enum(['FOLLOW', 'NOFOLLOW']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one SEO field is required',
  });
const featuredMediaSchema = z.object({
  mediaId: z.uuid().nullable(),
});
const EDITABLE_CONTENT_STATUSES = new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']);
const workflowTransitions = {
  SUBMIT_REVIEW: new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']),
  RETURN_TO_DRAFT: new Set(['PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED']),
  SCHEDULE: new Set(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'REJECTED']),
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

function buildInlineTagInputs(tagNames = []) {
  const inlineTagBySlug = new Map();

  for (const name of tagNames) {
    const cleanName = String(name || '').trim();
    const slug = slugify(cleanName);

    if (cleanName && slug && !inlineTagBySlug.has(slug)) {
      inlineTagBySlug.set(slug, cleanName);
    }
  }

  return [...inlineTagBySlug].map(([slug, name]) => ({ slug, name }));
}

function normalizeRedirectPath(value) {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return '/';
  }

  let path;

  try {
    path = new URL(trimmed, PUBLIC_SITE_URL).pathname;
  } catch {
    path = trimmed.split(/[?#]/, 1)[0];
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeRedirectTarget(value) {
  const trimmed = String(value || '').trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).href;
  }

  let url;

  try {
    url = new URL(trimmed, PUBLIC_SITE_URL);
  } catch {
    return normalizeRedirectPath(trimmed);
  }

  const path = normalizeRedirectPath(url.pathname);

  return `${path}${url.search}${url.hash}`;
}

function internalRedirectPath(value) {
  if (!value || !/^https?:\/\//i.test(value)) {
    return normalizeRedirectPath(value);
  }

  try {
    const target = new URL(value);
    const site = new URL(PUBLIC_SITE_URL);
    const prodSite = new URL('https://hackeandoelsistema.net');

    if (target.origin !== site.origin && target.origin !== prodSite.origin) {
      return null;
    }

    return normalizeRedirectPath(target.pathname);
  } catch {
    return null;
  }
}

function normalizeCanonicalUrl(value) {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return `${PUBLIC_SITE_URL}${normalizeRedirectPath(trimmed)}`;
  }

  return new URL(trimmed).href;
}

async function getRedirectSourceBlocker(prisma, sourcePath) {
  if (sourcePath === '/') {
    return 'HOME';
  }

  if (REDIRECT_SOURCE_RESERVED_PREFIXES.some((prefix) => sourcePath.startsWith(prefix))) {
    return 'SYSTEM';
  }

  const route = await prisma.route.findUnique({
    where: { path: sourcePath },
    select: { id: true, status: true },
  });

  if (route && route.status !== 'REDIRECTED') {
    return 'ROUTE';
  }

  return null;
}

async function upsertSystemRedirect(prisma, sourcePath, targetUrl) {
  if (!sourcePath || !targetUrl || sourcePath === targetUrl) {
    return null;
  }

  return prisma.redirect.upsert({
    where: { sourcePath },
    create: {
      sourcePath,
      targetUrl,
      statusCode: 301,
      preserveQuery: true,
      source: 'SYSTEM',
      isActive: true,
    },
    update: {
      targetUrl,
      statusCode: 301,
      preserveQuery: true,
      source: 'SYSTEM',
      isActive: true,
    },
  });
}

async function syncCategoryDescendantPaths(prisma, { categoryId, oldFullPath, nextFullPath }) {
  if (!oldFullPath || !nextFullPath || oldFullPath === nextFullPath) {
    return;
  }

  const descendants = await prisma.category.findMany({
    where: {
      fullPath: {
        startsWith: oldFullPath,
      },
      NOT: {
        id: categoryId,
      },
    },
    select: {
      id: true,
      fullPath: true,
    },
  });

  for (const descendant of descendants) {
    if (descendant.id === categoryId) {
      continue;
    }

    if (!descendant.fullPath?.startsWith(oldFullPath)) {
      continue;
    }

    const descendantNextPath = `${nextFullPath.replace(/\/+$/g, '')}/${descendant.fullPath.slice(oldFullPath.length)}`.replace(/\/+/g, '/');

    await prisma.category.update({
      where: { id: descendant.id },
      data: { fullPath: descendantNextPath },
    });
    await prisma.route.updateMany({
      where: {
        path: descendant.fullPath,
        entityType: 'CATEGORY',
        entityId: descendant.id,
      },
      data: {
        path: descendantNextPath,
        lastmodAt: new Date(),
      },
    });
    await upsertSystemRedirect(prisma, descendant.fullPath, descendantNextPath);
  }
}

async function wouldCreateCategoryCycle(prisma, { categoryId, nextParentId }) {
  if (!nextParentId) {
    return false;
  }

  let currentParentId = nextParentId;
  const visited = new Set();

  for (let depth = 0; depth < 100 && currentParentId; depth += 1) {
    if (currentParentId === categoryId || visited.has(currentParentId)) {
      return true;
    }

    visited.add(currentParentId);

    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });

    if (!parent) {
      return false;
    }

    currentParentId = parent.parentId;
  }

  return Boolean(currentParentId);
}

async function ensureTagRoute(tx, tag) {
  return upsertTaxonomyRoute(tx, {
    entityType: 'TAG',
    entityId: tag.id,
    path: buildTagPath(tag.slug),
    name: tag.name,
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EDITORIAL_HTML_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'figure',
    'figcaption',
    'iframe',
    'picture',
    'source',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'title', 'aria-label', 'aria-describedby'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'title'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
    source: ['http', 'https'],
    iframe: ['http', 'https'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.facebook.com'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

function sanitizeEditorialHtml(value) {
  if (!value) {
    return null;
  }

  return sanitizeHtml(value, EDITORIAL_HTML_OPTIONS).trim() || null;
}

function htmlToText(value) {
  if (!value) {
    return null;
  }

  const text = sanitizeHtml(String(value), {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (textValue) => textValue.replace(/\s+/g, ' '),
  }).trim();

  return text || null;
}

function buildEditorialContent({ contentText, contentHtml }) {
  const safeHtml = contentHtml ? sanitizeEditorialHtml(contentHtml) : textToHtml(contentText);
  const safeText = contentText || htmlToText(safeHtml);

  return {
    contentHtml: safeHtml,
    contentText: safeText,
  };
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

async function createUniqueSlug(prisma, value, currentPostId = null) {
  const base = slugify(value) || `borrador-${Date.now()}`;

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const path = `/${slug}/`;
    const [existingPost, existingRoute] = await Promise.all([
      prisma.post.findUnique({ where: { slug }, select: { id: true } }),
      prisma.route.findUnique({ where: { path }, select: { id: true, entityType: true, entityId: true } }),
    ]);

    const slugBelongsToCurrentPost = existingPost?.id === currentPostId;
    const routeBelongsToCurrentPost = existingRoute?.entityType === 'POST' && existingRoute?.entityId === currentPostId;

    if ((!existingPost || slugBelongsToCurrentPost) && (!existingRoute || routeBelongsToCurrentPost)) {
      return slug;
    }
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function createUniquePageSlug(prisma, value, currentId = null) {
  const base = slugify(value) || `pagina-${Date.now()}`;

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const path = `/${slug}/`;
    const [existingPage, existingRoute] = await Promise.all([
      prisma.page.findUnique({ where: { slug }, select: { id: true } }),
      prisma.route.findUnique({ where: { path }, select: { id: true } }),
    ]);

    if ((!existingPage || existingPage.id === currentId) && !existingRoute) {
      return slug;
    }
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function createUniqueTaxonomySlug(prisma, model, value, currentId = null) {
  const base = slugify(value) || `taxonomia-${Date.now()}`;

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await prisma[model].findFirst({
      where: {
        slug,
        ...(currentId ? { NOT: { id: currentId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function buildCategoryFullPath(prisma, { slug, parentId }) {
  if (!parentId) {
    return `/category/${slug}/`;
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { fullPath: true },
  });

  if (!parent) {
    return `/category/${slug}/`;
  }

  return `${parent.fullPath.replace(/\/+$/g, '')}/${slug}/`.replace(/\/+/g, '/');
}

function buildTagPath(slug) {
  return `/tag/${slug}/`;
}

function seoTitleForTaxonomy(name, type) {
  return `${name} | ${type === 'CATEGORY' ? 'Categoria' : 'Tag'} | Hackeando el Sistema`;
}

function seoDescriptionForTaxonomy(name, description, type) {
  return description || `Archivo editorial de ${type === 'CATEGORY' ? 'la categoria' : 'la etiqueta'} ${name}.`;
}

async function upsertTaxonomyRoute(tx, { entityType, entityId, path, name, description }) {
  const route = await tx.route.upsert({
    where: { path },
    create: {
      path,
      entityType,
      entityId,
      status: 'ACTIVE',
      httpStatus: 200,
      includeInSitemap: true,
      changefreq: 'daily',
      priority: 0.7,
      lastmodAt: new Date(),
    },
    update: {
      entityType,
      entityId,
      status: 'ACTIVE',
      httpStatus: 200,
      includeInSitemap: true,
      lastmodAt: new Date(),
    },
    select: { id: true },
  });

  await tx.seoMetadata.upsert({
    where: { routeId: route.id },
    create: {
      routeId: route.id,
      title: seoTitleForTaxonomy(name, entityType),
      description: seoDescriptionForTaxonomy(name, description, entityType),
      canonicalUrl: `${PUBLIC_SITE_URL}${path}`,
      robotsIndex: 'INDEX',
      robotsFollow: 'FOLLOW',
      ogType: 'website',
    },
    update: {
      title: seoTitleForTaxonomy(name, entityType),
      description: seoDescriptionForTaxonomy(name, description, entityType),
      canonicalUrl: `${PUBLIC_SITE_URL}${path}`,
      robotsIndex: 'INDEX',
      robotsFollow: 'FOLLOW',
      ogType: 'website',
    },
  });

  return route;
}

function normalizeCmsCategory(category) {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    fullPath: category.fullPath,
    description: category.description,
    sortOrder: category.sortOrder,
    showInMenu: category.showInMenu,
    showOnHome: category.showOnHome,
    legacyWordpressId: category.legacyWordpressId,
    legacyUrl: category.legacyUrl,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: category.parent.name,
          slug: category.parent.slug,
          fullPath: category.parent.fullPath,
        }
      : null,
    usage: category._count
      ? {
          posts: category._count.posts || 0,
          children: category._count.children || 0,
        }
      : null,
  };
}

function normalizeCmsTag(tag) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    legacyWordpressId: tag.legacyWordpressId,
    legacyUrl: tag.legacyUrl,
    createdAt: tag.createdAt,
    usage: tag._count
      ? {
          posts: tag._count.posts || 0,
        }
      : null,
  };
}

function normalizeCmsRedirect(redirect) {
  return {
    id: redirect.id,
    sourcePath: redirect.sourcePath,
    targetUrl: redirect.targetUrl,
    statusCode: redirect.statusCode,
    preserveQuery: redirect.preserveQuery,
    source: redirect.source,
    isActive: redirect.isActive,
    hitCount: redirect.hitCount,
    lastHitAt: redirect.lastHitAt,
    createdAt: redirect.createdAt,
    updatedAt: redirect.updatedAt,
  };
}

function normalizeCmsPage(page, route = null, importMapping = null) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    contentHtml: page.contentHtml,
    contentText: page.contentText,
    status: page.status,
    legacyWordpressId: page.legacyWordpressId,
    legacyGuid: page.legacyGuid,
    legacyUrl: page.legacyUrl,
    legacySlug: page.legacySlug,
    publishedAt: page.publishedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    author: page.author
      ? {
          id: page.author.id,
          username: page.author.username,
          displayName: page.author.displayName,
          email: page.author.email,
        }
      : null,
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
    isFeatured: post.isFeatured,
    isBreaking: post.isBreaking,
    isSponsored: post.isSponsored,
    scheduledAt: post.scheduledAt,
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
    categories: post.categories?.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
      fullPath: item.category.fullPath,
      isPrimary: item.isPrimary,
    })) ?? [],
    tags: post.tags?.map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      slug: item.tag.slug,
    })) ?? [],
  };
}

function normalizeCmsComment(comment) {
  return {
    id: comment.id,
    body: comment.body,
    status: comment.status,
    authorName: comment.authorName,
    authorEmail: comment.authorEmail,
    legacyWordpressId: comment.legacyWordpressId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    post: comment.post
      ? {
          id: comment.post.id,
          title: comment.post.title,
          slug: comment.post.slug,
          status: comment.post.status,
        }
      : null,
    user: comment.user
      ? {
          id: comment.user.id,
          email: comment.user.email,
          username: comment.user.username,
          displayName: comment.user.displayName,
        }
      : null,
  };
}

function getMediaType(mimeType) {
  if (mimeType?.startsWith('image/')) return 'IMAGE';
  if (mimeType?.startsWith('video/')) return 'VIDEO';
  if (mimeType?.startsWith('audio/')) return 'AUDIO';
  if (
    mimeType === 'application/pdf' ||
    mimeType?.includes('word') ||
    mimeType?.includes('excel') ||
    mimeType?.includes('powerpoint') ||
    mimeType?.startsWith('text/')
  ) {
    return 'DOCUMENT';
  }

  return 'OTHER';
}

function normalizeCmsMediaAsset(media) {
  return {
    id: media.id,
    url: media.url,
    originalUrl: media.originalUrl,
    path: media.path,
    disk: media.disk,
    mimeType: media.mimeType,
    type: getMediaType(media.mimeType),
    fileName: media.fileName,
    fileSize: media.fileSize,
    width: media.width,
    height: media.height,
    altText: media.altText,
    caption: media.caption,
    credit: media.credit,
    legacyWordpressId: media.legacyWordpressId,
    legacyGuid: media.legacyGuid,
    createdAt: media.createdAt,
    uploadedBy: media.uploadedBy
      ? {
          id: media.uploadedBy.id,
          email: media.uploadedBy.email,
          username: media.uploadedBy.username,
          displayName: media.uploadedBy.displayName,
        }
      : null,
    variants: media.variants || [],
    usage: media._count
      ? {
          featuredPosts: media._count.featuredPosts || 0,
          seoMetadata: media._count.seoMetadata || 0,
          ads: media._count.ads || 0,
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

  app.get('/api/v1/cms/categories', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = taxonomyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS category query');
    }

    noStoreHeaders(reply);

    const { page, limit, q } = parsed.data;
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
            { fullPath: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      app.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { fullPath: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              fullPath: true,
            },
          },
          _count: {
            select: {
              posts: true,
              children: true,
            },
          },
        },
      }),
      app.prisma.category.count({ where }),
    ]);

    return {
      data: items.map(normalizeCmsCategory),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          q: q || null,
        },
      },
    };
  });

  app.post('/api/v1/cms/categories', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const body = categoryWriteSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid CMS category payload');
    }

    noStoreHeaders(reply);

    const slug = await createUniqueTaxonomySlug(app.prisma, 'category', body.data.slug || body.data.name);
    const fullPath = await buildCategoryFullPath(app.prisma, {
      slug,
      parentId: body.data.parentId || null,
    });

    const result = await app.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          parentId: body.data.parentId || null,
          name: body.data.name,
          slug,
          fullPath,
          description: body.data.description || null,
          sortOrder: body.data.sortOrder || 0,
          showInMenu: body.data.showInMenu || false,
          showOnHome: body.data.showOnHome || false,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              fullPath: true,
            },
          },
          _count: {
            select: {
              posts: true,
              children: true,
            },
          },
        },
      });

      await upsertTaxonomyRoute(tx, {
        entityType: 'CATEGORY',
        entityId: category.id,
        path: category.fullPath,
        name: category.name,
        description: category.description,
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'CATEGORY_CREATED',
          entityType: 'CATEGORY',
          entityId: category.id,
          metadata: {
            name: category.name,
            slug: category.slug,
            fullPath: category.fullPath,
          },
        },
      });

      return category;
    });

    reply.code(201);

    return {
      data: {
        category: normalizeCmsCategory(result),
      },
    };
  });

  app.patch('/api/v1/cms/categories/:id', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const params = categoryParamsSchema.safeParse(request.params);
    const body = categoryWriteSchema.partial().refine((value) => Object.keys(value).length > 0).safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS category update payload');
    }

    noStoreHeaders(reply);

    const existing = await app.prisma.category.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        fullPath: true,
        description: true,
        sortOrder: true,
        showInMenu: true,
        showOnHome: true,
      },
    });

    if (!existing) {
      throw app.httpErrors.notFound('CMS category not found');
    }

    if (body.data.parentId === params.data.id) {
      throw app.httpErrors.badRequest('Category cannot be its own parent');
    }

    const nextSlug = body.data.slug || (body.data.name && body.data.name !== existing.name)
      ? await createUniqueTaxonomySlug(app.prisma, 'category', body.data.slug || body.data.name, params.data.id)
      : existing.slug;
    const nextParentId = Object.hasOwn(body.data, 'parentId') ? body.data.parentId || null : existing.parentId;

    if (await wouldCreateCategoryCycle(app.prisma, { categoryId: params.data.id, nextParentId })) {
      throw app.httpErrors.badRequest('Category parent would create a hierarchy cycle');
    }

    const nextFullPath = nextSlug !== existing.slug || nextParentId !== existing.parentId
      ? await buildCategoryFullPath(app.prisma, { slug: nextSlug, parentId: nextParentId })
      : existing.fullPath;

    const result = await app.prisma.$transaction(async (tx) => {
      const category = await tx.category.update({
        where: { id: params.data.id },
        data: {
          ...(Object.hasOwn(body.data, 'parentId') ? { parentId: nextParentId } : {}),
          ...(Object.hasOwn(body.data, 'name') ? { name: body.data.name } : {}),
          slug: nextSlug,
          fullPath: nextFullPath,
          ...(Object.hasOwn(body.data, 'description') ? { description: body.data.description || null } : {}),
          ...(Object.hasOwn(body.data, 'sortOrder') ? { sortOrder: body.data.sortOrder || 0 } : {}),
          ...(Object.hasOwn(body.data, 'showInMenu') ? { showInMenu: body.data.showInMenu || false } : {}),
          ...(Object.hasOwn(body.data, 'showOnHome') ? { showOnHome: body.data.showOnHome || false } : {}),
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
              fullPath: true,
            },
          },
          _count: {
            select: {
              posts: true,
              children: true,
            },
          },
        },
      });

      if (nextFullPath !== existing.fullPath) {
        await tx.route.updateMany({
          where: {
            path: existing.fullPath,
            entityType: 'CATEGORY',
            entityId: category.id,
          },
          data: {
            path: nextFullPath,
            lastmodAt: new Date(),
          },
        });
        await upsertSystemRedirect(tx, existing.fullPath, nextFullPath);
        await syncCategoryDescendantPaths(tx, {
          categoryId: category.id,
          oldFullPath: existing.fullPath,
          nextFullPath,
        });
      }

      await upsertTaxonomyRoute(tx, {
        entityType: 'CATEGORY',
        entityId: category.id,
        path: category.fullPath,
        name: category.name,
        description: category.description,
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'CATEGORY_UPDATED',
          entityType: 'CATEGORY',
          entityId: category.id,
          metadata: {
            fields: Object.keys(body.data),
            from: existing,
          },
        },
      });

      return category;
    });

    return {
      data: {
        category: normalizeCmsCategory(result),
      },
    };
  });

  app.get('/api/v1/cms/tags', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = taxonomyQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS tag query');
    }

    noStoreHeaders(reply);

    const { page, limit, q } = parsed.data;
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      app.prisma.tag.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      }),
      app.prisma.tag.count({ where }),
    ]);

    return {
      data: items.map(normalizeCmsTag),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          q: q || null,
        },
      },
    };
  });

  app.post('/api/v1/cms/tags', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const body = tagWriteSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid CMS tag payload');
    }

    noStoreHeaders(reply);

    const slug = await createUniqueTaxonomySlug(app.prisma, 'tag', body.data.slug || body.data.name);
    const result = await app.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.create({
        data: {
          name: body.data.name,
          slug,
        },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      await upsertTaxonomyRoute(tx, {
        entityType: 'TAG',
        entityId: tag.id,
        path: buildTagPath(tag.slug),
        name: tag.name,
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'TAG_CREATED',
          entityType: 'TAG',
          entityId: tag.id,
          metadata: {
            name: tag.name,
            slug: tag.slug,
          },
        },
      });

      return tag;
    });

    reply.code(201);

    return {
      data: {
        tag: normalizeCmsTag(result),
      },
    };
  });

  app.patch('/api/v1/cms/tags/:id', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const params = tagParamsSchema.safeParse(request.params);
    const body = tagWriteSchema.partial().refine((value) => Object.keys(value).length > 0).safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS tag update payload');
    }

    noStoreHeaders(reply);

    const existing = await app.prisma.tag.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!existing) {
      throw app.httpErrors.notFound('CMS tag not found');
    }

    const nextSlug = body.data.slug || (body.data.name && body.data.name !== existing.name)
      ? await createUniqueTaxonomySlug(app.prisma, 'tag', body.data.slug || body.data.name, params.data.id)
      : existing.slug;
    const result = await app.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.update({
        where: { id: params.data.id },
        data: {
          ...(Object.hasOwn(body.data, 'name') ? { name: body.data.name } : {}),
          slug: nextSlug,
        },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (nextSlug !== existing.slug) {
        const oldPath = buildTagPath(existing.slug);
        const nextPath = buildTagPath(nextSlug);

        await tx.route.updateMany({
          where: {
            path: oldPath,
            entityType: 'TAG',
            entityId: tag.id,
          },
          data: {
            path: nextPath,
            lastmodAt: new Date(),
          },
        });
        await upsertSystemRedirect(tx, oldPath, nextPath);
      }

      await upsertTaxonomyRoute(tx, {
        entityType: 'TAG',
        entityId: tag.id,
        path: buildTagPath(tag.slug),
        name: tag.name,
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'TAG_UPDATED',
          entityType: 'TAG',
          entityId: tag.id,
          metadata: {
            fields: Object.keys(body.data),
            from: existing,
          },
        },
      });

      return tag;
    });

    return {
      data: {
        tag: normalizeCmsTag(result),
      },
    };
  });

  app.get('/api/v1/cms/redirects', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = redirectsQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS redirects query');
    }

    noStoreHeaders(reply);

    const { page, limit, q, isActive } = parsed.data;
    const where = {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(q
        ? {
            OR: [
              { sourcePath: { contains: q } },
              { targetUrl: { contains: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      app.prisma.redirect.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.redirect.count({ where }),
    ]);

    return {
      data: items.map(normalizeCmsRedirect),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          q: q || null,
          isActive: typeof isActive === 'boolean' ? isActive : null,
        },
      },
    };
  });

  app.post('/api/v1/cms/redirects', { preHandler: app.requirePermission('seo:manage') }, async (request, reply) => {
    const body = redirectWriteSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Invalid CMS redirect payload');
    }

    noStoreHeaders(reply);

    const sourcePath = normalizeRedirectPath(body.data.sourcePath);
    const targetUrl = normalizeRedirectTarget(body.data.targetUrl);
    const internalTargetPath = internalRedirectPath(targetUrl);

    if (sourcePath === targetUrl || sourcePath === internalTargetPath) {
      throw app.httpErrors.badRequest('Redirect source and target cannot be the same path');
    }

    const sourceBlocker = await getRedirectSourceBlocker(app.prisma, sourcePath);

    if (sourceBlocker === 'HOME') {
      throw app.httpErrors.badRequest('Homepage cannot be used as a redirect source');
    }

    if (sourceBlocker === 'SYSTEM') {
      throw app.httpErrors.badRequest('System paths cannot be used as redirect sources');
    }

    if (sourceBlocker === 'ROUTE') {
      throw app.httpErrors.conflict('A public route already exists for this source path');
    }

    const duplicate = await app.prisma.redirect.findUnique({
      where: { sourcePath },
      select: { id: true },
    });

    if (duplicate) {
      throw app.httpErrors.conflict('A redirect already exists for this source path');
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const redirect = await tx.redirect.create({
        data: {
          sourcePath,
          targetUrl,
          statusCode: body.data.statusCode,
          preserveQuery: body.data.preserveQuery,
          source: body.data.source,
          isActive: body.data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'REDIRECT_CREATED',
          entityType: 'REDIRECT',
          entityId: redirect.id,
          metadata: {
            sourcePath: redirect.sourcePath,
            targetUrl: redirect.targetUrl,
            statusCode: redirect.statusCode,
          },
        },
      });

      return redirect;
    });

    reply.code(201);

    return {
      data: {
        redirect: normalizeCmsRedirect(result),
      },
    };
  });

  app.patch('/api/v1/cms/redirects/:id', { preHandler: app.requirePermission('seo:manage') }, async (request, reply) => {
    const params = redirectParamsSchema.safeParse(request.params);
    const body = redirectWriteSchema.partial().refine((value) => Object.keys(value).length > 0).safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS redirect update payload');
    }

    noStoreHeaders(reply);

    const existing = await app.prisma.redirect.findUnique({
      where: { id: params.data.id },
    });

    if (!existing) {
      throw app.httpErrors.notFound('CMS redirect not found');
    }

    const nextSourcePath = Object.hasOwn(body.data, 'sourcePath')
      ? normalizeRedirectPath(body.data.sourcePath)
      : existing.sourcePath;
    const nextTargetUrl = Object.hasOwn(body.data, 'targetUrl')
      ? normalizeRedirectTarget(body.data.targetUrl)
      : existing.targetUrl;
    const internalTargetPath = internalRedirectPath(nextTargetUrl);

    if (nextSourcePath === nextTargetUrl || nextSourcePath === internalTargetPath) {
      throw app.httpErrors.badRequest('Redirect source and target cannot be the same path');
    }

    if (nextSourcePath !== existing.sourcePath) {
      const sourceBlocker = await getRedirectSourceBlocker(app.prisma, nextSourcePath);

      if (sourceBlocker === 'HOME') {
        throw app.httpErrors.badRequest('Homepage cannot be used as a redirect source');
      }

      if (sourceBlocker === 'SYSTEM') {
        throw app.httpErrors.badRequest('System paths cannot be used as redirect sources');
      }

      if (sourceBlocker === 'ROUTE') {
        throw app.httpErrors.conflict('A public route already exists for this source path');
      }

      const duplicate = await app.prisma.redirect.findUnique({
        where: { sourcePath: nextSourcePath },
        select: { id: true },
      });

      if (duplicate) {
        throw app.httpErrors.conflict('A redirect already exists for this source path');
      }
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const redirect = await tx.redirect.update({
        where: { id: params.data.id },
        data: {
          ...(Object.hasOwn(body.data, 'sourcePath') ? { sourcePath: nextSourcePath } : {}),
          ...(Object.hasOwn(body.data, 'targetUrl') ? { targetUrl: nextTargetUrl } : {}),
          ...(Object.hasOwn(body.data, 'statusCode') ? { statusCode: body.data.statusCode } : {}),
          ...(Object.hasOwn(body.data, 'preserveQuery') ? { preserveQuery: body.data.preserveQuery } : {}),
          ...(Object.hasOwn(body.data, 'source') ? { source: body.data.source } : {}),
          ...(Object.hasOwn(body.data, 'isActive') ? { isActive: body.data.isActive } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'REDIRECT_UPDATED',
          entityType: 'REDIRECT',
          entityId: redirect.id,
          metadata: {
            fields: Object.keys(body.data),
            from: existing,
          },
        },
      });

      return redirect;
    });

    return {
      data: {
        redirect: normalizeCmsRedirect(result),
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

  app.get('/api/v1/cms/comments', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = commentsQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS comments query');
    }

    noStoreHeaders(reply);

    const { page, limit, status, q } = parsed.data;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { body: { contains: q } },
              { authorName: { contains: q } },
              { authorEmail: { contains: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      app.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      app.prisma.comment.count({ where }),
    ]);

    return {
      data: items.map(normalizeCmsComment),
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

  app.patch(
    '/api/v1/cms/comments/:id/status',
    { preHandler: app.requirePermission('posts:manage') },
    async (request, reply) => {
      const params = commentParamsSchema.safeParse(request.params);
      const body = commentStatusSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw app.httpErrors.badRequest('Invalid CMS comment status payload');
      }

      noStoreHeaders(reply);

      const { id } = params.data;
      const existingComment = await app.prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          postId: true,
          status: true,
        },
      });

      if (!existingComment) {
        throw app.httpErrors.notFound('CMS comment not found');
      }

      const result = await app.prisma.$transaction(async (tx) => {
        const comment = await tx.comment.update({
          where: { id },
          data: {
            status: body.data.status,
          },
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
          },
        });
        const approvedCount = await tx.comment.count({
          where: {
            postId: existingComment.postId,
            status: 'APPROVED',
          },
        });

        await tx.post.update({
          where: {
            id: existingComment.postId,
          },
          data: {
            commentCount: approvedCount,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: request.auth.user.id,
            action: 'COMMENT_STATUS_UPDATED',
            entityType: 'COMMENT',
            entityId: id,
            metadata: {
              postId: existingComment.postId,
              from: existingComment.status,
              to: body.data.status,
            },
          },
        });

        return { comment, approvedCount };
      });

      return {
        data: {
          comment: normalizeCmsComment(result.comment),
          approvedCount: result.approvedCount,
        },
      };
    },
  );

  app.get('/api/v1/cms/media', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = mediaQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS media query');
    }

    noStoreHeaders(reply);

    const { page, limit, q, type } = parsed.data;
    const typeFilter = {
      IMAGE: { startsWith: 'image/' },
      VIDEO: { startsWith: 'video/' },
      AUDIO: { startsWith: 'audio/' },
      DOCUMENT: { in: ['application/pdf', 'text/plain'] },
      OTHER: undefined,
    };
    const where = {
      ...(type && type !== 'OTHER' ? { mimeType: typeFilter[type] } : {}),
      ...(type === 'OTHER'
        ? {
            NOT: [
              { mimeType: { startsWith: 'image/' } },
              { mimeType: { startsWith: 'video/' } },
              { mimeType: { startsWith: 'audio/' } },
              { mimeType: { in: ['application/pdf', 'text/plain'] } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { fileName: { contains: q } },
              { altText: { contains: q } },
              { caption: { contains: q } },
              { credit: { contains: q } },
              { originalUrl: { contains: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      app.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              featuredPosts: true,
              seoMetadata: true,
              ads: true,
            },
          },
        },
      }),
      app.prisma.mediaAsset.count({ where }),
    ]);

    return {
      data: items.map(normalizeCmsMediaAsset),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        filters: {
          q: q || null,
          type: type || null,
        },
      },
    };
  });

  app.post('/api/v1/cms/media', { preHandler: app.requirePermission('media:manage') }, async (request, reply) => {
    if (!request.isMultipart()) {
      throw app.httpErrors.unsupportedMediaType('Expected multipart/form-data');
    }

    noStoreHeaders(reply);

    let file = null;
    const fields = {};

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        if (file) {
          throw app.httpErrors.badRequest('Only one media file is allowed');
        }

        file = {
          filename: part.filename,
          mimetype: part.mimetype,
          buffer: await part.toBuffer(),
        };
        continue;
      }

      fields[part.fieldname] = part.value;
    }

    if (!file) {
      throw app.httpErrors.badRequest('Missing media file');
    }

    const parsedFields = mediaUploadFieldSchema.safeParse(fields);

    if (!parsedFields.success) {
      throw app.httpErrors.badRequest('Invalid media metadata');
    }

    const stored = await storeMediaUpload({
      config: app.config,
      file,
    });
    const { localFilePath, ...storedMedia } = stored;

    let result;

    try {
      result = await app.prisma.$transaction(async (tx) => {
        const media = await tx.mediaAsset.create({
          data: {
            ...storedMedia,
            uploadedById: request.auth.user.id,
            altText: parsedFields.data.altText || null,
            caption: parsedFields.data.caption || null,
            credit: parsedFields.data.credit || null,
            originalUrl: null,
            legacyWordpressId: null,
            legacyGuid: null,
            legacyMetadata: {
              source: 'cms-upload',
              originalFileName: file.filename,
            },
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
              },
            },
            variants: {
              orderBy: { variantName: 'asc' },
            },
            _count: {
              select: {
                featuredPosts: true,
                seoMetadata: true,
                ads: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: request.auth.user.id,
            action: 'MEDIA_UPLOADED',
            entityType: 'MEDIA',
            entityId: media.id,
            metadata: {
              fileName: media.fileName,
              mimeType: media.mimeType,
              fileSize: media.fileSize,
            },
          },
        });

        return media;
      });
    } catch (error) {
      await removeLocalMediaFile(localFilePath).catch((cleanupError) => {
        request.log.warn({ error: cleanupError }, 'Unable to remove orphaned media upload');
      });
      throw error;
    }

    reply.code(201);

    return {
      data: {
        media: normalizeCmsMediaAsset(result),
      },
    };
  });

  app.get('/api/v1/cms/media/:id', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = mediaParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS media id');
    }

    noStoreHeaders(reply);

    const media = await app.prisma.mediaAsset.findUnique({
      where: { id: parsed.data.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
        variants: {
          orderBy: { variantName: 'asc' },
        },
        featuredPosts: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
          take: 20,
          orderBy: { updatedAt: 'desc' },
        },
        seoMetadata: {
          select: {
            id: true,
            routeId: true,
            title: true,
          },
          take: 20,
        },
        _count: {
          select: {
            featuredPosts: true,
            seoMetadata: true,
            ads: true,
          },
        },
      },
    });

    if (!media) {
      throw app.httpErrors.notFound('CMS media not found');
    }

    return {
      data: {
        ...normalizeCmsMediaAsset(media),
        featuredPosts: media.featuredPosts,
        seoMetadata: media.seoMetadata,
      },
    };
  });

  app.patch('/api/v1/cms/media/:id', { preHandler: app.requirePermission('media:manage') }, async (request, reply) => {
    const params = mediaParamsSchema.safeParse(request.params);
    const body = mediaUpdateSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS media update payload');
    }

    noStoreHeaders(reply);

    const existingMedia = await app.prisma.mediaAsset.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        altText: true,
        caption: true,
        credit: true,
      },
    });

    if (!existingMedia) {
      throw app.httpErrors.notFound('CMS media not found');
    }

    const result = await app.prisma.$transaction(async (tx) => {
      const media = await tx.mediaAsset.update({
        where: { id: params.data.id },
        data: body.data,
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
          variants: {
            orderBy: { variantName: 'asc' },
          },
          _count: {
            select: {
              featuredPosts: true,
              seoMetadata: true,
              ads: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'MEDIA_METADATA_UPDATED',
          entityType: 'MEDIA',
          entityId: params.data.id,
          metadata: {
            fields: Object.keys(body.data),
            from: {
              altText: existingMedia.altText,
              caption: existingMedia.caption,
              credit: existingMedia.credit,
            },
          },
        },
      });

      return media;
    });

    return {
      data: {
        media: normalizeCmsMediaAsset(result),
      },
    };
  });

  app.get('/api/v1/cms/pages', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const parsed = pagesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS pages query');
    }

    noStoreHeaders(reply);

    const { page, limit, q, status } = parsed.data;
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } },
              { contentText: { contains: q } },
              { legacyUrl: { contains: q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      app.prisma.page.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      app.prisma.page.count({ where }),
    ]);

    return {
      data: items.map((item) => normalizeCmsPage(item)),
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

  app.post('/api/v1/cms/pages', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const parsed = pageCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS page create payload');
    }

    noStoreHeaders(reply);

    const input = parsed.data;
    const slug = await createUniquePageSlug(app.prisma, input.slug || input.title);
    const path = `/${slug}/`;
    const { contentHtml, contentText } = buildEditorialContent(input);

    const result = await app.prisma.$transaction(async (tx) => {
      const page = await tx.page.create({
        data: {
          authorId: request.auth.user.id,
          title: input.title,
          slug,
          contentText,
          contentHtml,
          status: 'DRAFT',
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      });
      const route = await tx.route.create({
        data: {
          path,
          entityType: 'PAGE',
          entityId: page.id,
          status: 'GONE',
          httpStatus: 404,
          includeInSitemap: false,
          changefreq: 'monthly',
          priority: 0.4,
        },
      });
      const seo = await tx.seoMetadata.create({
        data: {
          routeId: route.id,
          title: input.title,
          description: input.contentText ? String(input.contentText).slice(0, 300) : null,
          robotsIndex: 'NOINDEX',
          robotsFollow: 'FOLLOW',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'PAGE_DRAFT_CREATED',
          entityType: 'PAGE',
          entityId: page.id,
          metadata: {
            routeId: route.id,
            path,
          },
        },
      });

      return { page, route: { ...route, seoMetadata: seo } };
    });

    reply.code(201);

    return {
      data: {
        page: normalizeCmsPage(result.page, result.route),
      },
    };
  });

  app.get('/api/v1/cms/pages/:id', { preHandler: app.requirePermission('cms:read') }, async (request, reply) => {
    const params = pageParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw app.httpErrors.badRequest('Invalid CMS page id');
    }

    noStoreHeaders(reply);

    const page = await app.prisma.page.findUnique({
      where: { id: params.data.id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!page) {
      throw app.httpErrors.notFound('CMS page not found');
    }

    const [route, importMapping] = await Promise.all([
      app.prisma.route.findFirst({
        where: {
          entityType: 'PAGE',
          entityId: page.id,
        },
        include: {
          canonicalRoute: {
            select: {
              path: true,
            },
          },
          seoMetadata: true,
        },
      }),
      app.prisma.importMapping.findFirst({
        where: {
          objectType: 'PAGE',
          newEntityId: page.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: normalizeCmsPage(page, route, importMapping),
    };
  });

  app.patch('/api/v1/cms/pages/:id', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    const params = pageParamsSchema.safeParse(request.params);
    const body = pageUpdateSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      throw app.httpErrors.badRequest('Invalid CMS page update payload');
    }

    noStoreHeaders(reply);

    const existingPage = await app.prisma.page.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        title: true,
        slug: true,
        contentText: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!existingPage) {
      throw app.httpErrors.notFound('CMS page not found');
    }

    const nextSlug = Object.hasOwn(body.data, 'slug') && body.data.slug !== existingPage.slug
      ? await createUniquePageSlug(app.prisma, body.data.slug || body.data.title || existingPage.title, existingPage.id)
      : existingPage.slug;
    const nextPath = `/${nextSlug}/`;
    const nextStatus = body.data.status || existingPage.status;
    const now = new Date();
    const statusRouteData = {
      DRAFT: {
        status: 'GONE',
        httpStatus: 404,
        includeInSitemap: false,
        lastmodAt: now,
      },
      PUBLISHED: {
        status: 'ACTIVE',
        httpStatus: 200,
        includeInSitemap: true,
        lastmodAt: now,
      },
      ARCHIVED: {
        status: 'GONE',
        httpStatus: 410,
        includeInSitemap: false,
        lastmodAt: now,
      },
    };
    const statusSeoData = {
      DRAFT: {
        robotsIndex: 'NOINDEX',
        robotsFollow: 'FOLLOW',
      },
      PUBLISHED: {
        robotsIndex: 'INDEX',
        robotsFollow: 'FOLLOW',
      },
      ARCHIVED: {
        robotsIndex: 'NOINDEX',
        robotsFollow: 'NOFOLLOW',
      },
    };

    const result = await app.prisma.$transaction(async (tx) => {
      const page = await tx.page.update({
        where: { id: params.data.id },
        data: {
          ...(Object.hasOwn(body.data, 'title') ? { title: body.data.title } : {}),
          ...(nextSlug !== existingPage.slug ? { slug: nextSlug } : {}),
          ...(Object.hasOwn(body.data, 'contentText')
            ? {
                contentText: body.data.contentText || null,
                contentHtml: textToHtml(body.data.contentText),
              }
            : {}),
          ...(nextStatus !== existingPage.status ? { status: nextStatus } : {}),
          ...(nextStatus === 'PUBLISHED' && !existingPage.publishedAt ? { publishedAt: now } : {}),
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
        },
      });
      const route = await tx.route.findFirst({
        where: {
          entityType: 'PAGE',
          entityId: page.id,
        },
        select: {
          id: true,
          path: true,
        },
      });
      const oldPath = route?.path || `/${existingPage.slug}/`;
      const routeData = {
        ...statusRouteData[nextStatus],
        ...(nextSlug !== existingPage.slug ? { path: nextPath } : {}),
      };
      const updatedRoute = route
        ? await tx.route.update({
            where: { id: route.id },
            data: routeData,
          })
        : await tx.route.create({
            data: {
              path: nextPath,
              entityType: 'PAGE',
              entityId: page.id,
              changefreq: 'monthly',
              priority: 0.4,
              ...statusRouteData[nextStatus],
            },
          });

      if (nextSlug !== existingPage.slug && oldPath !== nextPath) {
        await upsertSystemRedirect(tx, oldPath, nextPath);
      }

      const seo = await tx.seoMetadata.upsert({
        where: { routeId: updatedRoute.id },
        create: {
          routeId: updatedRoute.id,
          title: page.title,
          description: page.contentText ? String(page.contentText).slice(0, 300) : null,
          ...statusSeoData[nextStatus],
        },
        update: {
          ...(Object.hasOwn(body.data, 'title') ? { title: page.title } : {}),
          ...(Object.hasOwn(body.data, 'contentText')
            ? { description: page.contentText ? String(page.contentText).slice(0, 300) : null }
            : {}),
          ...statusSeoData[nextStatus],
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: request.auth.user.id,
          action: 'PAGE_UPDATED',
          entityType: 'PAGE',
          entityId: page.id,
          metadata: {
            fields: Object.keys(body.data),
            from: existingPage,
          },
        },
      });

      return { page, route: { ...updatedRoute, seoMetadata: seo } };
    });

    return {
      data: {
        page: normalizeCmsPage(result.page, result.route),
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
              { title: { contains: q } },
              { excerpt: { contains: q } },
              { contentText: { contains: q } },
              { slug: { contains: q } },
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

  app.post('/api/v1/cms/posts', { preHandler: app.requirePermission(['posts:manage', 'posts:create']) }, async (request, reply) => {
    const parsed = postCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid CMS post create payload');
    }

    noStoreHeaders(reply);

    const input = parsed.data;
    const slug = await createUniqueSlug(app.prisma, input.slug || input.title);
    const path = `/${slug}/`;
    const { contentHtml, contentText } = buildEditorialContent(input);
    const categoryIds = [...new Set(input.categoryIds)];
    const selectedTagIds = [...new Set(input.tagIds)];
    const inlineTagInputs = buildInlineTagInputs(input.newTagNames);
    const primaryCategoryId = input.primaryCategoryId || categoryIds[0] || null;

    if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
      throw app.httpErrors.badRequest('Primary category must be included in categoryIds');
    }

    const [categories, tags, inlineExistingTags, featuredMedia] = await Promise.all([
      categoryIds.length
        ? app.prisma.category.findMany({
            where: {
              id: { in: categoryIds },
            },
            select: {
              id: true,
            },
          })
        : [],
      selectedTagIds.length
        ? app.prisma.tag.findMany({
            where: {
              id: { in: selectedTagIds },
            },
            select: {
              id: true,
            },
          })
        : [],
      inlineTagInputs.length
        ? Promise.all(
            inlineTagInputs.map((tagInput) =>
              app.prisma.tag.findFirst({
                where: {
                  slug: tagInput.slug,
                },
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              }),
            ),
          )
        : [],
      input.featuredMediaId
        ? app.prisma.mediaAsset.findUnique({
            where: {
              id: input.featuredMediaId,
            },
            select: {
              id: true,
            },
          })
        : null,
    ]);

    if (categories.length !== categoryIds.length) {
      throw app.httpErrors.badRequest('One or more categories do not exist');
    }

    if (tags.length !== selectedTagIds.length) {
      throw app.httpErrors.badRequest('One or more tags do not exist');
    }

    if (input.featuredMediaId && !featuredMedia) {
      throw app.httpErrors.badRequest('Featured media does not exist');
    }

    const existingInlineTagBySlug = new Map(
      inlineExistingTags.filter(Boolean).map((tag) => [tag.slug, tag]),
    );

    const result = await app.prisma.$transaction(async (tx) => {
      const createdInlineTags = [];

      for (const tagInput of inlineTagInputs) {
        if (!existingInlineTagBySlug.has(tagInput.slug)) {
          const tag = await tx.tag.create({
            data: {
              name: tagInput.name,
              slug: tagInput.slug,
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          await ensureTagRoute(tx, tag);
          createdInlineTags.push(tag);
        }
      }

      const finalTagIds = [
        ...selectedTagIds,
        ...inlineExistingTags.filter(Boolean).map((tag) => tag.id),
        ...createdInlineTags.map((tag) => tag.id),
      ].filter((id, index, values) => values.indexOf(id) === index);

      const post = await tx.post.create({
        data: {
          authorId: request.auth.user.id,
          featuredMediaId: input.featuredMediaId || null,
          title: input.title,
          slug,
          excerpt: input.excerpt || null,
          contentText,
          contentHtml,
          status: 'DRAFT',
          visibility: input.visibility,
          postType: input.postType,
          isFeatured: input.isFeatured,
          isBreaking: input.isBreaking,
          isSponsored: input.isSponsored || input.postType === 'SPONSORED',
          scheduledAt: input.scheduledAt || null,
        },
      });

      if (categoryIds.length > 0) {
        await tx.postCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            postId: post.id,
            categoryId,
            isPrimary: categoryId === primaryCategoryId,
          })),
          skipDuplicates: true,
        });
      }

      if (finalTagIds.length > 0) {
        await tx.postTag.createMany({
          data: finalTagIds.map((tagId) => ({
            postId: post.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

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
          title: input.seoTitle || input.title,
          description: input.seoDescription || input.excerpt || null,
          robotsIndex: input.robotsIndex,
          robotsFollow: input.robotsFollow,
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
            categoryIds,
            primaryCategoryId,
            selectedTagIds,
            inlineTagNames: inlineTagInputs.map((tag) => tag.name),
            createdInlineTagIds: createdInlineTags.map((tag) => tag.id),
            finalTagIds,
            featuredMediaId: input.featuredMediaId || null,
            seoId: seo.id,
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
          contentHtml: result.post.contentHtml,
          contentText: result.post.contentText,
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
        slug: true,
      },
    });

    if (!existingPost) {
      throw app.httpErrors.notFound('CMS post not found');
    }

    if (!EDITABLE_CONTENT_STATUSES.has(existingPost.status)) {
      throw app.httpErrors.conflict('Only draft-like posts can be edited from this endpoint');
    }

    const data = { ...body.data };

    if (Object.hasOwn(body.data, 'slug')) {
      data.slug = await createUniqueSlug(app.prisma, body.data.slug, id);
    }

    if (Object.hasOwn(body.data, 'contentText') || Object.hasOwn(body.data, 'contentHtml')) {
      const content = buildEditorialContent({
        contentText: body.data.contentText,
        contentHtml: body.data.contentHtml,
      });
      data.contentText = content.contentText;
      data.contentHtml = content.contentHtml;
    }

    const post = await app.prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
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

      if (data.slug && data.slug !== existingPost.slug) {
        await tx.route.updateMany({
          where: {
            entityType: 'POST',
            entityId: id,
          },
          data: {
            path: `/${data.slug}/`,
            lastmodAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
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

      return updatedPost;
    });

    return {
      data: {
        post: {
          ...normalizeCmsPost(post),
          contentHtml: post.contentHtml,
          contentText: post.contentText,
        },
      },
    };
  });

  app.patch(
    '/api/v1/cms/posts/:id/taxonomy',
    { preHandler: app.requirePermission('posts:manage') },
    async (request, reply) => {
      const params = postParamsSchema.safeParse(request.params);
      const body = postTaxonomySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw app.httpErrors.badRequest('Invalid CMS post taxonomy payload');
      }

      noStoreHeaders(reply);

      const { id } = params.data;
      const categoryIds = [...new Set(body.data.categoryIds)];
      const tagIds = [...new Set(body.data.tagIds)];
      const inlineTagInputs = buildInlineTagInputs(body.data.newTagNames);
      const primaryCategoryId = body.data.primaryCategoryId || categoryIds[0] || null;

      if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
        throw app.httpErrors.badRequest('Primary category must be included in categoryIds');
      }

      const existingPost = await app.prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
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
      });

      if (!existingPost) {
        throw app.httpErrors.notFound('CMS post not found');
      }

      const [categories, tags, inlineExistingTags] = await Promise.all([
        categoryIds.length
          ? app.prisma.category.findMany({
              where: {
                id: { in: categoryIds },
              },
              select: {
                id: true,
              },
            })
          : [],
        tagIds.length
          ? app.prisma.tag.findMany({
              where: {
                id: { in: tagIds },
              },
              select: {
                id: true,
              },
          })
          : [],
        inlineTagInputs.length
          ? Promise.all(
              inlineTagInputs.map((tagInput) =>
                app.prisma.tag.findFirst({
                  where: {
                    slug: tagInput.slug,
                  },
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                }),
              ),
            )
          : [],
      ]);

      if (categories.length !== categoryIds.length) {
        throw app.httpErrors.badRequest('One or more categories do not exist');
      }

      if (tags.length !== tagIds.length) {
        throw app.httpErrors.badRequest('One or more tags do not exist');
      }

      const existingInlineTagBySlug = new Map(
        inlineExistingTags.filter(Boolean).map((tag) => [tag.slug, tag]),
      );

      const result = await app.prisma.$transaction(async (tx) => {
        const createdInlineTags = [];

        for (const tagInput of inlineTagInputs) {
          if (!existingInlineTagBySlug.has(tagInput.slug)) {
            const tag = await tx.tag.create({
              data: {
                name: tagInput.name,
                slug: tagInput.slug,
              },
              select: {
                id: true,
                name: true,
                slug: true,
              },
            });

            await ensureTagRoute(tx, tag);
            createdInlineTags.push(tag);
          }
        }

        const finalTagIds = [
          ...tagIds,
          ...inlineExistingTags.filter(Boolean).map((tag) => tag.id),
          ...createdInlineTags.map((tag) => tag.id),
        ].filter((tagId, index, values) => values.indexOf(tagId) === index);

        await tx.postCategory.deleteMany({
          where: { postId: id },
        });
        await tx.postTag.deleteMany({
          where: { postId: id },
        });

        if (categoryIds.length > 0) {
          await tx.postCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              postId: id,
              categoryId,
              isPrimary: categoryId === primaryCategoryId,
            })),
            skipDuplicates: true,
          });
        }

        if (finalTagIds.length > 0) {
          await tx.postTag.createMany({
            data: finalTagIds.map((tagId) => ({
              postId: id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: request.auth.user.id,
            action: 'POST_TAXONOMY_UPDATED',
            entityType: 'POST',
            entityId: id,
            metadata: {
              from: {
                categoryIds: existingPost.categories.map((item) => item.category.id),
                primaryCategoryId: existingPost.categories.find((item) => item.isPrimary)?.category.id || null,
                tagIds: existingPost.tags.map((item) => item.tag.id),
              },
              to: {
                categoryIds,
                primaryCategoryId,
                tagIds: finalTagIds,
                inlineTagNames: inlineTagInputs.map((tag) => tag.name),
                createdInlineTagIds: createdInlineTags.map((tag) => tag.id),
              },
            },
          },
        });

        return tx.post.findUnique({
          where: { id },
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
        });
      });

      return {
        data: {
          post: normalizeCmsPost(result),
        },
      };
    },
  );

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
          visibility: true,
          publishedAt: true,
          scheduledAt: true,
        },
      });

      if (!existingPost) {
        throw app.httpErrors.notFound('CMS post not found');
      }

      if (!workflowTransitions[action].has(existingPost.status)) {
        throw app.httpErrors.conflict(`Cannot apply ${action} from ${existingPost.status}`);
      }

      const now = new Date();
      const hasFutureSchedule = existingPost.scheduledAt && existingPost.scheduledAt > now;
      const shouldSchedule = action === 'SCHEDULE' || (action === 'PUBLISH' && hasFutureSchedule);
      const isPubliclyVisible = existingPost.visibility === 'PUBLIC';

      if (action === 'SCHEDULE' && !hasFutureSchedule) {
        throw app.httpErrors.badRequest('A future scheduledAt date is required before scheduling a post');
      }

      const postDataByAction = {
        SUBMIT_REVIEW: {
          status: 'PENDING_REVIEW',
          submittedAt: now,
        },
        RETURN_TO_DRAFT: {
          status: 'DRAFT',
        },
        SCHEDULE: {
          status: 'SCHEDULED',
        },
        PUBLISH: {
          status: shouldSchedule ? 'SCHEDULED' : 'PUBLISHED',
          ...(shouldSchedule
            ? {}
            : {
                publishedAt: existingPost.publishedAt || now,
                publishedGmtAt: existingPost.publishedAt || now,
              }),
        },
        ARCHIVE: {
          status: 'ARCHIVED',
        },
      };
      const routeDataByAction = {
        SUBMIT_REVIEW: {},
        RETURN_TO_DRAFT: {},
        SCHEDULE: {
          status: isPubliclyVisible ? 'ACTIVE' : 'GONE',
          httpStatus: isPubliclyVisible ? 200 : 404,
          includeInSitemap: false,
          lastmodAt: now,
        },
        PUBLISH: {
          status: isPubliclyVisible ? 'ACTIVE' : 'GONE',
          httpStatus: isPubliclyVisible ? 200 : 404,
          includeInSitemap: isPubliclyVisible && !shouldSchedule,
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
        SCHEDULE: {
          robotsIndex: 'NOINDEX',
          robotsFollow: 'FOLLOW',
        },
        PUBLISH: {
          robotsIndex: isPubliclyVisible && !shouldSchedule ? 'INDEX' : 'NOINDEX',
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
              scheduledAt: existingPost.scheduledAt,
              shouldSchedule,
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

  app.patch(
    '/api/v1/cms/posts/:id/featured-media',
    { preHandler: app.requirePermission('posts:manage') },
    async (request, reply) => {
      const params = postParamsSchema.safeParse(request.params);
      const body = featuredMediaSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw app.httpErrors.badRequest('Invalid CMS featured media payload');
      }

      noStoreHeaders(reply);

      const existingPost = await app.prisma.post.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          featuredMediaId: true,
        },
      });

      if (!existingPost) {
        throw app.httpErrors.notFound('CMS post not found');
      }

      if (body.data.mediaId) {
        const media = await app.prisma.mediaAsset.findUnique({
          where: { id: body.data.mediaId },
          select: {
            id: true,
            mimeType: true,
          },
        });

        if (!media) {
          throw app.httpErrors.notFound('CMS media not found');
        }

        if (!media.mimeType.startsWith('image/')) {
          throw app.httpErrors.badRequest('Featured media must be an image');
        }
      }

      const result = await app.prisma.$transaction(async (tx) => {
        const post = await tx.post.update({
          where: { id: params.data.id },
          data: {
            featuredMediaId: body.data.mediaId,
          },
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
                originalUrl: true,
                mimeType: true,
                fileName: true,
                width: true,
                height: true,
                altText: true,
                caption: true,
                credit: true,
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

        await tx.auditLog.create({
          data: {
            actorId: request.auth.user.id,
            action: 'POST_FEATURED_MEDIA_UPDATED',
            entityType: 'POST',
            entityId: params.data.id,
            metadata: {
              from: existingPost.featuredMediaId,
              to: body.data.mediaId,
            },
          },
        });

        return post;
      });

      return {
        data: {
          post: normalizeCmsPost(result),
          featuredMedia: result.featuredMedia,
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

    const seoData = {
      ...body.data,
      ...(Object.hasOwn(body.data, 'canonicalUrl')
        ? { canonicalUrl: body.data.canonicalUrl ? normalizeCanonicalUrl(body.data.canonicalUrl) : null }
        : {}),
    };

    const seo = await app.prisma.seoMetadata.upsert({
      where: {
        routeId: route.id,
      },
      create: {
        routeId: route.id,
        ...seoData,
      },
      update: seoData,
    });

    await app.prisma.auditLog.create({
      data: {
        actorId: request.auth.user.id,
        action: 'POST_SEO_UPDATED',
        entityType: 'POST',
        entityId: id,
        metadata: {
          routeId: route.id,
          fields: Object.keys(seoData),
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
