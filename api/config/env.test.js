// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('api env config', () => {
  it('parses boolean strings explicitly', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      AUTH_COOKIE_SECURE: 'false',
    });

    expect(env.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('requires R2 credentials when the R2 media driver is enabled', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
        AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
        MEDIA_STORAGE_DRIVER: 'r2',
      }),
    ).toThrow(/R2_ACCOUNT_ID is required/);
  });

  it('parses the R2 media configuration', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test?schema=public',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      MEDIA_STORAGE_DRIVER: 'r2',
      R2_ACCOUNT_ID: 'account-id',
      R2_BUCKET_NAME: 'hes-media-staging',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_PUBLIC_BASE_URL: 'https://media.hackeandoelsistema.net',
    });

    expect(env.MEDIA_STORAGE_DRIVER).toBe('r2');
    expect(env.R2_BUCKET_NAME).toBe('hes-media-staging');
    expect(env.R2_PUBLIC_BASE_URL).toBe('https://media.hackeandoelsistema.net');
  });
});
