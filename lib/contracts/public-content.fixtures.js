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
  name: 'Nacional',
  slug: 'nacionales',
  url: '/category/nacionales/',
  parentId: null,
};

const categoryPolitica = {
  id: 'category-politica',
  name: 'Politica',
  slug: 'politica',
  url: '/category/politica/',
  parentId: null,
};

const categoryEconomia = {
  id: 'category-economia',
  name: 'Economia',
  slug: 'economia-negocios',
  url: '/category/economia-negocios/',
  parentId: null,
};

const categoryInternacional = {
  id: 'category-internacionales',
  name: 'Internacional',
  slug: 'internacionales',
  url: '/category/internacionales/',
  parentId: null,
};

const categoryDeportes = {
  id: 'category-deportes',
  name: 'Deportes',
  slug: 'deportes',
  url: '/category/deportes/',
  parentId: null,
};

const categoryMLB = {
  id: 'category-mlb',
  name: 'MLB',
  slug: 'mlb',
  url: '/category/mlb/',
  parentId: null,
};

const categoryNBA = {
  id: 'category-nba',
  name: 'NBA',
  slug: 'nba',
  url: '/category/nba/',
  parentId: null,
};

const categoryClima = {
  id: 'category-clima-rd',
  name: 'Clima RD',
  slug: 'clima-rd',
  url: '/category/clima-rd/',
  parentId: null,
};

function imageFixture({ id, url, altText, width = 1536, height = 1024 }) {
  return {
    id,
    url,
    altText,
    caption: null,
    credit: null,
    width,
    height,
    variants: [
      {
        name: 'original',
        url,
        width,
        height,
      },
    ],
  };
}

const featuredImage = imageFixture({
  id: 'media-logo',
  url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/Jul-2-2026-11_21_30-AM.png',
  altText: 'Editorial Hackeando el Sistema',
  caption: null,
  credit: null,
});

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

export const politicsPostFixture = {
  ...postSummaryFixture,
  id: 'post-abinader-economia',
  title: 'Abinader anuncia nuevas medidas para fortalecer la economia y el empleo joven',
  slug: 'abinader-anuncia-medidas-economia-empleo-joven',
  url: '/abinader-anuncia-medidas-economia-empleo-joven/',
  excerpt:
    'El presidente presento un plan integral que busca impulsar el desarrollo economico y generar mas oportunidades.',
  primaryCategory: categoryPolitica,
  featuredImage: imageFixture({
    id: 'media-abinader-politica',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/ChatGPT-Image-Jul-7-2026-01_15_59-PM.png',
    altText: 'Luis Abinader en pieza editorial politica',
  }),
  isBreaking: true,
  readingTimeMinutes: 6,
};

export const economyPostFixture = {
  ...postSummaryFixture,
  id: 'post-dolar-rd',
  title: 'Precio del dolar hoy en RD: asi amanecio el mercado cambiario',
  slug: 'precio-del-dolar-hoy-rd',
  url: '/precio-del-dolar-hoy-rd/',
  excerpt: 'El mercado cambiario inicia la jornada con nuevas referencias para compra y venta.',
  primaryCategory: categoryEconomia,
  featuredImage: imageFixture({
    id: 'media-gasolina-rd',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/2303a0cf-4972-49f5-9d6a-d162c973efdc.png',
    altText: 'Analisis sobre economia y combustibles en Republica Dominicana',
  }),
  isFeatured: false,
  readingTimeMinutes: 3,
};

export const opinionPostFixture = {
  ...postSummaryFixture,
  id: 'post-opinion-pais',
  title: 'El pais que merecemos',
  slug: 'el-pais-que-merecemos',
  url: '/el-pais-que-merecemos/',
  excerpt: 'Una lectura sobre responsabilidad publica, ciudadania y memoria politica.',
  primaryCategory: {
    id: 'category-opinion',
    name: 'Opinion',
    slug: 'opinion',
    url: '/category/opinion/',
    parentId: null,
  },
  featuredImage: imageFixture({
    id: 'media-opinion-pais',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/ChatGPT-Image-Jul-6-2026-01_11_43-PM.png',
    altText: 'Pieza editorial de opinion politica',
  }),
  isFeatured: false,
  readingTimeMinutes: 5,
};

export const internationalPostFixture = {
  ...postSummaryFixture,
  id: 'post-elecciones-eeuu',
  title: 'Elecciones en Estados Unidos: lo que dicen las ultimas encuestas',
  slug: 'elecciones-estados-unidos-ultimas-encuestas',
  url: '/elecciones-estados-unidos-ultimas-encuestas/',
  excerpt: 'Una lectura de los movimientos electorales y su impacto regional.',
  primaryCategory: categoryInternacional,
  featuredImage: imageFixture({
    id: 'media-internacional-eeuu',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/ChatGPT-Image-Jul-7-2026-12_33_10-PM.png',
    altText: 'Analisis internacional con enfoque politico',
  }),
  isFeatured: false,
  readingTimeMinutes: 4,
};

export const sportsPostFixture = {
  ...postSummaryFixture,
  id: 'post-deportes-playoffs',
  title: 'Calendario deportivo de la noche: juegos clave y horarios',
  slug: 'calendario-deportivo-juegos-clave-horarios',
  url: '/calendario-deportivo-juegos-clave-horarios/',
  excerpt: 'La agenda de los eventos principales para seguir durante la jornada.',
  primaryCategory: categoryDeportes,
  featuredImage: imageFixture({
    id: 'media-deportes-agenda',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/ChatGPT-Image-Jul-6-2026-12_03_57-PM.png',
    altText: 'Cobertura deportiva en formato editorial',
  }),
  isFeatured: false,
  readingTimeMinutes: 2,
};

export const mlbPostFixture = {
  ...postSummaryFixture,
  id: 'post-mlb-soto',
  title: 'Juan Soto brilla con gran jornada y guia a su equipo a la victoria',
  slug: 'juan-soto-brilla-gran-jornada-victoria',
  url: '/juan-soto-brilla-gran-jornada-victoria/',
  excerpt: 'El bate dominicano vuelve a marcar diferencia en una noche de alto impacto.',
  primaryCategory: categoryMLB,
  featuredImage: imageFixture({
    id: 'media-mlb-soto',
    url: 'https://hackeandoelsistema.net/wp-content/uploads/2026/07/ChatGPT-Image-Jul-6-2026-10_28_36-AM.png',
    altText: 'Cobertura MLB de jugador dominicano',
  }),
  isFeatured: false,
  readingTimeMinutes: 3,
};

export const nbaPostFixture = {
  ...postSummaryFixture,
  id: 'post-nba-playoffs',
  title: 'NBA Playoffs: resultados, calendario y lo que viene hoy',
  slug: 'nba-playoffs-resultados-calendario-hoy',
  url: '/nba-playoffs-resultados-calendario-hoy/',
  excerpt: 'La postemporada entra en una fase decisiva con cruces de alta presion.',
  primaryCategory: categoryNBA,
  featuredImage: null,
  isFeatured: false,
  readingTimeMinutes: 3,
};

export const weatherPostFixture = {
  ...postSummaryFixture,
  id: 'post-clima-lluvias-rd',
  title: 'Lluvias continuaran afectando varias provincias del pais',
  slug: 'lluvias-continuaran-afectando-provincias-pais',
  url: '/lluvias-continuaran-afectando-provincias-pais/',
  excerpt: 'El pronostico mantiene vigilancia sobre zonas vulnerables durante la tarde.',
  primaryCategory: categoryClima,
  featuredImage: null,
  isFeatured: false,
  readingTimeMinutes: 2,
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
  featuredPosts: [politicsPostFixture],
  breakingPosts: [internationalPostFixture, mlbPostFixture, economyPostFixture],
  latestPosts: [
    weatherPostFixture,
    politicsPostFixture,
    economyPostFixture,
    nbaPostFixture,
    internationalPostFixture,
    mlbPostFixture,
    opinionPostFixture,
    sportsPostFixture,
  ],
  trendingPosts: [politicsPostFixture, economyPostFixture, internationalPostFixture, opinionPostFixture, nbaPostFixture],
  categorySections: [
    {
      category: categoryNacionales,
      posts: [postSummaryFixture, politicsPostFixture],
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
