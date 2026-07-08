const categoryFixtures = [
  {
    slug: 'politica',
    title: 'Politica',
    description: 'Poder, gobierno, partidos y decisiones que mueven la agenda publica dominicana.',
    lastmodAt: '2026-07-07T14:00:00.000Z',
  },
  {
    slug: 'nacionales',
    title: 'Nacionales',
    description: 'Noticias nacionales, politica publica y actualidad dominicana.',
    lastmodAt: '2026-07-06T17:14:17.000Z',
  },
  {
    slug: 'internacionales',
    title: 'Internacional',
    description: 'Lecturas globales con impacto regional, geopolitica y poder fuera de RD.',
    lastmodAt: '2026-07-07T12:30:00.000Z',
  },
  {
    slug: 'economia-negocios',
    title: 'Economia',
    description: 'Dolar, combustibles, mercado, bolsillo y decisiones economicas que afectan al pais.',
    lastmodAt: '2026-07-07T13:45:00.000Z',
  },
  {
    slug: 'deportes',
    title: 'Deportes',
    description: 'Resultados, agenda y protagonistas del deporte dominicano e internacional.',
    lastmodAt: '2026-07-07T11:40:00.000Z',
  },
  {
    slug: 'mlb',
    title: 'MLB',
    description: 'Dominicanos en Grandes Ligas, jornadas clave, estadisticas y calendario.',
    lastmodAt: '2026-07-07T10:55:00.000Z',
  },
  {
    slug: 'nba',
    title: 'NBA',
    description: 'Playoffs, resultados, calendario y el pulso de la liga noche tras noche.',
    lastmodAt: '2026-07-07T10:20:00.000Z',
  },
  {
    slug: 'clima-rd',
    title: 'Clima RD',
    description: 'Pronosticos, alertas, lluvias y condiciones que afectan provincias dominicanas.',
    lastmodAt: '2026-07-07T09:30:00.000Z',
  },
  {
    slug: 'opinion',
    title: 'Opinion',
    description: 'Columnas, analisis y miradas firmadas sobre politica, sociedad y poder.',
    lastmodAt: '2026-07-06T18:10:00.000Z',
  },
  {
    slug: 'educacion',
    title: 'Educacion',
    description: 'Escuelas, universidades, politicas educativas y debates sobre formacion.',
    lastmodAt: '2026-07-06T15:25:00.000Z',
  },
  {
    slug: 'salud',
    title: 'Salud',
    description: 'Sistema sanitario, prevencion, servicios publicos y alertas de salud.',
    lastmodAt: '2026-07-06T14:45:00.000Z',
  },
  {
    slug: 'tecnologia',
    title: 'Tecnologia',
    description: 'Innovacion, plataformas, seguridad digital y cambios tecnologicos relevantes.',
    lastmodAt: '2026-07-06T13:20:00.000Z',
  },
  {
    slug: 'ultima-hora',
    title: 'Ultima Hora',
    description: 'Noticias en desarrollo, alertas y actualizaciones rapidas de la jornada.',
    lastmodAt: '2026-07-07T16:00:00.000Z',
  },
];

export const routeFixtures = [
  {
    path: '/',
    entityType: 'HOME',
    entityId: 'home',
    status: 'ACTIVE',
    httpStatus: 200,
    includeInSitemap: true,
    lastmodAt: '2026-07-07T00:00:00.000Z',
  },
  ...categoryFixtures.map((category) => ({
    path: `/category/${category.slug}/`,
    entityType: 'CATEGORY',
    entityId: `category-${category.slug}`,
    status: 'ACTIVE',
    httpStatus: 200,
    includeInSitemap: true,
    lastmodAt: category.lastmodAt,
  })),
  {
    path: '/author/redaccion/',
    entityType: 'AUTHOR',
    entityId: 'author-redaccion',
    status: 'ACTIVE',
    httpStatus: 200,
    includeInSitemap: true,
    lastmodAt: '2026-07-05T01:19:10.000Z',
  },
  {
    path: '/como-recordamos-a-un-presidente-de-la-republica-dominicana/',
    entityType: 'POST',
    entityId: 'post-presidente-rd',
    status: 'ACTIVE',
    httpStatus: 200,
    includeInSitemap: true,
    lastmodAt: '2026-07-02T15:30:22.000Z',
  },
  {
    path: '/privacy-policy/',
    entityType: 'PAGE',
    entityId: 'page-privacy-policy',
    status: 'ACTIVE',
    httpStatus: 200,
    includeInSitemap: true,
    lastmodAt: '2026-07-02T19:45:58.000Z',
  },
  {
    path: '/pagina/privacy-policy/',
    entityType: 'STATIC',
    entityId: 'redirect-legacy-privacy',
    status: 'REDIRECTED',
    httpStatus: 301,
    targetUrl: '/privacy-policy/',
    includeInSitemap: false,
    lastmodAt: '2026-07-07T00:00:00.000Z',
  },
  {
    path: '/test-2/',
    entityType: 'PAGE',
    entityId: 'gone-test-page',
    status: 'GONE',
    httpStatus: 410,
    includeInSitemap: false,
    lastmodAt: '2026-07-07T00:00:00.000Z',
  },
];

export const seoMetadataFixtures = {
  '/': {
    title: 'Hackeando el Sistema',
    description: 'Al Codigo Fuente de la Verdad.',
    robotsIndex: 'INDEX',
    robotsFollow: 'FOLLOW',
    ogTitle: 'Hackeando el Sistema',
    ogDescription: 'Al Codigo Fuente de la Verdad.',
    ogImageUrl: '/logo.png',
  },
  ...Object.fromEntries(
    categoryFixtures.map((category) => [
      `/category/${category.slug}/`,
      {
        title: `${category.title} - Hackeando el Sistema`,
        description: category.description,
        robotsIndex: 'INDEX',
        robotsFollow: 'FOLLOW',
        ogTitle: `${category.title} - Hackeando el Sistema`,
        ogDescription: category.description,
        ogImageUrl: '/logo.png',
      },
    ]),
  ),
  '/author/redaccion/': {
    title: 'Melvin Sena, autor en Hackeando el Sistema',
    description: 'Director Ejecutivo de Hackeandoelsistema.net.',
    robotsIndex: 'INDEX',
    robotsFollow: 'FOLLOW',
    ogTitle: 'Melvin Sena, autor en Hackeando el Sistema',
    ogDescription: 'Director Ejecutivo de Hackeandoelsistema.net.',
    ogImageUrl: '/logo.png',
  },
  '/como-recordamos-a-un-presidente-de-la-republica-dominicana/': {
    title: 'Como recordamos a un presidente de la Republica Dominicana',
    description: 'La historia de la Republica Dominicana no recuerda a los presidentes por sus discursos.',
    robotsIndex: 'INDEX',
    robotsFollow: 'FOLLOW',
    ogTitle: 'Como recordamos a un presidente de la Republica Dominicana',
    ogDescription: 'La historia de la Republica Dominicana no recuerda a los presidentes por sus discursos.',
    ogType: 'article',
    ogImageUrl: '/logo.png',
    schemaJson: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: 'Como recordamos a un presidente de la Republica Dominicana',
      datePublished: '2026-07-02T15:30:15.000Z',
      dateModified: '2026-07-02T15:30:22.000Z',
    },
  },
  '/privacy-policy/': {
    title: 'Politica de privacidad - Hackeando el Sistema',
    description: 'Politica de privacidad y tratamiento de datos de Hackeando el Sistema.',
    robotsIndex: 'INDEX',
    robotsFollow: 'FOLLOW',
    ogTitle: 'Politica de privacidad - Hackeando el Sistema',
    ogDescription: 'Politica de privacidad y tratamiento de datos de Hackeando el Sistema.',
    ogImageUrl: '/logo.png',
  },
};

export const entityFixtures = {
  ...Object.fromEntries(
    categoryFixtures.map((category) => [
      `category-${category.slug}`,
      {
        type: 'CATEGORY',
        title: category.title,
        description: category.description,
      },
    ]),
  ),
  'author-redaccion': {
    type: 'AUTHOR',
    title: 'Melvin Sena',
    description: 'Director Ejecutivo de Hackeandoelsistema.net.',
  },
  'post-presidente-rd': {
    type: 'POST',
    title: 'Como recordamos a un presidente de la Republica Dominicana',
    excerpt: 'Entre la obra, los errores y el marketing.',
    content:
      'Esta es una pagina temporal de ruta SEO-safe. En la siguiente fase, el contenido vendra desde Fastify/Prisma y conservara el HTML migrado de WordPress.',
  },
  'page-privacy-policy': {
    type: 'PAGE',
    title: 'Politica de privacidad',
    content:
      'Pagina estatica temporal resuelta desde la capa de routes. El contenido final vendra del CMS.',
  },
};
