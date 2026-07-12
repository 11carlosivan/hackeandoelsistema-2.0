export function parseArchivePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseCategoryArchivePath(slugParts = [], searchPage) {
  const cleanParts = slugParts.map((part) => String(part || '').trim()).filter(Boolean);
  const pageMarkerIndex = cleanParts.length - 2;
  const queryPage = parseArchivePage(searchPage);

  if (pageMarkerIndex >= 0 && cleanParts[pageMarkerIndex] === 'page') {
    return {
      slugParts: cleanParts.slice(0, pageMarkerIndex),
      page: parseArchivePage(cleanParts.at(-1)),
      hasPathPagination: true,
      hasQueryPagination: false,
    };
  }

  return {
    slugParts: cleanParts,
    page: queryPage,
    hasPathPagination: false,
    hasQueryPagination: queryPage > 1,
  };
}

export function buildPaginatedArchivePath(basePath, page) {
  if (!page || page <= 1) {
    return basePath;
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${normalizedBasePath}page/${page}/`;
}

export function categoryArchiveRedirectPath({ parsed, basePath }) {
  if (parsed.hasPathPagination && parsed.page <= 1) {
    return basePath;
  }

  if (parsed.hasQueryPagination) {
    return buildPaginatedArchivePath(basePath, parsed.page);
  }

  return null;
}
