import { legacyRedirects } from './lib/main-design/legacy-redirects.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        source: '/uploads/cms/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
        ],
      },
      {
        source: '/feed.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=1800',
          },
        ],
      },
    ];
  },
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
