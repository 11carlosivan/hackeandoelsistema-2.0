import fp from 'fastify-plugin';

import { AUTH_COOKIE_NAMES, sanitizeUser, userAuthInclude, verifyAccessToken } from '../services/auth.js';

function getCookieValue(cookieHeader, name) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function authPlugin(app) {
  app.decorateRequest('auth', null);

  app.decorate('authenticate', async (request) => {
    const header = request.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    const cookieToken = getCookieValue(request.headers.cookie, AUTH_COOKIE_NAMES.access);
    const accessToken = scheme?.toLowerCase() === 'bearer' && token ? token : cookieToken;

    if (!accessToken) {
      throw app.httpErrors.unauthorized('Missing access token');
    }

    let payload;

    try {
      payload = await verifyAccessToken(app.config, accessToken);
    } catch {
      throw app.httpErrors.unauthorized('Invalid or expired token');
    }

    const user = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      include: userAuthInclude,
    });

    if (!user || user.status !== 'ACTIVE') {
      throw app.httpErrors.unauthorized('User is not active');
    }

    const safeUser = sanitizeUser(user);

    request.auth = {
      user,
      safeUser,
      roles: safeUser.roles,
      permissions: safeUser.permissions,
      token: {
        subject: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
      },
    };
  });

  app.decorate('requireRole', (roles = []) => async (request) => {
    await app.authenticate(request);

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const hasRole = allowedRoles.length === 0 || request.auth.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      throw app.httpErrors.forbidden('Insufficient role');
    }
  });

  app.decorate('requirePermission', (permissions = []) => async (request) => {
    await app.authenticate(request);

    const allowedPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermission =
      allowedPermissions.length === 0 ||
      request.auth.permissions.some((permission) => allowedPermissions.includes(permission));

    if (!hasPermission) {
      throw app.httpErrors.forbidden('Insufficient permission');
    }
  });
}

export const registerAuthPlugin = fp(authPlugin, {
  name: 'hackeando-auth',
});
