import { articles, authors, opinions } from './mock-data';
import { publicStaticPages } from './content';

const productionUrl = 'https://hackeandoelsistema.net';

export const siteConfig = {
  name: 'Hackeando el Sistema',
  title: 'Hackeando el Sistema | Digital Intelligence Unit',
  description: 'Noticias, opinion e inteligencia digital desde Republica Dominicana.',
  url: process.env.NEXT_PUBLIC_SITE_URL || productionUrl,
  locale: 'es_DO',
  twitterHandle: '@hackeandoelsistema',
  defaultImage: '/isotipo.png',
};

export function absoluteUrl(path = '/') {
  const baseUrl = siteConfig.url.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function toIsoDate(dateValue) {
  if (!dateValue || !/\d{4}/.test(dateValue)) return undefined;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

export function buildMetadata({
  title,
  description = siteConfig.description,
  path = '/',
  image = siteConfig.defaultImage,
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
  authors: metadataAuthors,
  tags = [],
} = {}) {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.title;
  const canonical = absoluteUrl(path);
  const imageUrl = image?.startsWith('http') ? image : absoluteUrl(image || siteConfig.defaultImage);
  const validPublishedTime = toIsoDate(publishedTime);
  const validModifiedTime = toIsoDate(modifiedTime);

  return {
    metadataBase: new URL(siteConfig.url),
    title: pageTitle,
    description,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type,
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: pageTitle,
      description,
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title || siteConfig.name,
        },
      ],
      publishedTime: validPublishedTime,
      modifiedTime: validModifiedTime,
      authors: metadataAuthors,
      tags,
    },
    twitter: {
      card: 'summary_large_image',
      site: siteConfig.twitterHandle,
      title: pageTitle,
      description,
      images: [imageUrl],
    },
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
      apple: '/isotipo.png',
    },
  };
}

export function articleMetadata(article) {
  if (!article) return buildMetadata({ title: 'Articulo no encontrado', path: '/404', noIndex: true });

  const author = authors.find((item) => item.id === article.authorId);

  return buildMetadata({
    title: article.title,
    description: article.subtitle || siteConfig.description,
    path: `/articulo/${article.id}`,
    image: article.image,
    type: 'article',
    publishedTime: article.date,
    modifiedTime: article.date,
    authors: author ? [author.name] : undefined,
    tags: [article.category, article.tag].filter(Boolean),
  });
}

export function opinionMetadata(opinion) {
  if (!opinion) return buildMetadata({ title: 'Opinion no encontrada', path: '/404', noIndex: true });

  const author = authors.find((item) => item.id === opinion.authorId);

  return buildMetadata({
    title: opinion.title,
    description: opinion.quote || opinion.content || siteConfig.description,
    path: `/opinion/${opinion.id}`,
    type: 'article',
    publishedTime: opinion.date,
    modifiedTime: opinion.date,
    authors: author ? [author.name] : undefined,
    tags: ['Opinion'],
  });
}

export function categoryMetadata(category) {
  if (!category) return buildMetadata({ title: 'Categoria no encontrada', path: '/404', noIndex: true });

  return buildMetadata({
    title: category.title,
    description: category.description,
    path: `/categoria/${encodeURIComponent(category.id)}`,
    tags: [category.title],
  });
}

export function authorMetadata(author) {
  if (!author) return buildMetadata({ title: 'Perfil no encontrado', path: '/404', noIndex: true });

  return buildMetadata({
    title: author.name,
    description: author.bio || siteConfig.description,
    path: `/perfil/${author.id}`,
    image: author.photo,
    type: 'profile',
  });
}

export function staticPageMetadata(page) {
  if (!page) return buildMetadata({ title: 'Pagina no encontrada', path: '/404', noIndex: true });

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/pagina/${page.slug}`,
  });
}

export function getSitemapEntries() {
  const now = new Date();
  const staticRoutes = [
    '/',
    '/contacto-seguro',
    '/planes',
    ...publicStaticPages.map((page) => `/pagina/${page.slug}`),
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: route === '/' ? 'hourly' : 'monthly',
      priority: route === '/' ? 1 : 0.6,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/articulo/${article.id}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: article.isHero || article.isFeatured ? 0.9 : 0.8,
    })),
    ...[...new Set(articles.map((article) => article.category))].map((category) => ({
      url: absoluteUrl(`/categoria/${encodeURIComponent(category)}`),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    })),
    ...opinions.map((opinion) => ({
      url: absoluteUrl(`/opinion/${opinion.id}`),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    })),
    ...authors.map((author) => ({
      url: absoluteUrl(`/perfil/${author.id}`),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    })),
  ];
}
