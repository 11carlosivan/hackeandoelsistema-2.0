import {
  authorPagePayloadFixture,
  categoryPagePayloadFixture,
  homePayloadFixture,
  postSummaryFixture,
  seoFixture,
} from './public-content.fixtures';

function routePayloadFromResolvedRoute(resolvedRoute) {
  return {
    path: resolvedRoute.path,
    entityType: resolvedRoute.entityType,
    entityId: resolvedRoute.entityId ?? null,
    status: resolvedRoute.status,
    httpStatus: resolvedRoute.httpStatus,
    canonicalUrl: resolvedRoute.seo?.canonicalUrl ?? null,
    includeInSitemap: Boolean(resolvedRoute.includeInSitemap),
    lastmodAt: resolvedRoute.lastmodAt ?? null,
  };
}

function seoPayloadFromResolvedRoute(resolvedRoute) {
  return {
    title: resolvedRoute.seo?.title ?? seoFixture.title,
    description: resolvedRoute.seo?.description ?? seoFixture.description,
    canonicalUrl: resolvedRoute.seo?.canonicalUrl ?? `https://hackeandoelsistema.net${resolvedRoute.path}`,
    robotsIndex: resolvedRoute.seo?.robotsIndex ?? 'NOINDEX',
    robotsFollow: resolvedRoute.seo?.robotsFollow ?? 'NOFOLLOW',
    ogTitle: resolvedRoute.seo?.ogTitle ?? null,
    ogDescription: resolvedRoute.seo?.ogDescription ?? null,
    ogImageUrl: resolvedRoute.seo?.ogImageUrl ?? null,
    twitterCard: resolvedRoute.seo?.twitterCard ?? 'summary_large_image',
    schemaJson: resolvedRoute.seo?.schemaJson ?? null,
  };
}

export function buildHomePayload(resolvedRoute) {
  return {
    ...homePayloadFixture,
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
  };
}

function categorySlugFromPath(path) {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? categoryPagePayloadFixture.category.slug;
}

export function buildCategoryPagePayload(resolvedRoute) {
  const slug = categorySlugFromPath(resolvedRoute.path);
  const category = {
    ...categoryPagePayloadFixture.category,
    id: resolvedRoute.entityId ?? categoryPagePayloadFixture.category.id,
    name: resolvedRoute.entity?.title ?? categoryPagePayloadFixture.category.name,
    slug,
    url: resolvedRoute.path,
    description: resolvedRoute.entity?.description ?? categoryPagePayloadFixture.category.description,
  };
  const filteredPosts = homePayloadFixture.latestPosts.filter((post) => post.primaryCategory?.slug === slug);
  const posts = filteredPosts.length > 0 ? filteredPosts : categoryPagePayloadFixture.posts;

  return {
    ...categoryPagePayloadFixture,
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
    category,
    posts,
  };
}

export function buildAuthorPagePayload(resolvedRoute) {
  return {
    ...authorPagePayloadFixture,
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
  };
}

export function buildPostDetailPayload(resolvedRoute) {
  return {
    ...postSummaryFixture,
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
    contentHtml: `<p>${resolvedRoute.entity?.content ?? ''}</p>`,
    contentText: resolvedRoute.entity?.content ?? '',
    categories: postSummaryFixture.primaryCategory ? [postSummaryFixture.primaryCategory] : [],
    tags: [],
    relatedPosts: [],
    previousPost: null,
    nextPost: null,
  };
}

export function buildPagePayload(resolvedRoute) {
  return {
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
    title: resolvedRoute.entity?.title ?? resolvedRoute.path,
    contentHtml: `<p>${resolvedRoute.entity?.content ?? ''}</p>`,
  };
}

export function buildPayloadForResolvedRoute(resolvedRoute) {
  if (resolvedRoute.entityType === 'HOME') {
    return buildHomePayload(resolvedRoute);
  }

  if (resolvedRoute.entityType === 'CATEGORY') {
    return buildCategoryPagePayload(resolvedRoute);
  }

  if (resolvedRoute.entityType === 'AUTHOR') {
    return buildAuthorPagePayload(resolvedRoute);
  }

  if (resolvedRoute.entityType === 'POST') {
    return buildPostDetailPayload(resolvedRoute);
  }

  if (resolvedRoute.entityType === 'PAGE') {
    return buildPagePayload(resolvedRoute);
  }

  return {
    route: routePayloadFromResolvedRoute(resolvedRoute),
    seo: seoPayloadFromResolvedRoute(resolvedRoute),
  };
}

export { routePayloadFromResolvedRoute, seoPayloadFromResolvedRoute };
