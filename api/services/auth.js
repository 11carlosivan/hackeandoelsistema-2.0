import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';

import { addDays, addSeconds, randomToken, sha256Hex } from '../utils/crypto.js';

const ACCESS_TOKEN_ALG = 'HS256';
export const AUTH_COOKIE_NAMES = {
  access: 'hes_access_token',
  refresh: 'hes_refresh_token',
  csrf: 'hes_csrf_token',
};
const PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password) {
  return argon2.hash(password, PASSWORD_OPTIONS);
}

export function createCsrfToken() {
  return randomToken(32);
}

export async function verifyPassword(hash, password) {
  if (!hash) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function getJwtSecret(config) {
  return new TextEncoder().encode(config.AUTH_JWT_SECRET);
}

export async function signAccessToken({ config, user }) {
  const now = new Date();
  const expiresAt = addSeconds(now, config.AUTH_ACCESS_TOKEN_TTL_SECONDS);
  const roles = user.roles?.map((item) => item.role.name) ?? [];
  const permissions = [
    ...new Set(
      user.roles?.flatMap((item) =>
        item.role.permissions?.map((rolePermission) => rolePermission.permission.permissionKey) ?? [],
      ) ?? [],
    ),
  ];

  const token = await new SignJWT({
    roles,
    permissions,
    email: user.email,
  })
    .setProtectedHeader({ alg: ACCESS_TOKEN_ALG })
    .setSubject(user.id)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setIssuer('hackeando-api')
    .setAudience('hackeando-cms')
    .sign(getJwtSecret(config));

  return { token, expiresAt, roles, permissions };
}

export async function verifyAccessToken(config, token) {
  const result = await jwtVerify(token, getJwtSecret(config), {
    issuer: 'hackeando-api',
    audience: 'hackeando-cms',
  });

  return result.payload;
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles?.map((item) => item.role.name) ?? [],
    permissions: [
      ...new Set(
        user.roles?.flatMap((item) =>
          item.role.permissions?.map((rolePermission) => rolePermission.permission.permissionKey) ?? [],
        ) ?? [],
      ),
    ],
  };
}

export function hashRequestMeta(request, config) {
  const ip = request.ip || request.headers['x-forwarded-for'] || '';
  const userAgent = request.headers['user-agent'] || '';
  const pepper = config.AUTH_JWT_SECRET;

  return {
    ipHash: ip ? sha256Hex(ip, pepper) : null,
    userAgentHash: userAgent ? sha256Hex(userAgent, pepper) : null,
  };
}

export async function createRefreshSession({ prisma, config, request, userId }) {
  const refreshToken = randomToken(48);
  const refreshTokenHash = sha256Hex(refreshToken, config.AUTH_JWT_SECRET);
  const now = new Date();
  const { ipHash, userAgentHash } = hashRequestMeta(request, config);
  const session = await prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash,
      ipHash,
      userAgentHash,
      expiresAt: addDays(now, config.AUTH_REFRESH_TOKEN_TTL_DAYS),
    },
  });

  return { refreshToken, session };
}

export async function revokeRefreshSession({ prisma, config, refreshToken }) {
  const refreshTokenHash = sha256Hex(refreshToken, config.AUTH_JWT_SECRET);

  return prisma.userSession.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function rotateRefreshSession({ prisma, config, request, refreshToken }) {
  const refreshTokenHash = sha256Hex(refreshToken, config.AUTH_JWT_SECRET);
  const now = new Date();
  const session = await prisma.userSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        include: userAuthInclude,
      },
    },
  });

  if (!session || session.user.status !== 'ACTIVE') {
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: now },
  });

  const nextRefresh = await createRefreshSession({
    prisma,
    config,
    request,
    userId: session.userId,
  });
  const access = await signAccessToken({ config, user: session.user });

  return {
    user: session.user,
    access,
    refreshToken: nextRefresh.refreshToken,
  };
}

export const userAuthInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
};

export async function recordSecurityEvent({ prisma, request, userId = null, eventType, metadata = {} }) {
  const { ipHash, userAgentHash } = hashRequestMeta(request, request.server.config);

  return prisma.securityEvent.create({
    data: {
      userId,
      eventType,
      ipHash,
      userAgentHash,
      metadata,
    },
  });
}
