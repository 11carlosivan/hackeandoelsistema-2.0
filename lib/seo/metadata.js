import { siteConfig } from '@/lib/site';

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return undefined;
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, siteConfig.url).toString();
}

export function metadataFromResolvedRoute(resolvedRoute) {
  const seo = resolvedRoute?.seo;

  if (!seo) {
    return {
      title: 'Pagina no encontrada',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonical = absoluteUrl(seo.canonicalUrl ?? resolvedRoute.path);
  const ogImage = absoluteUrl(seo.ogImageUrl);
  const shouldIndex = seo.robotsIndex !== 'NOINDEX';
  const shouldFollow = seo.robotsFollow !== 'NOFOLLOW';

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
    },
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      googleBot: {
        index: shouldIndex,
        follow: shouldFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: 'es_ES',
      type: seo.ogType ?? 'website',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: seo.twitterCard ?? 'summary_large_image',
      title: seo.twitterTitle ?? seo.ogTitle ?? seo.title,
      description: seo.twitterDescription ?? seo.ogDescription ?? seo.description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export function jsonLdFromResolvedRoute(resolvedRoute) {
  return resolvedRoute?.seo?.schemaJson ?? null;
}
