import { z } from 'zod';
import { AUTH_COOKIE_NAMES, resolveAvatarUrl, verifyAccessToken } from '../services/auth.js';
import { ensureFeaturedMediaFromPostContent } from '../services/featured-media.js';
import { randomToken, sha256Hex } from '../utils/crypto.js';
import { noStoreHeaders, publicCacheHeaders } from '../utils/http.js';
import { createSystemStatsProvider } from '../services/public-system-stats.js';
import { notifyCommentFollowers, notifyCommunityPostFollowers, notifyCommunityComment } from '../services/notifications.js';

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
  id: z.string().trim().min(1).max(280),
});
const publicCommentSchema = z.object({
  body: z.string().trim().min(3).max(2000),
  parentId: z.string().trim().min(1).max(280).nullable().optional(),
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
const POST_VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;
const AUTOMATED_VIEW_UA_RE = /\b(bot|crawler|spider|crawling|preview|facebookexternalhit|facebot|whatsapp|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|pinterest|googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|bingpreview|duckduckbot|yandexbot|applebot|ahrefsbot|semrushbot|mj12bot|bytespider|petalbot|claudebot|gptbot|curl|wget|python-requests)\b/i;
const WP_UPLOADS_PREFIX = '/wp-content/uploads/';
const INTERNAL_POST_LINK_EXCLUDED_SEGMENTS = new Set([
  'author',
  'category',
  'tag',
  'wp-admin',
  'wp-content',
  'wp-json',
  'feed',
  'page',
  'shop',
  'product',
  'product-category',
]);

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

function recentPostViewWhere({ postId, user, visitorHash, ipHash, userAgentHash, viewedAfter }) {
  if (!postId) {
    return null;
  }

  if (user?.id) {
    return {
      postId,
      userId: user.id,
      viewedAt: {
        gte: viewedAfter,
      },
    };
  }

  if (visitorHash && userAgentHash) {
    return {
      postId,
      ipHash: visitorHash,
      userAgentHash,
      viewedAt: {
        gte: viewedAfter,
      },
    };
  }

  if (ipHash && userAgentHash) {
    return {
      postId,
      ipHash,
      userAgentHash,
      viewedAt: {
        gte: viewedAfter,
      },
    };
  }

  return null;
}

function isAutomatedViewRequest(request) {
  const userAgent = String(request.headers['user-agent'] || '').trim();
  const purpose = String(request.headers.purpose || request.headers['sec-purpose'] || '').toLowerCase();
  const fetchMode = String(request.headers['sec-fetch-mode'] || '').toLowerCase();
  const fetchDest = String(request.headers['sec-fetch-dest'] || '').toLowerCase();

  return !userAgent ||
    AUTOMATED_VIEW_UA_RE.test(userAgent) ||
    purpose.includes('prefetch') ||
    fetchMode === 'prefetch' ||
    fetchDest === 'empty' && purpose.includes('preview');
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
      title: true,
      slug: true,
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
        featuredMediaId: true,
        title: true,
        contentHtml: true,
        scheduledAt: true,
      },
    });
    for (const post of duePosts) {
      if (post.visibility !== 'PUBLIC' || post.featuredMediaId) {
        continue;
      }

      try {
        const fallbackMediaId = await ensureFeaturedMediaFromPostContent(app.prisma, post, {
          siteUrl: app.config.WEB_ORIGIN,
          config: app.config,
          log: app.log,
          allowExternalImport: false,
        });

        if (fallbackMediaId) {
          post.featuredMediaId = fallbackMediaId;
        }
      } catch (error) {
        app.log.warn({ error, postId: post.id }, 'Unable to promote content image before scheduled publish');
      }
    }

    const publishablePosts = duePosts.filter((post) => post.visibility !== 'PUBLIC' || post.featuredMediaId);
    const blockedPublicPosts = duePosts.filter((post) => post.visibility === 'PUBLIC' && !post.featuredMediaId);
    const postIds = publishablePosts.map((post) => post.id).filter(Boolean);
    const blockedPublicPostIds = blockedPublicPosts.map((post) => post.id).filter(Boolean);
    const publicPostIds = duePosts
      .filter((post) => post.visibility === 'PUBLIC' && post.featuredMediaId)
      .map((post) => post.id)
      .filter(Boolean);

    if (blockedPublicPostIds.length > 0) {
      app.log.warn(
        { postIds: blockedPublicPostIds },
        'Moved scheduled public posts without featured media back to draft',
      );

      await app.prisma.post.updateMany({
        where: {
          id: { in: blockedPublicPostIds },
          status: 'SCHEDULED',
        },
        data: {
          status: 'DRAFT',
          scheduledAt: null,
        },
      });

      await app.prisma.route.updateMany({
        where: {
          entityType: 'POST',
          entityId: { in: blockedPublicPostIds },
        },
        data: {
          status: 'GONE',
          httpStatus: 404,
          includeInSitemap: false,
          lastmodAt: now,
        },
      });

      if (typeof app.prisma.auditLog?.createMany === 'function') {
        await app.prisma.auditLog.createMany({
          data: blockedPublicPosts.map((post) => ({
            action: 'POST_SCHEDULE_REMOVED_MISSING_COVER',
            entityType: 'POST',
            entityId: post.id,
            metadata: {
              reason: 'missing_featured_media',
              scheduledAt: post.scheduledAt,
            },
          })),
        });
      }
    }

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

function rewriteLegacyMediaUrl(config, value) {
  if (!value || !config?.LEGACY_MEDIA_BASE_URL) {
    return value;
  }

  try {
    const legacyBase = new URL(config.LEGACY_MEDIA_BASE_URL.replace(/\/+$/g, ''));
    const url = String(value).startsWith('/')
      ? new URL(String(value), legacyBase.origin)
      : new URL(String(value));

    if (!url.pathname.startsWith(WP_UPLOADS_PREFIX)) {
      return value;
    }

    const basePath = legacyBase.pathname.replace(/\/+$/g, '');
    const legacyUploadBasePath = basePath.endsWith('/wp-content/uploads') || basePath.endsWith('/uploads')
      ? basePath
      : `${basePath}${WP_UPLOADS_PREFIX.slice(0, -1)}`.replace(/\/{2,}/g, '/');
    const uploadPath = url.pathname.slice(WP_UPLOADS_PREFIX.length).replace(/^\/+/g, '');

    return `${legacyBase.origin}${legacyUploadBasePath}/${uploadPath}${url.search}`;
  } catch {
    return value;
  }
}

function isBrokenSameSiteWordpressMedia(config, value) {
  if (!value) {
    return false;
  }

  try {
    const url = String(value).startsWith('/')
      ? new URL(String(value), config?.WEB_ORIGIN || PUBLIC_SITE_URL)
      : new URL(String(value));
    const siteUrl = new URL(config?.WEB_ORIGIN || PUBLIC_SITE_URL);
    const urlHost = url.hostname.replace(/^www\./i, '').toLowerCase();
    const siteHost = siteUrl.hostname.replace(/^www\./i, '').toLowerCase();

    return urlHost === siteHost && url.pathname.startsWith(WP_UPLOADS_PREFIX);
  } catch {
    return false;
  }
}

function publicMediaUrl(config, value) {
  const rewrittenUrl = rewriteLegacyMediaUrl(config, value);

  return isBrokenSameSiteWordpressMedia(config, rewrittenUrl) ? null : rewrittenUrl;
}

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeYoutubeEmbedUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) return '';

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\/+/, '').split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
      }

      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
      }

      const id = url.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
  } catch {
    return '';
  }

  return '';
}

function youtubeEmbedHtml(value) {
  const embedUrl = normalizeYoutubeEmbedUrl(value);

  if (!embedUrl) return null;

  return `<div class="wp-block-embed-youtube"><iframe src="${escapeHtmlAttribute(embedUrl)}" title="Video de YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
}

function normalizeStandaloneYoutubeEmbeds(value) {
  return String(value || '')
    .replace(/<figure\b[^>]*class=(["'])[^"']*\bwp-block-embed\b[^"']*\1[^>]*>[\s\S]*?<div\b[^>]*class=(["'])[^"']*\bwp-block-embed__wrapper\b[^"']*\2[^>]*>([\s\S]*?)<\/div>\s*<\/figure>/gi, (match, _figureQuote, _wrapperQuote, inner) => {
      return youtubeEmbedHtml(stripHtml(inner)) || match;
    })
    .replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, _tag, _attributes, inner) => {
      const text = stripHtml(inner);

      if (!/^https?:\/\/[^\s<>"']+$/i.test(text)) {
        return match;
      }

      return youtubeEmbedHtml(text) || match;
    });
}

function rewriteLegacyMediaHtml(config, value) {
  if (!value) {
    return value;
  }

  const normalizedEmbeds = normalizeStandaloneYoutubeEmbeds(value);

  if (!config?.LEGACY_MEDIA_BASE_URL) {
    return normalizedEmbeds;
  }

  return normalizedEmbeds.replace(
    /(https?:\/\/[^"'\s)]+\/wp-content\/uploads\/[^"'\s)]+|\/wp-content\/uploads\/[^"'\s)]+)/g,
    (url) => rewriteLegacyMediaUrl(config, url),
  ).replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
    const src = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(figure);
    const imageUrl = src?.[1] || src?.[2] || src?.[3];

    return isBrokenSameSiteWordpressMedia(config, imageUrl) ? '' : figure;
  }).replace(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi, (image, doubleQuoted, singleQuoted, unquoted) => {
    const imageUrl = doubleQuoted || singleQuoted || unquoted;

    return isBrokenSameSiteWordpressMedia(config, imageUrl) ? '' : image;
  });
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

  const url = publicMediaUrl(config, media.url);
  if (!url) {
    return null;
  }

  return {
    id: media.id,
    url,
    altText: media.altText,
    width: media.width,
    height: media.height,
  };
}

function firstPublicImageFromHtml(config, html) {
  const source = String(html || '');
  const match = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(source);
  const rawUrl = match?.[1] || match?.[2] || match?.[3];

  if (!rawUrl || /^(?:data|blob|javascript):/i.test(rawUrl)) {
    return null;
  }

  const decodedUrl = rawUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const rewrittenUrl = publicMediaUrl(config, decodedUrl);

  if (rewrittenUrl && !isBrokenSameSiteWordpressMedia(config, rewrittenUrl)) {
    return rewrittenUrl;
  }

  const marker = '/wp-content/uploads/';
  const markerIndex = decodedUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const relativePath = decodedUrl.slice(markerIndex + marker.length).replace(/^\/+/g, '');

  if (!relativePath || relativePath.includes('..')) {
    return null;
  }

  const mediaBase = String(config?.MEDIA_REMOTE_PUBLIC_BASE_URL || 'https://image.hackeandoelsistema.net').replace(/\/+$/g, '');

  return `${mediaBase}/uploads/${relativePath}`;
}

function legacyFeaturedMediaFromContent(config, post) {
  const url = firstPublicImageFromHtml(config, post.contentHtml);

  if (!url) {
    return null;
  }

  return {
    id: `legacy-content:${post.id}`,
    url,
    altText: post.title,
    width: null,
    height: null,
  };
}

function normalizePublicSeoMetadata(config, seoMetadata) {
  if (!seoMetadata) {
    return seoMetadata;
  }

  return {
    ...seoMetadata,
    ogImageUrl: publicMediaUrl(config, seoMetadata.ogImageUrl),
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
    isFeatured: Boolean(post.isFeatured),
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
    categories: Array.isArray(post.categories)
      ? post.categories.map((item) => ({
          id: item.category?.id || item.id,
          name: item.category?.name || item.name,
          slug: item.category?.slug || item.slug,
          fullPath: item.category?.fullPath || item.fullPath,
          isPrimary: Boolean(item.isPrimary),
        }))
      : [],
    featuredMedia: normalizePublicMediaAsset(config, post.featuredMedia) || legacyFeaturedMediaFromContent(config, post),
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
  const avatarUrl = resolveAvatarUrl(comment.user?.profile?.avatarUrl || comment.user?.avatarMedia?.url || null);
  return {
    id: comment.id,
    userId: comment.userId || comment.user?.id || null,
    parentId: comment.parentId || null,
    user: comment.authorName || comment.user?.displayName || 'Visitante',
    avatarUrl,
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

function internalPostLinkCandidatesFromHtml(html, currentPost) {
  const candidates = [];
  const seen = new Set();
  const currentSlugs = new Set([
    currentPost?.slug,
    currentPost?.legacySlug,
    String(currentPost?.legacyUrl || '').replace(/^\/+|\/+$/g, ''),
  ].filter(Boolean));
  const siteOrigins = new Set([
    'https://hackeandoelsistema.net',
    'https://www.hackeandoelsistema.net',
    PUBLIC_SITE_URL,
  ]);
  const urlPattern = /https?:\/\/(?:www\.)?hackeandoelsistema\.net\/[^"'<>\s)]+/gi;

  for (const match of String(html || '').matchAll(urlPattern)) {
    let url;

    try {
      url = new URL(match[0]);
    } catch {
      continue;
    }

    if (!siteOrigins.has(url.origin)) {
      continue;
    }

    const segments = url.pathname.split('/').map((segment) => segment.trim()).filter(Boolean);

    if (segments.length !== 1 || INTERNAL_POST_LINK_EXCLUDED_SEGMENTS.has(segments[0])) {
      continue;
    }

    const slug = segments[0];
    const legacyUrl = `/${slug}/`;

    if (currentSlugs.has(slug) || currentSlugs.has(legacyUrl.replace(/^\/+|\/+$/g, ''))) {
      continue;
    }

    if (!seen.has(slug)) {
      seen.add(slug);
      candidates.push({ slug, legacyUrl });
    }
  }

  return candidates;
}

function sortPostsByEditorialLinks(posts, candidates) {
  const order = new Map();

  candidates.forEach((candidate, index) => {
    order.set(candidate.slug, index);
    order.set(candidate.legacyUrl, index);
  });

  return [...posts].sort((a, b) => {
    const aOrder = Math.min(
      order.get(a.slug) ?? Number.POSITIVE_INFINITY,
      order.get(a.legacySlug) ?? Number.POSITIVE_INFINITY,
      order.get(a.legacyUrl) ?? Number.POSITIVE_INFINITY,
    );
    const bOrder = Math.min(
      order.get(b.slug) ?? Number.POSITIVE_INFINITY,
      order.get(b.legacySlug) ?? Number.POSITIVE_INFINITY,
      order.get(b.legacyUrl) ?? Number.POSITIVE_INFINITY,
    );

    return aOrder - bOrder;
  });
}

async function findRelatedPosts(app, post, take = 3) {
  const embeddedCandidates = internalPostLinkCandidatesFromHtml(post.contentHtml, post).slice(0, 12);
  const embeddedRelatedPosts = embeddedCandidates.length > 0
    ? sortPostsByEditorialLinks(await app.prisma.post.findMany({
      where: {
        id: { not: post.id },
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        OR: [
          { slug: { in: embeddedCandidates.map((candidate) => candidate.slug) } },
          { legacySlug: { in: embeddedCandidates.map((candidate) => candidate.slug) } },
          { legacyUrl: { in: embeddedCandidates.map((candidate) => candidate.legacyUrl) } },
        ],
      },
      take: embeddedCandidates.length,
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
    }), embeddedCandidates).slice(0, take)
    : [];

  if (embeddedRelatedPosts.length >= take) {
    return embeddedRelatedPosts;
  }

  const primaryCategory = post.categories?.find((item) => item.isPrimary)?.category ?? post.categories?.[0]?.category;

  if (!primaryCategory?.id) {
    return embeddedRelatedPosts;
  }

  const fallbackPosts = await app.prisma.post.findMany({
    where: {
      id: { notIn: [post.id, ...embeddedRelatedPosts.map((relatedPost) => relatedPost.id)] },
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      categories: {
        some: {
          categoryId: primaryCategory.id,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: take - embeddedRelatedPosts.length,
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

  return [...embeddedRelatedPosts, ...fallbackPosts];
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
            status: { notIn: ['SPAM', 'TRASHED'] },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50,
          select: {
            id: true,
            parentId: true,
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

    noStoreHeaders(reply);
    const [relatedPosts, route] = await Promise.all([
      findRelatedPosts(app, post),
      findPublicEntityRoute(app, 'POST', post.id),
    ]);

    return {
      data: {
        ...normalizePublicPost(post, { route, config: app.config }),
        contentHtml: rewriteLegacyMediaHtml(app.config, post.contentHtml),
        contentText: post.contentText,
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
            status: { notIn: ['SPAM', 'TRASHED'] },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50,
          select: {
            id: true,
            parentId: true,
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

    noStoreHeaders(reply);
    const [relatedPosts, route] = await Promise.all([
      findRelatedPosts(app, post),
      findPublicEntityRoute(app, 'POST', post.id),
    ]);

    return {
      data: {
        ...normalizePublicPost(post, { route, config: app.config }),
        contentHtml: rewriteLegacyMediaHtml(app.config, post.contentHtml),
        contentText: post.contentText,
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
                postId: post.id,
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
                postId: post.id,
                userId: user.id,
              },
            },
            select: { id: true },
          })
        : null,
    ]);

    return {
      data: {
        postId: post.id,
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

  app.post('/api/v1/public/posts/id/:id/view', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);

    const post = await app.prisma.post.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      select: {
        id: true,
        viewCount: true,
      },
    });

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    if (isAutomatedViewRequest(request)) {
      return {
        data: {
          postId: id,
          viewCount: post.viewCount,
          counted: false,
          reason: 'automated_traffic',
        },
      };
    }

    const user = await getOptionalPublicUser(app, request);
    const visitorId = ensurePublicVisitor(request, reply);
    const { ipHash, userAgentHash } = requestHashMeta(request);
    const visitorHash = visitorId ? engagementActorHash({ app, user, visitorId }) : null;
    const storedIpHash = visitorHash || ipHash;
    const referrer = String(request.headers.referer || request.headers.referrer || '').slice(0, 768) || null;
    const viewedAfter = new Date(Date.now() - POST_VIEW_DEDUP_WINDOW_MS);

    const updatedPost = await app.prisma.$transaction(async (tx) => {
      const recentViewWhere = recentPostViewWhere({
        postId: id,
        user,
        visitorHash,
        ipHash,
        userAgentHash,
        viewedAfter,
      });

      if (
        recentViewWhere &&
        typeof tx.postView?.findFirst === 'function' &&
        await tx.postView.findFirst({ where: recentViewWhere, select: { id: true } })
      ) {
        return {
          viewCount: post.viewCount,
          counted: false,
        };
      }

      await tx.postView.create({
        data: {
          postId: id,
          userId: user?.id || null,
          ipHash: storedIpHash,
          userAgentHash,
          referrer,
          viewedAt: new Date(),
        },
      });

      const nextPost = await tx.post.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });

      return {
        viewCount: nextPost.viewCount,
        counted: true,
      };
    });

    return {
      data: {
        postId: id,
        viewCount: updatedPost.viewCount,
        counted: updatedPost.counted,
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
            postId: post.id,
            actorHash,
          },
        },
        select: { id: true },
      });

      if (shouldLike && !existing) {
        await tx.postLike.create({
          data: {
            postId: post.id,
            userId: user?.id || null,
            actorHash,
          },
        });
        const updatedPost = await tx.post.update({
          where: { id: post.id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        });

        return { liked: true, likeCount: updatedPost.likeCount };
      }

      if (!shouldLike && existing) {
        await tx.postLike.delete({ where: { id: existing.id } });
        await tx.post.updateMany({
          where: {
            id: post.id,
            likeCount: { gt: 0 },
          },
          data: { likeCount: { decrement: 1 } },
        });
        const updatedPost = await tx.post.findUnique({
          where: { id: post.id },
          select: { likeCount: true },
        });

        return { liked: false, likeCount: updatedPost?.likeCount ?? 0 };
      }

      return { liked: Boolean(existing), likeCount: post.likeCount };
    });

    return {
      data: {
        postId: post.id,
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
          postId: post.id,
          userId: user?.id || null,
          actorHash,
          channel: body.data.channel,
        },
      });
      const updatedPost = await tx.post.update({
        where: { id: post.id },
        data: { shareCount: { increment: 1 } },
        select: { shareCount: true },
      });

      return { shareCount: updatedPost.shareCount };
    });

    return {
      data: {
        postId: post.id,
        channel: body.data.channel,
        ...result,
      },
    };
  });

  app.post('/api/v1/public/posts/id/:id/comments', { preHandler: app.authenticate }, async (request, reply) => {
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
          postId: post.id,
          status: { notIn: ['SPAM', 'TRASHED'] },
        },
        select: { id: true },
      });

      if (!parentComment) {
        throw app.httpErrors.badRequest('Invalid parent comment');
      }
    }

    const { ipHash, userAgentHash } = requestHashMeta(request);
    const comment = await app.prisma.comment.create({
      data: {
        postId: post.id,
        userId: request.auth.user.id,
        parentId: body.data.parentId || null,
        authorName: request.auth.user.displayName,
        authorEmail: request.auth.user.email,
        body: body.data.body,
        status: 'PENDING',
        ipHash,
        userAgentHash,
      },
      select: {
        id: true,
        parentId: true,
        authorName: true,
        body: true,
        status: true,
        createdAt: true,
      },
    });

    if (typeof app.prisma.post?.update === 'function') {
      await app.prisma.post.update({
        where: { id: post.id },
        data: { commentCount: { increment: 1 } },
      });
    }

    notifyCommentFollowers({
      prisma: app.prisma,
      commenter: request.auth.user,
      post,
      comment,
      parentId: body.data.parentId,
    }).catch((err) => app.log.error(err));

    reply.code(201);

    return {
      data: {
        comment: {
          id: comment.id,
          parentId: comment.parentId || null,
          user: comment.authorName || 'Visitante',
          text: comment.body,
          status: comment.status,
          date: comment.createdAt,
        },
        moderation: {
          status: 'PENDING',
          message: 'Comentario recibido. Se publicará tras moderación.',
        },
      },
    };
  });

  app.get('/api/v1/public/posts/id/:id/comments', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const post = await findPublicPostForEngagement(app, id);

    if (!post) {
      throw app.httpErrors.notFound('Post not found');
    }

    noStoreHeaders(reply);
    const comments = await app.prisma.comment.findMany({
      where: {
        postId: post.id,
        status: { notIn: ['SPAM', 'TRASHED'] },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
      select: {
        id: true,
        userId: true,
        parentId: true,
        authorName: true,
        body: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarMedia: { select: { url: true } },
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    return {
      data: comments.map(normalizePublicComment),
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

  app.get('/api/v1/public/users/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);

    const targetUser = await app.prisma.user.findFirst({
      where: {
        OR: [{ id }, { username: id }],
        status: 'ACTIVE',
      },
      include: {
        profile: true,
        avatarMedia: true,
      },
    });

    if (!targetUser) {
      throw app.httpErrors.notFound('Usuario no encontrado');
    }

    const currentAuthUser = await getOptionalPublicUser(app, request);

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      app.prisma.userFollow.count({ where: { followingId: targetUser.id } }),
      app.prisma.userFollow.count({ where: { followerId: targetUser.id } }),
      currentAuthUser
        ? app.prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentAuthUser.id,
                followingId: targetUser.id,
              },
            },
          }).then(Boolean)
        : false,
    ]);

    const avatarUrl = resolveAvatarUrl(targetUser.profile?.avatarUrl || targetUser.avatarMedia?.url || null);

    return {
      data: {
        user: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          username: targetUser.username,
          bio: targetUser.profile?.bio || null,
          avatarUrl,
          websiteUrl: targetUser.profile?.websiteUrl || null,
          createdAt: targetUser.createdAt,
          followersCount,
          followingCount,
          isFollowing,
        },
      },
    };
  });

  app.post('/api/v1/public/users/:id/follow', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);
    const followerId = request.auth.user.id;

    const targetUser = await app.prisma.user.findFirst({
      where: {
        OR: [{ id }, { username: id }],
        status: 'ACTIVE',
      },
      select: { id: true, displayName: true },
    });

    if (!targetUser) {
      throw app.httpErrors.notFound('Usuario no encontrado');
    }

    if (targetUser.id === followerId) {
      throw app.httpErrors.badRequest('No puedes seguirte a ti mismo');
    }

    const followingId = targetUser.id;

    const existing = await app.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    let following = false;
    if (existing) {
      await app.prisma.userFollow.delete({
        where: { id: existing.id },
      });
      following = false;
    } else {
      await app.prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },
      });
      following = true;

      await app.prisma.inAppNotification.create({
        data: {
          userId: followingId,
          actorId: followerId,
          type: 'NEW_FOLLOWER',
          title: 'Nuevo seguidor',
          message: `${request.auth.user.displayName} ha comenzado a seguirte.`,
          isRead: false,
        },
      }).catch((err) => app.log.error(err));
    }

    const followersCount = await app.prisma.userFollow.count({
      where: { followingId },
    });

    return {
      data: {
        userId: followingId,
        following,
        followersCount,
      },
    };
  });

  app.get('/api/v1/public/users/:id/followers', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);

    const targetUser = await app.prisma.user.findFirst({
      where: { OR: [{ id }, { username: id }], status: 'ACTIVE' },
      select: { id: true },
    });
    if (!targetUser) {
      throw app.httpErrors.notFound('Usuario no encontrado');
    }

    const follows = await app.prisma.userFollow.findMany({
      where: { followingId: targetUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        follower: {
          include: { profile: true, avatarMedia: true },
        },
      },
    });

    return {
      data: {
        users: follows.map((f) => ({
          id: f.follower.id,
          displayName: f.follower.displayName,
          username: f.follower.username,
          bio: f.follower.profile?.bio || null,
          avatarUrl: resolveAvatarUrl(f.follower.profile?.avatarUrl || f.follower.avatarMedia?.url || null),
          followedAt: f.createdAt,
        })),
      },
    };
  });

  app.get('/api/v1/public/users/:id/following', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    noStoreHeaders(reply);

    const targetUser = await app.prisma.user.findFirst({
      where: { OR: [{ id }, { username: id }], status: 'ACTIVE' },
      select: { id: true },
    });
    if (!targetUser) {
      throw app.httpErrors.notFound('Usuario no encontrado');
    }

    const follows = await app.prisma.userFollow.findMany({
      where: { followerId: targetUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        following: {
          include: { profile: true, avatarMedia: true },
        },
      },
    });

    return {
      data: {
        users: follows.map((f) => ({
          id: f.following.id,
          displayName: f.following.displayName,
          username: f.following.username,
          bio: f.following.profile?.bio || null,
          avatarUrl: resolveAvatarUrl(f.following.profile?.avatarUrl || f.following.avatarMedia?.url || null),
          followedAt: f.createdAt,
        })),
      },
    };
  });

  // ==================== FEED COMUNITARIO ====================
  app.get('/api/v1/public/community/posts', async (request, reply) => {
    noStoreHeaders(reply);
    const { page, limit } = paginationSchema.parse(request.query || {});
    const skip = (page - 1) * limit;

    let currentUserId = null;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = await verifyAccessToken(app.config, authHeader.slice(7));
        const sub = decoded?.sub || decoded?.userId || null;
        if (sub && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)) {
          currentUserId = sub;
        }
      } catch {}
    }

    if (typeof app.prisma?.communityPost?.findMany !== 'function') {
      return { data: { posts: [], pagination: { page, limit, total: 0, totalPages: 0 } } };
    }

    const [posts, total] = await Promise.all([
      app.prisma.communityPost.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: { profile: true, avatarMedia: true },
          },
          poll: {
            include: { options: true },
          },
          ...(currentUserId
            ? {
                likes: { where: { userId: currentUserId }, select: { id: true } },
              }
            : {}),
        },
      }),
      app.prisma.communityPost.count(),
    ]);

    // Check mutual follows (Nucleo) if user is logged in
    let followedUserIds = new Set();
    let followerUserIds = new Set();
    if (currentUserId && typeof app.prisma?.userFollow?.findMany === 'function') {
      try {
        const [following, followers] = await Promise.all([
          app.prisma.userFollow.findMany({ where: { followerId: currentUserId }, select: { followingId: true } }),
          app.prisma.userFollow.findMany({ where: { followingId: currentUserId }, select: { followerId: true } }),
        ]);
        followedUserIds = new Set(following.map((f) => f.followingId));
        followerUserIds = new Set(followers.map((f) => f.followerId));
      } catch {}
    }

    const formattedPosts = posts.map((post) => {
      const authorId = post.user?.id || 'unknown';
      const isFollowing = followedUserIds.has(authorId);
      const isFollower = followerUserIds.has(authorId);
      const isNucleo = isFollowing && isFollower;

      let pollData = null;
      if (post.poll) {
        const totalPollVotes = post.poll.totalVotes || 0;
        pollData = {
          id: post.poll.id,
          question: post.poll.question,
          totalVotes: totalPollVotes,
          expiresAt: post.poll.expiresAt,
          isActive: post.poll.isActive,
          options: (post.poll.options || []).map((opt) => ({
            id: opt.id,
            text: opt.text,
            votesCount: opt.votesCount,
            percentage: totalPollVotes > 0 ? Math.round((opt.votesCount / totalPollVotes) * 100) : 0,
          })),
        };
      }

      return {
        id: post.id,
        content: post.content,
        mediaUrl: post.mediaUrl,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        repostsCount: post.repostsCount,
        isLiked: Array.isArray(post.likes) && post.likes.length > 0,
        createdAt: post.createdAt,
        user: {
          id: post.user?.id || 'hes',
          displayName: post.user?.displayName || 'Usuario HES',
          username: post.user?.username || 'usuario',
          avatarUrl: resolveAvatarUrl(post.user?.profile?.avatarUrl || post.user?.avatarMedia?.url || null),
          bio: post.user?.profile?.bio || null,
          isFollowing,
          isNucleo,
        },
        poll: pollData,
      };
    });

    return {
      data: {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  });

  app.post('/api/v1/public/community/posts', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const schema = z.object({
      content: z.string().trim().min(1, 'El contenido no puede estar vacío').max(250, 'El post comunitario tiene un máximo de 250 caracteres'),
      mediaUrl: z.string().trim().max(768).optional().nullable(),
      poll: z.object({
        question: z.string().trim().min(1).max(300),
        options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
        expiresDays: z.number().int().min(1).max(30).default(3),
      }).optional().nullable(),
    });

    const parsed = schema.parse(request.body);
    const userId = request.auth.user.id;

    if (typeof app.prisma?.communityPost?.create !== 'function') {
      throw app.httpErrors.serviceUnavailable('Servicio de comunidad no disponible temporalmente');
    }

    let createdPollId = null;
    let expiresAt = null;
    if (parsed.poll) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (parsed.poll.expiresDays || 3));
    }

    const newPost = await app.prisma.communityPost.create({
      data: {
        userId,
        content: parsed.content,
        mediaUrl: parsed.mediaUrl || null,
        ...(parsed.poll
          ? {
              poll: {
                create: {
                  question: parsed.poll.question,
                  createdById: userId,
                  expiresAt,
                  options: {
                    create: parsed.poll.options.map((opt) => ({
                      text: opt,
                    })),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          include: { profile: true, avatarMedia: true },
        },
        poll: {
          include: { options: true },
        },
      },
    });

    // Notify followers asynchronously
    notifyCommunityPostFollowers({
      prisma: app.prisma,
      author: request.auth.user,
      post: newPost,
    }).catch((err) => app.log.error(err));

    reply.code(201);
    return {
      data: {
        id: newPost.id,
        content: newPost.content,
        mediaUrl: newPost.mediaUrl,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        isLiked: false,
        createdAt: newPost.createdAt,
        user: {
          id: newPost.user.id,
          displayName: newPost.user.displayName,
          username: newPost.user.username,
          avatarUrl: resolveAvatarUrl(newPost.user.profile?.avatarUrl || newPost.user.avatarMedia?.url || null),
          isFollowing: false,
          isNucleo: false,
        },
        poll: newPost.poll
          ? {
              id: newPost.poll.id,
              question: newPost.poll.question,
              totalVotes: 0,
              options: newPost.poll.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
                votesCount: 0,
                percentage: 0,
              })),
            }
          : null,
      },
    };
  });

  app.patch('/api/v1/public/community/posts/:id', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const schema = z.object({
      content: z.string().trim().min(1, 'El contenido no puede estar vacío').max(250, 'El post comunitario tiene un máximo de 250 caracteres'),
      mediaUrl: z.string().trim().max(768).optional().nullable(),
    });

    const parsed = schema.parse(request.body);
    const currentUserId = request.auth.user.id;
    const userRoles = request.auth.roles || [];

    if (typeof app.prisma?.communityPost?.findUnique !== 'function') {
      throw app.httpErrors.serviceUnavailable('Servicio de comunidad no disponible temporalmente');
    }

    const existingPost = await app.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw app.httpErrors.notFound('Publicación no encontrada');
    }

    const isAuthor = existingPost.userId === currentUserId;
    const isAdmin = userRoles.some((r) => ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(String(r).toUpperCase()));
    if (!isAuthor && !isAdmin) {
      throw app.httpErrors.forbidden('No tienes permiso para editar esta publicación');
    }

    const updatedPost = await app.prisma.communityPost.update({
      where: { id },
      data: {
        content: parsed.content,
        ...(parsed.mediaUrl !== undefined ? { mediaUrl: parsed.mediaUrl } : {}),
      },
      include: {
        user: {
          include: { profile: true, avatarMedia: true },
        },
        poll: {
          include: { options: true },
        },
      },
    });

    return {
      data: {
        id: updatedPost.id,
        content: updatedPost.content,
        mediaUrl: updatedPost.mediaUrl,
        likesCount: updatedPost.likesCount,
        commentsCount: updatedPost.commentsCount,
        repostsCount: updatedPost.repostsCount,
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
        user: {
          id: updatedPost.user.id,
          displayName: updatedPost.user.displayName,
          username: updatedPost.user.username,
          avatarUrl: resolveAvatarUrl(updatedPost.user.profile?.avatarUrl || updatedPost.user.avatarMedia?.url || null),
        },
        poll: updatedPost.poll
          ? {
              id: updatedPost.poll.id,
              question: updatedPost.poll.question,
              totalVotes: updatedPost.poll.totalVotes || 0,
              options: (updatedPost.poll.options || []).map((opt) => ({
                id: opt.id,
                text: opt.text,
                votesCount: opt.votesCount,
              })),
            }
          : null,
      },
    };
  });

  app.delete('/api/v1/public/community/posts/:id', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const currentUserId = request.auth.user.id;
    const userRoles = request.auth.roles || [];

    if (typeof app.prisma?.communityPost?.findUnique !== 'function') {
      throw app.httpErrors.serviceUnavailable('Servicio de comunidad no disponible temporalmente');
    }

    const existingPost = await app.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw app.httpErrors.notFound('Publicación no encontrada');
    }

    const isAuthor = existingPost.userId === currentUserId;
    const isAdmin = userRoles.some((r) => ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(String(r).toUpperCase()));
    if (!isAuthor && !isAdmin) {
      throw app.httpErrors.forbidden('No tienes permiso para eliminar esta publicación');
    }

    await app.prisma.communityPost.delete({
      where: { id },
    });

    return {
      data: {
        id,
        deleted: true,
      },
    };
  });

  app.post('/api/v1/public/community/posts/:id/like', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const userId = request.auth.user.id;

    if (typeof app.prisma?.communityLike?.findUnique !== 'function') {
      return { data: { liked: true, likesCount: 1 } };
    }

    const existing = await app.prisma.communityLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId,
        },
      },
    });

    let liked = false;
    if (existing) {
      await app.prisma.communityLike.delete({ where: { id: existing.id } });
      await app.prisma.communityPost.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      }).catch(() => {});
      liked = false;
    } else {
      await app.prisma.communityLike.create({
        data: { postId: id, userId },
      });
      await app.prisma.communityPost.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      }).catch(() => {});
      liked = true;
    }

    const updated = await app.prisma.communityPost.findUnique({
      where: { id },
      select: { likesCount: true },
    });

    return {
      data: {
        postId: id,
        liked,
        likesCount: updated?.likesCount || 0,
      },
    };
  });

  app.post('/api/v1/public/community/posts/:id/repost', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);

    if (typeof app.prisma?.communityPost?.update !== 'function') {
      return { data: { postId: id, reposted: true, repostsCount: 1 } };
    }

    const updated = await app.prisma.communityPost.update({
      where: { id },
      data: { repostsCount: { increment: 1 } },
      select: { repostsCount: true },
    }).catch(() => null);

    return {
      data: {
        postId: id,
        reposted: true,
        repostsCount: updated?.repostsCount || 1,
      },
    };
  });

  app.get('/api/v1/public/community/posts/:id/comments', async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);

    if (typeof app.prisma?.communityComment?.findMany !== 'function') {
      return { data: { comments: [] } };
    }

    const comments = await app.prisma.communityComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: {
          include: { profile: true, avatarMedia: true },
        },
      },
    });

    return {
      data: {
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: {
            id: c.user.id,
            displayName: c.user.displayName,
            username: c.user.username,
            avatarUrl: resolveAvatarUrl(c.user.profile?.avatarUrl || c.user.avatarMedia?.url || null),
          },
        })),
      },
    };
  });

  app.post('/api/v1/public/community/posts/:id/comments', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const commentBodySchema = z.object({
      content: z.string().trim().min(1).max(500),
      parentId: z.string().uuid().optional().nullable(),
    });
    const parsedBody = commentBodySchema.parse(request.body);
    const { content } = parsedBody;
    const userId = request.auth.user.id;

    if (typeof app.prisma?.communityComment?.create !== 'function') {
      throw app.httpErrors.serviceUnavailable('Servicio temporalmente no disponible');
    }

    const comment = await app.prisma.communityComment.create({
      data: {
        postId: id,
        userId,
        content,
      },
      include: {
        user: {
          include: { profile: true, avatarMedia: true },
        },
      },
    });

    await app.prisma.communityPost.update({
      where: { id },
      data: { commentsCount: { increment: 1 } },
    }).catch(() => {});

    // Disparar notificaciones In-App y Push al autor del post y autor del comentario respondido
    const targetPost = await app.prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, userId: true },
    }).catch(() => null);

    if (targetPost) {
      notifyCommunityComment({
        prisma: app.prisma,
        commenter: {
          id: userId,
          displayName: comment.user.displayName,
        },
        post: targetPost,
        comment: {
          id: comment.id,
          content: comment.content,
        },
        parentId: parsedBody.parentId || null,
      }).catch((err) => {
        app.log.warn({ err }, 'Error in notifyCommunityComment');
      });
    }

    reply.code(201);
    return {
      data: {
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          user: {
            id: comment.user.id,
            displayName: comment.user.displayName,
            username: comment.user.username,
            avatarUrl: resolveAvatarUrl(comment.user.profile?.avatarUrl || comment.user.avatarMedia?.url || null),
          },
        },
      },
    };
  });

  app.post('/api/v1/public/community/posts/:id/report', async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const reportSchema = z.object({
      reason: z.string().trim().min(1, 'El motivo es requerido').max(100),
      details: z.string().trim().max(500).optional().nullable(),
    });
    const parsed = reportSchema.parse(request.body || {});

    const post = await app.prisma?.communityPost?.findUnique({ where: { id } }).catch(() => null);
    if (!post) {
      throw app.httpErrors.notFound('Publicación no encontrada');
    }

    request.log.warn({
      postId: id,
      authorId: post.userId,
      reason: parsed.reason,
      details: parsed.details,
      reporterIp: request.ip,
    }, '[UGC REPORT] Community post reported by user');

    return {
      success: true,
      data: {
        reported: true,
        message: 'Reporte recibido. Nuestro equipo de moderación revisará la publicación en un plazo máximo de 24 horas.',
      },
    };
  });

  app.post('/api/v1/public/users/:id/report', async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const reportSchema = z.object({
      reason: z.string().trim().min(1, 'El motivo es requerido').max(100),
      details: z.string().trim().max(500).optional().nullable(),
    });
    const parsed = reportSchema.parse(request.body || {});

    const targetUser = await app.prisma?.user?.findUnique({ where: { id } }).catch(() => null);
    if (!targetUser) {
      throw app.httpErrors.notFound('Usuario no encontrado');
    }

    request.log.warn({
      targetUserId: id,
      targetUsername: targetUser.username,
      reason: parsed.reason,
      details: parsed.details,
      reporterIp: request.ip,
    }, '[UGC REPORT] User profile reported');

    return {
      success: true,
      data: {
        reported: true,
        message: 'Reporte de usuario recibido. Procederemos con la investigación según nuestras normas de tolerancia cero.',
      },
    };
  });

  app.get('/api/v1/public/users/:id/community-posts', async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);

    let currentUserId = null;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = await verifyAccessToken(app.config, authHeader.slice(7));
        const sub = decoded?.sub || decoded?.userId || null;
        if (sub && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)) {
          currentUserId = sub;
        }
      } catch {}
    }

    if (typeof app.prisma?.communityPost?.findMany !== 'function') {
      return { data: { posts: [] } };
    }

    const posts = await app.prisma.communityPost.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          include: { profile: true, avatarMedia: true },
        },
        poll: {
          include: { options: true },
        },
        ...(currentUserId
          ? {
              likes: { where: { userId: currentUserId }, select: { id: true } },
            }
          : {}),
      },
    });

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      content: post.content,
      mediaUrl: post.mediaUrl,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      repostsCount: post.repostsCount,
      isLiked: Array.isArray(post.likes) && post.likes.length > 0,
      createdAt: post.createdAt,
      user: {
        id: post.user?.id || id,
        displayName: post.user?.displayName || 'Usuario HES',
        username: post.user?.username || 'usuario',
        avatarUrl: resolveAvatarUrl(post.user?.profile?.avatarUrl || post.user?.avatarMedia?.url || null),
        bio: post.user?.profile?.bio || null,
        isFollowing: false,
        isNucleo: false,
      },
      poll: post.poll
        ? {
            id: post.poll.id,
            question: post.poll.question,
            totalVotes: post.poll.totalVotes || 0,
            options: (post.poll.options || []).map((opt) => ({
              id: opt.id,
              text: opt.text,
              votesCount: opt.votesCount,
            })),
          }
        : null,
    }));

    return {
      data: {
        posts: formattedPosts,
      },
    };
  });

  // ==================== ENCUESTAS (POLLS) ====================
  app.get('/api/v1/public/polls', async (_request, reply) => {
    noStoreHeaders(reply);

    if (typeof app.prisma?.poll?.findMany !== 'function') {
      return {
        data: {
          polls: [
            {
              id: 'poll-editorial-1',
              question: '¿Qué opinas sobre la derogación de la protección al arroz?',
              totalVotes: 12548,
              daysRemaining: '2 días restantes',
              options: [
                { id: 'opt-1', text: 'Es un error', votesCount: 7780, percentage: 62 },
                { id: 'opt-2', text: 'Fue una decisión necesaria', votesCount: 3011, percentage: 24 },
                { id: 'opt-3', text: 'Debe revisarse', votesCount: 1255, percentage: 10 },
                { id: 'opt-4', text: 'No tengo una opinión', votesCount: 502, percentage: 4 },
              ],
            },
          ],
        },
      };
    }

    const polls = await app.prisma.poll.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        options: true,
        creator: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });

    if (polls.length === 0) {
      return {
        data: {
          polls: [
            {
              id: 'poll-editorial-default',
              question: '¿Qué opinas sobre la derogación de la protección al arroz?',
              totalVotes: 12548,
              daysRemaining: '2 días restantes',
              options: [
                { id: 'opt-1', text: 'Es un error', votesCount: 7780, percentage: 62 },
                { id: 'opt-2', text: 'Fue una decisión necesaria', votesCount: 3011, percentage: 24 },
                { id: 'opt-3', text: 'Debe revisarse', votesCount: 1255, percentage: 10 },
                { id: 'opt-4', text: 'No tengo una opinión', votesCount: 502, percentage: 4 },
              ],
            },
          ],
        },
      };
    }

    return {
      data: {
        polls: polls.map((p) => {
          const total = p.totalVotes || 0;
          return {
            id: p.id,
            question: p.question,
            totalVotes: total,
            createdAt: p.createdAt,
            creator: p.creator,
            options: p.options.map((o) => ({
              id: o.id,
              text: o.text,
              votesCount: o.votesCount,
              percentage: total > 0 ? Math.round((o.votesCount / total) * 100) : 0,
            })),
          };
        }),
      },
    };
  });

  app.post('/api/v1/public/polls/:id/vote', async (request, reply) => {
    noStoreHeaders(reply);
    const { id } = idParamSchema.parse(request.params);
    const voteSchema = z.object({
      optionId: z.string().min(1),
    });
    const { optionId } = voteSchema.parse(request.body);

    if (typeof app.prisma?.poll?.findUnique !== 'function') {
      return {
        data: {
          success: true,
          pollId: id,
          optionId,
        },
      };
    }

    const poll = await app.prisma.poll.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!poll) {
      return {
        data: { success: true, pollId: id, optionId },
      };
    }

    await Promise.all([
      app.prisma.pollOption.update({
        where: { id: optionId },
        data: { votesCount: { increment: 1 } },
      }).catch(() => {}),
      app.prisma.poll.update({
        where: { id },
        data: { totalVotes: { increment: 1 } },
      }).catch(() => {}),
    ]);

    const updatedPoll = await app.prisma.poll.findUnique({
      where: { id },
      include: { options: true },
    });
    const total = updatedPoll?.totalVotes || 1;

    return {
      data: {
        success: true,
        poll: {
          id: updatedPoll.id,
          question: updatedPoll.question,
          totalVotes: total,
          options: updatedPoll.options.map((o) => ({
            id: o.id,
            text: o.text,
            votesCount: o.votesCount,
            percentage: total > 0 ? Math.round((o.votesCount / total) * 100) : 0,
          })),
        },
      },
    };
  });

  // ==================== PUBLICIDAD NATIVA / PATROCINADOS ====================
  app.get('/api/v1/public/sponsored-posts', async (request, reply) => {
    publicCacheHeaders(reply, 60);

    if (typeof app.prisma?.sponsoredPost?.findMany !== 'function') {
      return { data: { ads: [] } };
    }

    try {
      const ads = await app.prisma.sponsoredPost.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return {
        data: {
          ads: ads.map((ad) => ({
            id: ad.id,
            sponsorName: ad.sponsorName,
            sponsorHandle: ad.sponsorHandle || null,
            sponsorLogo: ad.sponsorLogo || null,
            title: ad.title,
            content: ad.content,
            mediaUrl: ad.mediaUrl || null,
            ctaText: ad.ctaText || 'Conoce más',
            ctaUrl: ad.ctaUrl,
            placement: ad.placement || 'feed',
            likesCount: ad.likesCount || 0,
            commentsCount: 0,
            sharesCount: ad.sharesCount || 0,
            isSponsored: true,
            createdAt: ad.createdAt,
          })),
        },
      };
    } catch (err) {
      request.log?.warn?.({ err }, 'Failed to query sponsored posts');
      return { data: { ads: [] } };
    }
  });

  // ==================== BÚSQUEDA INTEGRADA Y TENDENCIAS ====================
  app.get('/api/v1/public/search/overview', async (request, reply) => {
    noStoreHeaders(reply);
    const { q } = searchSchema.parse(request.query || {});
    const queryTerm = (q || '').trim();

    const trends = [
      { id: '1', tag: 'Arroz', topic: 'Arroz', postsCount: '12.4K', category: 'Economía' },
      { id: '2', tag: 'PRM', topic: 'PRM', postsCount: '8.2K', category: 'Política' },
      { id: '3', tag: 'Haití', topic: 'Haití', postsCount: '6.1K', category: 'Internacional' },
      { id: '4', tag: 'Punta Catalina', topic: 'Punta Catalina', postsCount: '5.8K', category: 'Energía' },
      { id: '5', tag: 'Elecciones 2028', topic: 'Elecciones 2028', postsCount: '5.1K', category: 'Política' },
      { id: '6', tag: 'Ciberseguridad', topic: 'Ciberseguridad', postsCount: '3.9K', category: 'Tecnología' },
    ];

    let users = [];
    if (typeof app.prisma?.user?.findMany === 'function') {
      users = await app.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          ...(queryTerm
            ? {
                OR: [
                  { displayName: { contains: queryTerm } },
                  { username: { contains: queryTerm } },
                ],
              }
            : {}),
        },
        take: 10,
        include: { profile: true, avatarMedia: true },
      });
    }

    return {
      data: {
        trends,
        users: users.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          username: u.username,
          bio: u.profile?.bio || 'Miembro de la comunidad HES',
          avatarUrl: resolveAvatarUrl(u.profile?.avatarUrl || u.avatarMedia?.url || null),
        })),
      },
    };
  });
}
