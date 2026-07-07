/**
 * @typedef {'HOME' | 'POST' | 'PAGE' | 'CATEGORY' | 'TAG' | 'AUTHOR' | 'PRODUCT' | 'WEB_STORY' | 'SEARCH' | 'STATIC'} RouteEntityType
 * @typedef {'ACTIVE' | 'GONE' | 'REDIRECTED'} RouteStatus
 * @typedef {'INDEX' | 'NOINDEX'} RobotsIndexPolicy
 * @typedef {'FOLLOW' | 'NOFOLLOW'} RobotsFollowPolicy
 */

/**
 * @typedef {Object} RoutePayload
 * @property {string} path
 * @property {RouteEntityType} entityType
 * @property {string | null} entityId
 * @property {RouteStatus} status
 * @property {number} httpStatus
 * @property {string | null} canonicalUrl
 * @property {boolean} includeInSitemap
 * @property {string | null} lastmodAt
 */

/**
 * @typedef {Object} SeoMetadataPayload
 * @property {string} title
 * @property {string} description
 * @property {string} canonicalUrl
 * @property {RobotsIndexPolicy} robotsIndex
 * @property {RobotsFollowPolicy} robotsFollow
 * @property {string | null} ogTitle
 * @property {string | null} ogDescription
 * @property {string | null} ogImageUrl
 * @property {string | null} twitterCard
 * @property {Record<string, unknown> | null} schemaJson
 */

/**
 * @typedef {Object} MediaAssetPayload
 * @property {string} id
 * @property {string} url
 * @property {string | null} altText
 * @property {string | null} caption
 * @property {string | null} credit
 * @property {number | null} width
 * @property {number | null} height
 * @property {Array<{name: string, url: string, width: number | null, height: number | null}>} variants
 */

/**
 * @typedef {Object} AuthorSummaryPayload
 * @property {string} id
 * @property {string} displayName
 * @property {string} url
 * @property {string | null} avatarUrl
 * @property {string | null} bio
 */

/**
 * @typedef {Object} CategorySummaryPayload
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} url
 * @property {string | null} parentId
 */

/**
 * @typedef {Object} PostSummaryPayload
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} url
 * @property {string | null} excerpt
 * @property {string} publishedAt
 * @property {string | null} updatedAt
 * @property {AuthorSummaryPayload} author
 * @property {CategorySummaryPayload | null} primaryCategory
 * @property {MediaAssetPayload | null} featuredImage
 * @property {boolean} isBreaking
 * @property {boolean} isFeatured
 * @property {boolean} isSponsored
 * @property {number | null} readingTimeMinutes
 */

/**
 * @typedef {PostSummaryPayload & {
 *   contentHtml: string,
 *   contentText: string,
 *   categories: CategorySummaryPayload[],
 *   tags: Array<{id: string, name: string, slug: string, url: string}>,
 *   seo: SeoMetadataPayload,
 *   relatedPosts: PostSummaryPayload[],
 *   previousPost: PostSummaryPayload | null,
 *   nextPost: PostSummaryPayload | null
 * }} PostDetailPayload
 */

/**
 * @typedef {Object} PaginationPayload
 * @property {number} page
 * @property {number} pageSize
 * @property {number} totalItems
 * @property {number} totalPages
 * @property {string | null} nextPageUrl
 * @property {string | null} previousPageUrl
 */

/**
 * @typedef {Object} AdSlotPayload
 * @property {string} code
 * @property {string} location
 * @property {number | null} width
 * @property {number | null} height
 * @property {{title: string, imageUrl: string | null, targetUrl: string | null, sponsorName: string | null} | null} activeAd
 */

/**
 * @typedef {Object} HomePayload
 * @property {RoutePayload} route
 * @property {SeoMetadataPayload} seo
 * @property {PostSummaryPayload[]} featuredPosts
 * @property {PostSummaryPayload[]} breakingPosts
 * @property {PostSummaryPayload[]} latestPosts
 * @property {PostSummaryPayload[]} trendingPosts
 * @property {Array<{category: CategorySummaryPayload, posts: PostSummaryPayload[]}>} categorySections
 * @property {AdSlotPayload[]} adSlots
 */

/**
 * @typedef {Object} CategoryPagePayload
 * @property {RoutePayload} route
 * @property {SeoMetadataPayload} seo
 * @property {CategorySummaryPayload & {description: string | null, children: CategorySummaryPayload[]}} category
 * @property {PostSummaryPayload[]} posts
 * @property {PaginationPayload} pagination
 * @property {AdSlotPayload[]} adSlots
 */

/**
 * @typedef {Object} AuthorPagePayload
 * @property {RoutePayload} route
 * @property {SeoMetadataPayload} seo
 * @property {AuthorSummaryPayload & {websiteUrl: string | null, socialLinks: Record<string, string>}} author
 * @property {PostSummaryPayload[]} posts
 * @property {PaginationPayload} pagination
 */

/**
 * @typedef {Object} SearchPagePayload
 * @property {string} query
 * @property {PostSummaryPayload[]} results
 * @property {PaginationPayload} pagination
 * @property {SeoMetadataPayload} seo
 */

export const requiredContractFields = {
  route: ['path', 'entityType', 'status', 'httpStatus', 'includeInSitemap'],
  seo: ['title', 'description', 'canonicalUrl', 'robotsIndex', 'robotsFollow'],
  mediaAsset: ['id', 'url', 'altText', 'variants'],
  authorSummary: ['id', 'displayName', 'url'],
  categorySummary: ['id', 'name', 'slug', 'url'],
  postSummary: [
    'id',
    'title',
    'slug',
    'url',
    'publishedAt',
    'author',
    'primaryCategory',
    'featuredImage',
    'isBreaking',
    'isFeatured',
    'isSponsored',
  ],
  pagination: ['page', 'pageSize', 'totalItems', 'totalPages', 'nextPageUrl', 'previousPageUrl'],
  adSlot: ['code', 'location', 'width', 'height', 'activeAd'],
  home: ['route', 'seo', 'featuredPosts', 'breakingPosts', 'latestPosts', 'trendingPosts', 'categorySections', 'adSlots'],
  categoryPage: ['route', 'seo', 'category', 'posts', 'pagination', 'adSlots'],
  authorPage: ['route', 'seo', 'author', 'posts', 'pagination'],
  searchPage: ['query', 'results', 'pagination', 'seo'],
};

export function missingFields(payload, fields) {
  return fields.filter((field) => !Object.prototype.hasOwnProperty.call(payload ?? {}, field));
}

export function assertContract(name, payload, fields = requiredContractFields[name]) {
  if (!fields) {
    throw new Error(`Unknown contract: ${name}`);
  }

  const missing = missingFields(payload, fields);

  if (missing.length > 0) {
    throw new Error(`${name} payload missing required fields: ${missing.join(', ')}`);
  }

  return payload;
}

export function createPagination({ page = 1, pageSize = 10, totalItems = 0, basePath = '/' } = {}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: normalizedPage,
    pageSize,
    totalItems,
    totalPages,
    nextPageUrl: normalizedPage < totalPages ? `${basePath}?page=${normalizedPage + 1}` : null,
    previousPageUrl: normalizedPage > 1 ? `${basePath}?page=${normalizedPage - 1}` : null,
  };
}
