import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true,
    testTimeout: 15000,
    environmentMatchGlobs: [
      ['api/**/*.test.js', 'node'],
    ],
  },
});
