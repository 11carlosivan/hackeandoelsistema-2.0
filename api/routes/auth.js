import { z } from 'zod';

import {
  AUTH_COOKIE_NAMES,
  createCsrfToken,
  createRefreshSession,
  normalizeEmail,
  recordSecurityEvent,
  revokeRefreshSession,
  rotateRefreshSession,
  sanitizeUser,
  signAccessToken,
  userAuthInclude,
  verifyPassword,
} from '../services/auth.js';
import { addMinutes } from '../utils/crypto.js';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
});

const logoutSchema = refreshSchema.optional();

function authResponse({ user, access, refreshToken }) {
  return {
    data: {
      user: sanitizeUser(user),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
    },
  };
}

function cookieOptions(app, maxAge) {
  return [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    app.config.AUTH_COOKIE_SECURE ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function csrfCookieOptions(app, maxAge) {
  return [
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    app.config.AUTH_COOKIE_SECURE ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function setAuthCookies(reply, app, access, refreshToken) {
  const csrfToken = createCsrfToken();

  reply.header('Set-Cookie', [
    `${AUTH_COOKIE_NAMES.access}=${access.token}; ${cookieOptions(app, app.config.AUTH_ACCESS_TOKEN_TTL_SECONDS)}`,
    `${AUTH_COOKIE_NAMES.refresh}=${refreshToken}; ${cookieOptions(
      app,
      app.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    )}`,
    `${AUTH_COOKIE_NAMES.csrf}=${csrfToken}; ${csrfCookieOptions(app, app.config.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60)}`,
  ]);
}

function clearAuthCookies(reply, app) {
  reply.header('Set-Cookie', [
    `${AUTH_COOKIE_NAMES.access}=; ${cookieOptions(app, 0)}`,
    `${AUTH_COOKIE_NAMES.refresh}=; ${cookieOptions(app, 0)}`,
    `${AUTH_COOKIE_NAMES.csrf}=; ${csrfCookieOptions(app, 0)}`,
  ]);
}

function getCookieValue(cookieHeader, name) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function getRefreshTokenFromRequest(request, parsedBody) {
  return parsedBody?.refreshToken || getCookieValue(request.headers.cookie, AUTH_COOKIE_NAMES.refresh);
}

function isUserLocked(user) {
  return user?.lockedUntil && user.lockedUntil > new Date();
}

async function recordFailedLogin(app, request, user, reason) {
  if (user) {
    const failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    const lockedUntil =
      failedLoginCount >= app.config.AUTH_MAX_LOGIN_ATTEMPTS
        ? addMinutes(new Date(), app.config.AUTH_LOCKOUT_MINUTES)
        : user.lockedUntil;

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil,
      },
    });
  }

  await recordSecurityEvent({
    prisma: app.prisma,
    request,
    userId: user?.id ?? null,
    eventType: 'LOGIN_FAILED',
    metadata: { reason },
  });
}

export async function registerAuthRoutes(app) {
  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid login payload');
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await app.prisma.user.findUnique({
      where: { email },
      include: userAuthInclude,
    });

    const validPassword = await verifyPassword(user?.passwordHash, parsed.data.password);

    if (isUserLocked(user)) {
      await recordFailedLogin(app, request, user, 'locked');
      throw app.httpErrors.unauthorized('Invalid credentials');
    }

    if (!user || !validPassword || user.status !== 'ACTIVE') {
      await recordFailedLogin(
        app,
        request,
        user,
        user?.status === 'ACTIVE' ? 'invalid_credentials' : 'inactive_or_missing',
      );
      throw app.httpErrors.unauthorized('Invalid credentials');
    }

    const [access, refresh] = await Promise.all([
      signAccessToken({ config: app.config, user }),
      createRefreshSession({ prisma: app.prisma, config: app.config, request, userId: user.id }),
      app.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
    ]);

    await recordSecurityEvent({
      prisma: app.prisma,
      request,
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
    });

    setAuthCookies(reply, app, access, refresh.refreshToken);
    reply.code(200);
    return authResponse({ user, access, refreshToken: refresh.refreshToken });
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid refresh payload');
    }
    const refreshToken = getRefreshTokenFromRequest(request, parsed.data);

    if (!refreshToken) {
      throw app.httpErrors.unauthorized('Missing refresh token');
    }

    const rotated = await rotateRefreshSession({
      prisma: app.prisma,
      config: app.config,
      request,
      refreshToken,
    });

    if (!rotated) {
      throw app.httpErrors.unauthorized('Invalid refresh token');
    }

    setAuthCookies(reply, app, rotated.access, rotated.refreshToken);
    return authResponse(rotated);
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const parsed = logoutSchema.safeParse(request.body);
    if (!parsed.success) {
      throw app.httpErrors.badRequest('Invalid logout payload');
    }
    const refreshToken = getRefreshTokenFromRequest(request, parsed.data);

    if (refreshToken) {
      await revokeRefreshSession({
        prisma: app.prisma,
        config: app.config,
        refreshToken,
      });
    }
    await recordSecurityEvent({
      prisma: app.prisma,
      request,
      eventType: 'LOGOUT',
    });

    clearAuthCookies(reply, app);
    return { data: { ok: true } };
  });

  app.get('/api/v1/auth/me', { preHandler: app.authenticate }, async (request) => ({
    data: {
      user: request.auth.safeUser,
    },
  }));

  app.get('/api/v1/auth/admin-check', { preHandler: app.requireRole(['ADMIN', 'EDITOR']) }, async (request) => ({
    data: {
      ok: true,
      user: request.auth.safeUser,
    },
  }));
}
