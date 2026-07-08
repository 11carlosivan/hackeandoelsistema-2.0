import { absoluteUrl, siteConfig, toIsoDate } from '@/lib/main-design/seo';

function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
  const publishedDate = toIsoDate(article.date);

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.subtitle,
        image: [image],
        ...(publishedDate ? { datePublished: publishedDate, dateModified: publishedDate } : {}),
        author: {
          '@type': 'Person',
          name: author?.name || 'Hackeando el Sistema',
          url: author?.id ? absoluteUrl(`/perfil/${author.id}`) : siteConfig.url,
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
          '@id': absoluteUrl(`/articulo/${article.id}`),
        },
      }}
    />
  );
}
