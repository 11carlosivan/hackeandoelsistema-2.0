import { absoluteUrl, siteConfig, toIsoDate } from '@/lib/main-design/seo';

function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function SiteStructuredData() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsMediaOrganization',
          name: siteConfig.name,
          url: siteConfig.url,
          logo: absoluteUrl('/isotipo.png'),
          sameAs: [
            'https://www.youtube.com/@hackeandoelsistemaTV',
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteConfig.name,
          url: siteConfig.url,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${absoluteUrl('/buscar')}?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  );
}

export function ArticleStructuredData({ article, author }) {
  const image = article.image?.startsWith('http') ? article.image : absoluteUrl(article.image || '/isotipo.png');
  const publishedDate = toIsoDate(article.publishedAt || article.date);
  const modifiedDate = toIsoDate(article.raw?.updatedAt || article.updatedAt || article.publishedAt || article.date);
  const articlePath = article.route || article.raw?.canonicalPath || `/articulo/${article.id}`;
  const authorPath = article.authorPath || (author?.id ? `/perfil/${author.id}` : null);

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.subtitle,
        image: [image],
        ...(publishedDate ? { datePublished: publishedDate, dateModified: modifiedDate || publishedDate } : {}),
        author: {
          '@type': 'Person',
          name: author?.name || 'Hackeando el Sistema',
          url: authorPath ? absoluteUrl(authorPath) : siteConfig.url,
        },
        publisher: {
          '@type': 'NewsMediaOrganization',
          name: siteConfig.name,
          logo: {
            '@type': 'ImageObject',
            url: absoluteUrl('/isotipo.png'),
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': absoluteUrl(articlePath),
        },
      }}
    />
  );
}
