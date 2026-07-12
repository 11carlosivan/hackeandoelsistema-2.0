export function normalizePublicPath(path) {
  if (!path) return null;

  const cleanPath = String(path).trim();
  const withLeadingSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  if (withLeadingSlash === '/') {
    return withLeadingSlash;
  }

  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
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
