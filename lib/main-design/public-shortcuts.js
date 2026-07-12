export function normalizePublicPath(path) {
  if (!path) return null;

  const cleanPath = String(path).trim();
  const withLeadingSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function normalizeCategoryCanonicalPath(category) {
  if (category?.fullPath) {
    const cleanPath = String(category.fullPath).trim().replace(/^\/+|\/+$/g, '');
    const categoryPath = cleanPath.startsWith('category/') ? cleanPath : `category/${cleanPath}`;

    return normalizePublicPath(categoryPath);
  }

  return normalizePublicPath(
    category?.canonicalPath ||
      category?.raw?.canonicalPath ||
      (category?.slug ? `/category/${category.slug}/` : null),
  );
}

export function getArticleCanonicalPath(article) {
  return normalizePublicPath(
    article?.route ||
      article?.raw?.canonicalPath ||
      article?.canonicalPath ||
      (article?.slug ? `/${article.slug}/` : null) ||
      (article?.id ? `/${article.id}/` : null),
  );
}

export function getAuthorCanonicalPath(author) {
  return normalizePublicPath(
    author?.canonicalPath ||
      author?.raw?.canonicalPath ||
      author?.legacyAuthorUrl ||
      (author?.legacyAuthorSlug ? `/author/${author.legacyAuthorSlug}/` : null),
  );
}

export function getCategoryCanonicalPath(category) {
  return normalizeCategoryCanonicalPath(category);
}

export function shouldRedirectToCanonical(sourcePath, canonicalPath) {
  const normalizedSource = normalizePublicPath(sourcePath);
  const normalizedCanonical = normalizePublicPath(canonicalPath);

  return Boolean(normalizedCanonical && normalizedSource && normalizedSource !== normalizedCanonical);
}

export async function tryLoadArticleByIdentifier(identifier, loaders) {
  const cleanIdentifier = decodeURIComponent(String(identifier || '').trim());

  if (!cleanIdentifier) {
    return null;
  }

  const attempts = [loaders.getById, loaders.getBySlug].filter(Boolean);

  for (const load of attempts) {
    try {
      const article = await load(cleanIdentifier);

      if (article) {
        return article;
      }
    } catch {
      // Try the next resolver. A missing direct route must not break metadata.
    }
  }

  return null;
}

export async function tryLoadAuthorByIdentifier(identifier, loaders) {
  const cleanIdentifier = decodeURIComponent(String(identifier || '').trim());

  if (!cleanIdentifier || !loaders.getById) {
    return null;
  }

  try {
    return await loaders.getById(cleanIdentifier);
  } catch {
    return null;
  }
}

export async function tryLoadCategoryByIdentifier(identifier, loaders) {
  const cleanIdentifier = decodeURIComponent(String(identifier || '').trim());

  if (!cleanIdentifier || !loaders.getBySlug) {
    return null;
  }

  const slug = cleanIdentifier
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    return null;
  }

  try {
    return await loaders.getBySlug(slug);
  } catch {
    return null;
  }
}
