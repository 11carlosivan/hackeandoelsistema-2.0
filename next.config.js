import { legacyRedirects } from './lib/main-design/legacy-redirects.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  trailingSlash: true,
  async redirects() {
    return legacyRedirects;
  },
};

export default nextConfig;
