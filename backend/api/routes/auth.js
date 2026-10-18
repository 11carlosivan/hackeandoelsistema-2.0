import { z } from 'zod';

import {
  AUTH_COOKIE_NAMES,
  createCsrfToken,
  createRefreshSession,
  hashPassword,
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
import { noStoreHeaders } from '../utils/http.js';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  tokenResponse: z.boolean().optional(),
});

const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(160),
  email: z.string().email('El correo no es válido').max(255),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
  age: z.coerce.number().int().min(14, 'Debes tener al menos 14 años').max(120, 'Edad no válida').optional(),
  termsAccepted: z.boolean().optional(),
  tokenResponse: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(160).optional(),
  bio: z.string().max(2000).optional().nullable(),
  avatarUrl: z.string().max(768).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  websiteUrl: z.string().max(768).optional().nullable(),
  facebookUrl: z.string().max(768).optional().nullable(),
  instagramUrl: z.string().max(768).optional().nullable(),
  xUrl: z.string().max(768).optional().nullable(),
  youtubeUrl: z.string().max(768).optional().nullable(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
  tokenResponse: z.boolean().optional(),
});

const logoutSchema = refreshSchema.optional();

function authResponse({ user, access, refreshToken, includeRefreshToken = false }) {
  return {
    data: {
      user: sanitizeUser(user),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      ...(includeRefreshToken ? { refreshToken } : {}),
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

async function ensureMemberRole(prisma) {
  const permission = await prisma.permission.upsert({
    where: { permissionKey: 'account:read' },
    create: {
      permissionKey: 'account:read',
      description: 'Basic account access',
    },
    update: {},
  });
  const role = await prisma.role.upsert({
    where: { name: 'MEMBER' },
    create: {
      name: 'MEMBER',
      description: 'Acceso basico de miembro.',
    },
    update: {},
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: role.id,
        permissionId: permission.id,
      },
    },
    create: {
      roleId: role.id,
      permissionId: permission.id,
    },
    update: {},
  });

  return role;
}

export async function registerAuthRoutes(app) {
  app.post('/api/v1/auth/register', async (request, reply) => {
    noStoreHeaders(reply);

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      const message = firstIssue?.message || 'Datos de registro incompletos o inválidos';
      throw app.httpErrors.badRequest(message);
    }

    const email = normalizeEmail(parsed.data.email);
    const existingUser = await app.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw app.httpErrors.conflict('Este correo ya está registrado. Por favor inicia sesión.');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await app.prisma.$transaction(async (tx) => {
      const memberRole = await ensureMemberRole(tx);
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: parsed.data.displayName,
          status: 'ACTIVE',
          passwordChangedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: memberRole.id,
        },
      });

      return tx.user.findUnique({
        where: { id: createdUser.id },
        include: userAuthInclude,
      });
    });

    const [access, refresh] = await Promise.all([
      signAccessToken({ config: app.config, user }),
      createRefreshSession({ prisma: app.prisma, config: app.config, request, userId: user.id }),
      recordSecurityEvent({
        prisma: app.prisma,
        request,
        userId: user.id,
        eventType: 'LOGIN_SUCCESS',
        metadata: {
          source: 'register',
          age: parsed.data.age ?? null,
          termsAccepted: Boolean(parsed.data.termsAccepted),
        },
      }),
    ]);

    setAuthCookies(reply, app, access, refresh.refreshToken);
    reply.code(201);

    return authResponse({
      user,
      access,
      refreshToken: refresh.refreshToken,
      includeRefreshToken: parsed.data.tokenResponse === true,
    });
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    noStoreHeaders(reply);

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
    return authResponse({
      user,
      access,
      refreshToken: refresh.refreshToken,
      includeRefreshToken: parsed.data.tokenResponse === true,
    });
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    noStoreHeaders(reply);

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
    return authResponse({
      ...rotated,
      includeRefreshToken: parsed.data.tokenResponse === true,
    });
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    noStoreHeaders(reply);

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

  async function getUserStats(userId) {
    const [followersCount, followingCount, savedPostsCount, unreadNotificationsCount] = await Promise.all([
      typeof app.prisma.userFollow?.count === 'function'
        ? app.prisma.userFollow.count({ where: { followingId: userId } })
        : 0,
      typeof app.prisma.userFollow?.count === 'function'
        ? app.prisma.userFollow.count({ where: { followerId: userId } })
        : 0,
      typeof app.prisma.savedPost?.count === 'function'
        ? app.prisma.savedPost.count({ where: { userId } })
        : 0,
      typeof app.prisma.inAppNotification?.count === 'function'
        ? app.prisma.inAppNotification.count({ where: { userId, isRead: false } })
        : 0,
    ]);
    return { followersCount, followingCount, savedPostsCount, unreadNotificationsCount };
  }

  app.get('/api/v1/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;
    const stats = await getUserStats(userId);

    return {
      data: {
        user: {
          ...request.auth.safeUser,
          ...stats,
        },
      },
    };
  });

  app.put('/api/v1/auth/profile', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;
    const body = updateProfileSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Datos de perfil no válidos');
    }

    const { displayName, bio, avatarUrl, phone, websiteUrl, facebookUrl, instagramUrl, xUrl, youtubeUrl } = body.data;

    if (displayName !== undefined && displayName !== request.auth.user.displayName) {
      await app.prisma.user.update({
        where: { id: userId },
        data: { displayName },
      });
    }

    if (typeof app.prisma.userProfile?.upsert === 'function') {
      await app.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          bio: bio ?? null,
          avatarUrl: avatarUrl ?? null,
          phone: phone ?? null,
          websiteUrl: websiteUrl ?? null,
          facebookUrl: facebookUrl ?? null,
          instagramUrl: instagramUrl ?? null,
          xUrl: xUrl ?? null,
          youtubeUrl: youtubeUrl ?? null,
        },
        update: {
          ...(bio !== undefined ? { bio } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(websiteUrl !== undefined ? { websiteUrl } : {}),
          ...(facebookUrl !== undefined ? { facebookUrl } : {}),
          ...(instagramUrl !== undefined ? { instagramUrl } : {}),
          ...(xUrl !== undefined ? { xUrl } : {}),
          ...(youtubeUrl !== undefined ? { youtubeUrl } : {}),
        },
      });
    }

    const updatedUser = await app.prisma.user.findUnique({
      where: { id: userId },
      include: userAuthInclude,
    });

    const stats = await getUserStats(userId);

    return {
      data: {
        user: {
          ...sanitizeUser(updatedUser),
          ...stats,
        },
      },
    };
  });

  app.get('/api/v1/auth/saved-posts', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    const saved = await app.prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            featuredMedia: true,
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    const posts = saved
      .filter((s) => s.post && s.post.status === 'PUBLISHED')
      .map((s) => {
        const p = s.post;
        const primaryCat = p.categories.find((c) => c.isPrimary)?.category || p.categories[0]?.category;
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          featuredImageUrl: p.featuredMedia?.url || null,
          category: primaryCat ? { id: primaryCat.id, name: primaryCat.name, slug: primaryCat.slug } : null,
          savedAt: s.createdAt,
          publishedAt: p.publishedAt,
          viewCount: p.viewCount,
          likeCount: p.likeCount,
        };
      });

    return {
      data: {
        posts,
        total: posts.length,
      },
    };
  });

  app.get('/api/v1/auth/notifications', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    const [notifications, unreadCount] = await Promise.all([
      app.prisma.inAppNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actor: {
            include: {
              profile: true,
              avatarMedia: true,
            },
          },
        },
      }),
      app.prisma.inAppNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          postSlug: n.postSlug,
          postId: n.postId,
          commentId: n.commentId,
          isRead: n.isRead,
          createdAt: n.createdAt,
          actor: n.actor ? {
            id: n.actor.id,
            displayName: n.actor.displayName,
            avatarUrl: n.actor.profile?.avatarUrl || n.actor.avatarMedia?.url || null,
          } : null,
        })),
        unreadCount,
      },
    };
  });

  app.patch('/api/v1/auth/notifications/:id/read', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;
    const { id } = request.params;

    await app.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return { data: { ok: true } };
  });

  app.post('/api/v1/auth/notifications/read-all', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    await app.prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { data: { ok: true } };
  });

  app.get('/api/v1/auth/followers', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    const list = await app.prisma.userFollow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          include: {
            profile: true,
            avatarMedia: true,
          },
        },
      },
    });

    return {
      data: {
        users: list.map((item) => ({
          id: item.follower.id,
          displayName: item.follower.displayName,
          username: item.follower.username,
          bio: item.follower.profile?.bio || null,
          avatarUrl: item.follower.profile?.avatarUrl || item.follower.avatarMedia?.url || null,
          followedAt: item.createdAt,
        })),
      },
    };
  });

  app.get('/api/v1/auth/following', { preHandler: app.authenticate }, async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    const list = await app.prisma.userFollow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          include: {
            profile: true,
            avatarMedia: true,
          },
        },
      },
    });

    return {
      data: {
        users: list.map((item) => ({
          id: item.following.id,
          displayName: item.following.displayName,
          username: item.following.username,
          bio: item.following.profile?.bio || null,
          avatarUrl: item.following.profile?.avatarUrl || item.following.avatarMedia?.url || null,
          followedAt: item.createdAt,
        })),
      },
    };
  });

  app.get('/api/v1/auth/admin-check', { preHandler: app.requireRole(['ADMIN', 'EDITOR']) }, async (request, reply) => {
    noStoreHeaders(reply);

    return {
      data: {
        ok: true,
        user: request.auth.safeUser,
      },
    };
  });

  // Apartado para que las personas registradas se puedan dar de baja (Eliminación de cuenta)
  const handleAccountDeletion = async (request, reply) => {
    noStoreHeaders(reply);
    const userId = request.auth.user.id;

    // Revocar todas las sesiones activas
    await app.prisma.userSession.deleteMany({
      where: { userId },
    });

    // Marcar usuario como DELETED y limpiar datos sensibles
    await app.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        passwordHash: null,
      },
    });

    await recordSecurityEvent({
      prisma: app.prisma,
      request,
      userId,
      eventType: 'SESSION_REVOKED',
      metadata: { action: 'account_deletion_self' },
    });

    clearAuthCookies(reply, app);
    reply.code(200);
    return {
      data: {
        ok: true,
        message: 'Tu cuenta ha sido dada de baja exitosamente.',
      },
    };
  };

  app.delete('/api/v1/auth/me', { preHandler: app.authenticate }, handleAccountDeletion);
  app.post('/api/v1/auth/delete-account', { preHandler: app.authenticate }, handleAccountDeletion);
}
