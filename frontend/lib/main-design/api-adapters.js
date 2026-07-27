const FALLBACK_IMAGE = '/isotipo.png';

function normalizePublicPath(value) {
  if (!value) {
    return null;
  }

  const path = String(value).trim();
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;

  if (withLeadingSlash === '/') {
    return '/';
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeCategoryPath(category) {
  if (category?.fullPath) {
    const cleanPath = String(category.fullPath).trim().replace(/^\/+|\/+$/g, '');
    const categoryPath = cleanPath.startsWith('category/') ? cleanPath : `category/${cleanPath}`;

    return normalizePublicPath(categoryPath);
  }

  return category?.slug ? `/category/${category.slug}/` : null;
}

export function mapApiPostToArticle(post, index = 0, options = {}) {
  const category = post.primaryCategory?.name?.toUpperCase() || 'ULTIMA HORA';
  const categoryPath = normalizeCategoryPath(post.primaryCategory);
  const canonicalPath = post.canonicalPath || `/${post.slug}/`;
  const publishedDate = post.publishedAt ? new Date(post.publishedAt) : null;
  const authorId = post.author?.id || post.author?.username || 'redaccion-hes';
  const authorPath = normalizePublicPath(
    post.author?.legacyAuthorUrl ||
      (post.author?.legacyAuthorSlug ? `/author/${post.author.legacyAuthorSlug}/` : null) ||
      (authorId ? `/perfil/${authorId}/` : null),
  );

  return {
    id: post.slug,
    slug: post.slug,
    route: canonicalPath,
    title: post.title,
    subtitle: post.excerpt || excerptFromText(post.contentText) || 'Contenido migrado desde el archivo editorial de Hackeando el Sistema.',
    category,
    categoryPath,
    tag: post.postType || 'NEWS',
    authorId,
    authorName: post.author?.displayName || 'Redaccion',
    authorPath,
    date: formatShortDate(publishedDate),
    publishedAt: post.publishedAt,
    views: formatViews(post.viewCount),
    commentCount: Number(post.commentCount ?? 0),
    likeCount: Number(post.likeCount ?? 0),
    readTime: estimateReadingTime(post.contentText || post.excerpt),
    image: post.featuredMedia?.url || FALLBACK_IMAGE,
    isHero: index === 0,
    isFeatured: index > 0 && index < 4,
    related: (post.relatedPosts || []).map((relatedPost, relatedIndex) =>
      mapApiPostToArticle(relatedPost, relatedIndex + 1),
    ),
    comments: (post.comments || []).map((comment) => ({
      id: comment.id,
      user: comment.user,
      text: comment.text,
      date: formatShortDate(comment.date ? new Date(comment.date) : null),
    })),
    contentHtml: options.includeContent ? post.contentHtml : undefined,
    content: options.includeContent ? htmlToBlocks(post.contentHtml || post.contentText || '') : undefined,
    raw: post,
  };
}

export function mapApiCategory(category) {
  return {
    id: category.slug,
    name: category.name,
    slug: category.slug,
    title: category.name?.toUpperCase() || category.slug?.toUpperCase(),
    fullPath: normalizeCategoryPath(category),
    description: category.description || `Archivo editorial de ${category.name}.`,
  };
}

export function mapApiTag(tag) {
  return {
    id: tag.slug,
    name: tag.name,
    slug: tag.slug,
    title: tag.name?.toUpperCase() || tag.slug?.toUpperCase(),
    canonicalPath: normalizePublicPath(tag.canonicalPath),
    description: tag.description || `Archivo editorial etiquetado como ${tag.name}.`,
  };
}

export function mapApiAuthorArchive(author) {
  return {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    legacyAuthorSlug: author.legacyAuthorSlug,
    legacyAuthorUrl: author.legacyAuthorUrl,
    canonicalPath: author.canonicalPath,
    bio: author.bio,
    websiteUrl: author.websiteUrl,
    avatar: author.avatar,
    stats: author.stats || { posts: 0 },
    posts: (author.posts || []).map(mapApiPostToArticle),
    raw: author,
  };
}

export function mapApiProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    shortDescription: product.shortDescription,
    priceAmount: product.priceAmount,
    currency: product.currency,
    canonicalPath: product.canonicalPath,
    image: product.featuredMedia?.url || FALLBACK_IMAGE,
    featuredMedia: product.featuredMedia,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    raw: product,
  };
}

export function mapApiWebStory(story) {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    contentJson: story.contentJson,
    canonicalPath: story.canonicalPath,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
    image: story.featuredMedia?.url || FALLBACK_IMAGE,
    featuredMedia: story.featuredMedia,
    author: story.author,
    raw: story,
  };
}

export function mapApiSummary(summary) {
  return {
    counts: summary.counts,
    viewer: summary.viewer,
    editorial: summary.editorial,
    securityEvents: summary.securityEvents || [],
    latestImportRun: summary.latestImportRun,
    recentPosts: (summary.recentPosts || []).map(mapApiPostToArticle),
  };
}

export function formatShortDate(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return 'SIN FECHA';
  }

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).replace('.', '').toUpperCase();
}

export function formatViews(value) {
  const number = Number(value ?? 0);

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return String(number);
}

export function estimateReadingTime(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));

  return `${minutes} MIN`;
}

function excerptFromText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();

  return text ? `${text.slice(0, 180)}${text.length > 180 ? '...' : ''}` : null;
}

function htmlToBlocks(html) {
  const stripped = String(html || '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return stripped
    .split(/\n+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((text) => ({ type: 'paragraph', text }));
}
