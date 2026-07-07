import { createPagination } from './public-content';

const authorMelvin = {
  id: 'author-redaccion',
  displayName: 'Melvin Sena',
  url: '/author/redaccion/',
  avatarUrl: null,
  bio: 'Director Ejecutivo de Hackeandoelsistema.net.',
};

const categoryNacionales = {
  id: 'category-nacionales',
  name: 'Nacionales',
  slug: 'nacionales',
  url: '/category/nacionales/',
  parentId: null,
};

const featuredImage = {
  id: 'media-logo',
  url: '/logo.png',
  altText: 'Hackeando el Sistema',
  caption: null,
  credit: null,
  width: 678,
  height: 535,
  variants: [
    {
      name: 'original',
      url: '/logo.png',
      width: 678,
      height: 535,
    },
  ],
};

export const postSummaryFixture = {
  id: 'post-presidente-rd',
  title: 'Como recordamos a un presidente de la Republica Dominicana',
  slug: 'como-recordamos-a-un-presidente-de-la-republica-dominicana',
  url: '/como-recordamos-a-un-presidente-de-la-republica-dominicana/',
  excerpt: 'Entre la obra, los errores y el marketing.',
  publishedAt: '2026-07-02T15:30:15.000Z',
  updatedAt: '2026-07-02T15:30:22.000Z',
  author: authorMelvin,
  primaryCategory: categoryNacionales,
  featuredImage,
  isBreaking: false,
  isFeatured: true,
  isSponsored: false,
  readingTimeMinutes: 4,
};

export const seoFixture = {
  title: 'Hackeando el Sistema',
  description: 'Al Codigo Fuente de la Verdad.',
  canonicalUrl: 'https://hackeandoelsistema.net/',
  robotsIndex: 'INDEX',
  robotsFollow: 'FOLLOW',
  ogTitle: 'Hackeando el Sistema',
  ogDescription: 'Al Codigo Fuente de la Verdad.',
  ogImageUrl: '/logo.png',
  twitterCard: 'summary_large_image',
  schemaJson: null,
};

export const routeFixture = {
  path: '/',
  entityType: 'HOME',
  entityId: 'home',
  status: 'ACTIVE',
  httpStatus: 200,
  canonicalUrl: 'https://hackeandoelsistema.net/',
  includeInSitemap: true,
  lastmodAt: '2026-07-07T00:00:00.000Z',
};

export const homePayloadFixture = {
  route: routeFixture,
  seo: seoFixture,
  featuredPosts: [postSummaryFixture],
  breakingPosts: [],
  latestPosts: [postSummaryFixture],
  trendingPosts: [postSummaryFixture],
  categorySections: [
    {
      category: categoryNacionales,
      posts: [postSummaryFixture],
    },
  ],
  adSlots: [
    {
      code: 'home-leaderboard',
      location: 'home.top',
      width: 970,
      height: 250,
      activeAd: null,
    },
  ],
};

export const categoryPagePayloadFixture = {
  route: {
    ...routeFixture,
    path: '/category/nacionales/',
    entityType: 'CATEGORY',
    entityId: categoryNacionales.id,
    canonicalUrl: 'https://hackeandoelsistema.net/category/nacionales/',
  },
  seo: {
    ...seoFixture,
    title: 'Nacionales - Hackeando el Sistema',
    canonicalUrl: 'https://hackeandoelsistema.net/category/nacionales/',
  },
  category: {
    ...categoryNacionales,
    description: 'Noticias nacionales, politica publica y actualidad dominicana.',
    children: [],
  },
  posts: [postSummaryFixture],
  pagination: createPagination({ page: 1, pageSize: 10, totalItems: 1, basePath: '/category/nacionales/' }),
  adSlots: [],
};

export const authorPagePayloadFixture = {
  route: {
    ...routeFixture,
    path: '/author/redaccion/',
    entityType: 'AUTHOR',
    entityId: authorMelvin.id,
    canonicalUrl: 'https://hackeandoelsistema.net/author/redaccion/',
  },
  seo: {
    ...seoFixture,
    title: 'Melvin Sena, autor en Hackeando el Sistema',
    canonicalUrl: 'https://hackeandoelsistema.net/author/redaccion/',
  },
  author: {
    ...authorMelvin,
    websiteUrl: 'https://hackeandoelsistema.net/',
    socialLinks: {
      x: 'https://x.com/SenaSistema',
    },
  },
  posts: [postSummaryFixture],
  pagination: createPagination({ page: 1, pageSize: 10, totalItems: 1, basePath: '/author/redaccion/' }),
};

export const searchPagePayloadFixture = {
  query: 'prm',
  results: [postSummaryFixture],
  pagination: createPagination({ page: 1, pageSize: 10, totalItems: 1, basePath: '/buscar?q=prm' }),
  seo: {
    ...seoFixture,
    title: 'Resultados de busqueda - Hackeando el Sistema',
    canonicalUrl: 'https://hackeandoelsistema.net/buscar/',
    robotsIndex: 'NOINDEX',
    robotsFollow: 'FOLLOW',
  },
};
