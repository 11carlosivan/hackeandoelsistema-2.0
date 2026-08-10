import { absoluteUrl, siteConfig, toIsoDate } from './seo';

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value) {
  return `<![CDATA[${String(value ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function rssDate(value) {
  const isoDate = toIsoDate(value);

  return isoDate ? new Date(isoDate).toUTCString() : new Date().toUTCString();
}

export function buildRssFeed({ articles = [], updatedAt = new Date() } = {}) {
  const feedUrl = absoluteUrl('/feed.xml');
  const siteUrl = absoluteUrl('/');
  const items = articles
    .filter((article) => article?.title && (article.route || article.slug || article.id))
    .map((article) => {
      const link = absoluteUrl(article.route || `/${article.slug || article.id}/`);
      const guid = article.raw?.guid || link;
      const description = article.subtitle || article.raw?.excerpt || siteConfig.description;

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="${guid === link ? 'true' : 'false'}">${escapeXml(guid)}</guid>
      <description>${cdata(description)}</description>
      <pubDate>${escapeXml(rssDate(article.publishedAt || article.date))}</pubDate>
      ${article.authorName ? `<dc:creator>${cdata(article.authorName)}</dc:creator>` : ''}
      ${article.category ? `<category>${cdata(article.category)}</category>` : ''}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>es-DO</language>
    <lastBuildDate>${escapeXml(rssDate(updatedAt))}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
