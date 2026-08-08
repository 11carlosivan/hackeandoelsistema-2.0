import { authors } from './mock-data';
const productionUrl = 'https://hackeandoelsistema.net';
const socialImageProxyHosts = new Set(['image.hackeandoelsistema.net']);

export const siteConfig = {
  name: 'Hackeando el Sistema',
  title: 'Hackeando el Sistema | Digital Intelligence Unit',
  description: 'Noticias, opinion e inteligencia digital desde Republica Dominicana.',
  url: process.env.NEXT_PUBLIC_SITE_URL || productionUrl,
  indexingEnabled: process.env.NEXT_PUBLIC_INDEXING_ENABLED !== 'false',
  locale: 'es_DO',
  twitterHandle: '@hackeandoelsistema',
  defaultImage: '/isotipo.png',
};

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = siteConfig.url.replace(/\/$/, '');
  const normalizedPath = normalizeInternalPath(path);
  return `${baseUrl}${normalizedPath}`;
}

function normalizeInternalPath(path = '/') {
  const rawPath = String(path || '/');
  const [pathAndQuery, hash = ''] = rawPath.split('#', 2);
  const [pathnamePart, query = ''] = pathAndQuery.split('?', 2);
  const pathname = pathnamePart.startsWith('/') ? pathnamePart : `/${pathnamePart}`;
  const hasFileExtension = /\.[a-z0-9]+$/i.test(pathname);
  const normalizedPathname = pathname === '/' || hasFileExtension || pathname.endsWith('/')
    ? pathname
    : `${pathname}/`;

  return `${normalizedPathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

function imageMimeType(imageUrl) {
  const pathname = String(imageUrl || '').split('?', 1)[0].toLowerCase();

  if (pathname.includes('/api/social-image/')) return 'image/jpeg';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';

  return 'image/jpeg';
}

export function socialPreviewImageUrl(imageUrl, versionSeed) {
  try {
    const url = new URL(imageUrl);

    if (!socialImageProxyHosts.has(url.hostname)) {
      return imageUrl;
    }

    const params = new URLSearchParams({ src: url.toString() });

    if (versionSeed) {
      params.set('v', String(versionSeed).replace(/[^a-z0-9-_.:]/gi, '').slice(0, 80));
    }

    return absoluteUrl(`/social-image/?${params.toString()}`);
  } catch {
    return imageUrl;
  }
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
  robotsIndex,
  robotsFollow,
  publishedTime,
  modifiedTime,
  authors: metadataAuthors,
  tags = [],
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  twitterCard,
} = {}) {
  const normalizedTitle = String(title || '').trim();
  const titleAlreadyHasSite = new RegExp(`(?:\\||-)\\s*${siteConfig.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    .test(normalizedTitle);
  const pageTitle = normalizedTitle
    ? (titleAlreadyHasSite ? normalizedTitle : `${normalizedTitle} | ${siteConfig.name}`)
    : siteConfig.title;
  const canonical = absoluteUrl(path);
  const sourceImageUrl = image?.startsWith('http') ? image : absoluteUrl(image || siteConfig.defaultImage);
  const validPublishedTime = toIsoDate(publishedTime);
  const validModifiedTime = toIsoDate(modifiedTime);
  const imageUrl = socialPreviewImageUrl(sourceImageUrl, validModifiedTime || validPublishedTime);
  const imageType = imageMimeType(imageUrl);
  const shouldIndex = siteConfig.indexingEnabled && (robotsIndex ? robotsIndex === 'INDEX' : !noIndex);
  const shouldFollow = robotsFollow ? robotsFollow === 'FOLLOW' : true;
  const resolvedOgTitle = ogTitle || pageTitle;
  const resolvedOgDescription = ogDescription || description;
  const resolvedTwitterTitle = twitterTitle || resolvedOgTitle;
  const resolvedTwitterDescription = twitterDescription || resolvedOgDescription;
  const resolvedTwitterCard = ['summary', 'summary_large_image'].includes(twitterCard)
    ? twitterCard
    : 'summary_large_image';

  const alternates = {
    canonical,
    ...(shouldIndex
      ? {
          types: {
            'application/rss+xml': absoluteUrl('/feed.xml'),
          },
        }
      : {}),
  };

  return {
    metadataBase: new URL(siteConfig.url),
    title: pageTitle,
    description,
    alternates,
    robots: !shouldIndex
      ? {
          index: false,
          follow: shouldFollow,
          googleBot: {
            index: false,
            follow: shouldFollow,
          },
        }
      : {
          index: true,
          follow: shouldFollow,
          googleBot: {
            index: true,
            follow: shouldFollow,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type,
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      url: canonical,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: title || siteConfig.name,
          type: imageType,
        },
      ],
      publishedTime: validPublishedTime,
      modifiedTime: validModifiedTime,
      authors: metadataAuthors,
      tags,
    },
    twitter: {
      card: resolvedTwitterCard,
      site: siteConfig.twitterHandle,
      title: resolvedTwitterTitle,
      description: resolvedTwitterDescription,
      images: [imageUrl],
    },
    icons: {
      icon: '/favicon.png',
      shortcut: '/favicon.ico',
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
    path: page.canonicalPath || `/pagina/${page.slug}`,
  });
}

export function getSitemapEntries() {
  const now = new Date();
  const staticRoutes = [
    '/',
    '/contacto-seguro',
    '/planes',
  ];

  return staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === '/' ? 'hourly' : 'monthly',
    priority: route === '/' ? 1 : 0.6,
  }));
}
