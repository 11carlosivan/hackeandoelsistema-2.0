// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { hashPassword } from './services/auth.js';

function createAuthUser(passwordHash, overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@example.com',
    passwordHash,
    displayName: 'Admin',
    username: 'admin',
    status: 'ACTIVE',
    failedLoginCount: 0,
    lockedUntil: null,
    roles: [
      {
        role: {
          name: 'ADMIN',
          permissions: [
            { permission: { permissionKey: 'cms:read' } },
            { permission: { permissionKey: 'users:manage' } },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function createPrismaStub(user) {
  const sessions = new Map();

  return {
    $queryRaw: async () => [{ '?column?': 1 }],
    $disconnect: async () => undefined,
    user: {
      findUnique: async ({ where }) => {
        if (where.email === user.email || where.id === user.id) return user;
        return null;
      },
      update: async () => user,
    },
    userSession: {
      create: async ({ data }) => {
        const session = { id: `session-${sessions.size + 1}`, revokedAt: null, ...data, user };
        sessions.set(data.refreshTokenHash, session);
        return session;
      },
      findFirst: async ({ where }) => {
        const session = sessions.get(where.refreshTokenHash);

        if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
        return session;
      },
      update: async ({ where, data }) => {
        for (const [hash, session] of sessions.entries()) {
          if (session.id === where.id) {
            sessions.set(hash, { ...session, ...data });
            return sessions.get(hash);
          }
        }

        return null;
      },
      updateMany: async ({ where, data }) => {
        let count = 0;

        for (const [hash, session] of sessions.entries()) {
          const matchesId = !where.id || session.id === where.id;
          const matchesHash = !where.refreshTokenHash || session.refreshTokenHash === where.refreshTokenHash;
          const matchesRevokedAt = !Object.hasOwn(where, 'revokedAt') || session.revokedAt === where.revokedAt;

          if (matchesId && matchesHash && matchesRevokedAt) {
            sessions.set(hash, { ...session, ...data });
            count += 1;
          }
        }

        return { count };
      },
    },
    securityEvent: {
      create: async ({ data }) => ({ id: `event-${data.eventType}`, ...data }),
    },
    product: {
      count: async () => 0,
    },
    webStory: {
      count: async () => 0,
    },
    category: {
      findMany: async () => [],
    },
    post: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
    },
    page: {
      findFirst: async () => null,
      count: async () => 0,
    },
    route: {
      findUnique: async () => null,
      count: async () => 0,
      findMany: async () => [],
    },
    redirect: {
      findFirst: async () => null,
    },
    importRun: {
      findFirst: async () => null,
    },
    tag: {
      count: async () => 0,
    },
  };
}

function cookiePair(setCookies, name) {
  return setCookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';')[0];
}

function cookieValue(cookie) {
  return cookie?.slice(cookie.indexOf('=') + 1);
}

const testEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
  WEB_ORIGIN: 'http://127.0.0.1:3000',
  RATE_LIMIT_MAX: 120,
  RATE_LIMIT_WINDOW: '1 minute',
  AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
  AUTH_ACCESS_TOKEN_TTL_SECONDS: 900,
    AUTH_REFRESH_TOKEN_TTL_DAYS: 30,
    AUTH_COOKIE_SECURE: false,
    AUTH_MAX_LOGIN_ATTEMPTS: 5,
    AUTH_LOCKOUT_MINUTES: 15,
    corsOrigins: ['http://127.0.0.1:3000'],
    isProduction: false,
};

describe('auth routes', () => {
  it('logs in with valid credentials and returns sanitized user data', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'ADMIN@example.com',
        password: 'CorrectHorse123!',
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().data.user).toMatchObject({
      email: 'admin@example.com',
      roles: ['ADMIN'],
    });
    expect(response.json().data.user.passwordHash).toBeUndefined();
    expect(response.json().data.accessToken).toBeTruthy();
    expect(response.json().data.refreshToken).toBeUndefined();
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hes_access_token='),
        expect.stringContaining('hes_refresh_token='),
        expect.stringContaining('hes_csrf_token='),
      ]),
    );
  });

  it('can return refresh tokens only for explicit API token clients', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
        tokenResponse: true,
      },
    });

    await app.close();

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.accessToken).toBeTruthy();
    expect(response.json().data.refreshToken).toBeTruthy();
  });

  it('rotates refresh tokens and rejects reuse of the previous token', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
        tokenResponse: true,
      },
    });
    const refreshToken = login.json().data.refreshToken;
    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken,
        tokenResponse: true,
      },
    });
    const reusedRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken,
        tokenResponse: true,
      },
    });

    await app.close();

    expect(firstRefresh.statusCode, firstRefresh.body).toBe(200);
    expect(firstRefresh.json().data.refreshToken).toBeTruthy();
    expect(firstRefresh.json().data.refreshToken).not.toBe(refreshToken);
    expect(reusedRefresh.statusCode, reusedRefresh.body).toBe(401);
  });

  it('rejects invalid credentials', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'WrongHorse123!',
      },
    });

    await app.close();

    expect(response.statusCode).toBe(401);
  });

  it('rejects locked users even when the password is correct', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'), {
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
      },
    });

    await app.close();

    expect(response.statusCode).toBe(401);
  });

  it('protects /me with bearer auth', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
      },
    });
    const token = login.json().data.accessToken;
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    await app.close();

    expect(me.statusCode).toBe(200);
    expect(me.headers['cache-control']).toBe('no-store');
    expect(me.json().data.user.roles).toContain('ADMIN');
  });

  it('accepts bearer auth with case-insensitive scheme casing', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
      },
    });
    const token = login.json().data.accessToken;
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `bearer ${token}`,
      },
    });

    await app.close();

    expect(me.statusCode).toBe(200);
    expect(me.json().data.user.roles).toContain('ADMIN');
  });

  it('rejects cookie-authenticated unsafe requests without a matching CSRF token', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
      },
    });
    const refreshCookie = cookiePair(login.headers['set-cookie'], 'hes_refresh_token');
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: refreshCookie,
      },
    });

    await app.close();

    expect(logout.statusCode).toBe(403);
  });

  it('logs out using the http-only refresh cookie with a CSRF token', async () => {
    const user = createAuthUser(await hashPassword('CorrectHorse123!'));
    const app = await buildApp({
      env: testEnv,
      prisma: createPrismaStub(user),
      logger: false,
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@example.com',
        password: 'CorrectHorse123!',
      },
    });
    const refreshCookie = cookiePair(login.headers['set-cookie'], 'hes_refresh_token');
    const csrfCookie = cookiePair(login.headers['set-cookie'], 'hes_csrf_token');
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: `${refreshCookie}; ${csrfCookie}`,
        'x-csrf-token': cookieValue(csrfCookie),
      },
    });

    await app.close();

    expect(logout.statusCode).toBe(200);
    expect(logout.json().data.ok).toBe(true);
    expect(logout.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('hes_access_token=;'),
        expect.stringContaining('hes_refresh_token=;'),
        expect.stringContaining('hes_csrf_token=;'),
      ]),
    );
  });
});
