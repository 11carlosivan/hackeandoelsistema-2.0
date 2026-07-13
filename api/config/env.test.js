// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('api env config', () => {
  it('parses boolean strings explicitly', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      AUTH_COOKIE_SECURE: 'false',
    });

    expect(env.AUTH_COOKIE_SECURE).toBe(false);
  });
});
