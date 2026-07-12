import { legacyRedirects } from './lib/main-design/legacy-redirects.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/feed',
        destination: '/feed.xml',
        permanent: true,
      },
      {
        source: '/feed/',
        destination: '/feed.xml',
        permanent: true,
      },
      {
        source: '/sitemap_index.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/wp-sitemap.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/:type(post|page|category|post_tag|author)-sitemap.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      ...legacyRedirects,
    ];
  },
};

export default nextConfig;
