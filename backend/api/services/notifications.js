import { randomUUID } from 'node:crypto';

// In-memory Push Token registry (userId -> Set of Expo Push Tokens)
const userPushTokens = new Map();

export async function registerUserPushToken(userId, token, prisma = null) {
  if (typeof userId === 'object' && userId !== null && userId.userId) {
    prisma = userId.prisma || null;
    token = userId.token;
    userId = userId.userId;
  }
  if (!userId || !token) return;

  if (!userPushTokens.has(userId)) {
    userPushTokens.set(userId, new Set());
  }
  userPushTokens.get(userId).add(token);

  if (prisma?.$executeRawUnsafe) {
    try {
      const id = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_push_tokens (id, user_id, token, updated_at)
         VALUES (?, ?, ?, NOW(6))
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = NOW(6)`,
        id,
        userId,
        token
      );
    } catch (e) {
      console.warn('[PushToken] Error persisting token to DB:', e.message);
    }
  }
}

export async function unregisterUserPushToken(userId, prisma = null) {
  if (typeof userId === 'object' && userId !== null && userId.userId) {
    prisma = userId.prisma || null;
    userId = userId.userId;
  }
  if (!userId) return;

  userPushTokens.delete(userId);

  if (prisma?.$executeRawUnsafe) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM user_push_tokens WHERE user_id = ?`,
        userId
      );
    } catch (e) {
      console.warn('[PushToken] Error removing token from DB:', e.message);
    }
  }
}

export async function getUserPushTokens(userId, prisma = null) {
  if (typeof userId === 'object' && userId !== null && userId.userId) {
    prisma = userId.prisma || null;
    userId = userId.userId;
  }
  const inMemory = userPushTokens.get(userId);
  if (inMemory && inMemory.size > 0) {
    return Array.from(inMemory);
  }

  if (prisma?.$queryRawUnsafe) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT token FROM user_push_tokens WHERE user_id = ?`,
        userId
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const tokens = rows.map((r) => r.token).filter(Boolean);
        if (!userPushTokens.has(userId)) {
          userPushTokens.set(userId, new Set(tokens));
        } else {
          tokens.forEach((t) => userPushTokens.get(userId).add(t));
        }
        return tokens;
      }
    } catch (e) {
      console.warn('[PushToken] Error fetching tokens from DB:', e.message);
    }
  }

  return inMemory ? Array.from(inMemory) : [];
}

export async function getAllPushTokens(prisma = null) {
  const tokenSet = new Set();
  for (const set of userPushTokens.values()) {
    for (const t of set) {
      if (t) tokenSet.add(t);
    }
  }

  if (prisma?.$queryRawUnsafe) {
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT DISTINCT token FROM user_push_tokens');
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (r?.token) tokenSet.add(r.token);
        }
      }
    } catch (e) {
      console.warn('[getAllPushTokens] Error querying DB:', e.message);
    }
  }

  return Array.from(tokenSet).filter((t) => typeof t === 'string' && t.includes('PushToken'));
}

export async function broadcastExpoPushNotification({ title, body, data }, prisma = null) {
  try {
    const tokens = await getAllPushTokens(prisma);
    if (!tokens || tokens.length === 0) return;

    const chunkSize = 100;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const messages = chunk.map((token) => ({
        to: token,
        sound: 'default',
        title: title || 'Hackeando el Sistema',
        body: body || '',
        data: data || {},
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    }
  } catch (err) {
    console.warn('[broadcastExpoPushNotification] Error broadcasting:', err.message);
  }
}

export async function sendExpoPushNotification(pushToken, { title, body, data }) {
  try {
    if (!pushToken || typeof pushToken !== 'string') return;
    if (!pushToken.includes('PushToken')) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: title || 'Hackeando el Sistema',
        body: body || '',
        data: data || {},
      }),
    });
  } catch (err) {
    console.warn('[Push Notification] Error sending to Expo:', err.message);
  }
}

export async function sendPushToUser(userId, { title, body, data }, prisma = null) {
  try {
    const tokens = await getUserPushTokens(userId, prisma);
    if (!tokens || tokens.length === 0) return;
    for (const token of tokens) {
      sendExpoPushNotification(token, { title, body, data }).catch(() => {});
    }
  } catch (err) {
    console.warn('[sendPushToUser] Error:', err.message);
  }
}

export async function notifyEditorialPost({ prisma, post }) {
  try {
    if (!post?.id) return;

    // Check categories for this post
    let isEditorial = false;
    if (typeof prisma?.postCategory?.findMany === 'function') {
      try {
        const postCategories = await prisma.postCategory.findMany({
          where: { postId: post.id },
          include: { category: true },
        });

        isEditorial = postCategories.some((pc) => {
          const slug = (pc.category?.slug || '').toLowerCase();
          const name = (pc.category?.name || '').toLowerCase();
          return slug === 'editorial' || name.includes('editorial');
        });
      } catch (err) {
        console.warn('[notifyEditorialPost] error reading categories:', err.message);
      }
    }

    const titlePrefix = isEditorial ? '📝 Editorial: ' : '📰 ';
    const pushTitle = `${titlePrefix}${post.title || 'Hackeando el Sistema'}`;
    const pushBody = post.excerpt || (post.title ? `Lee la nota completa en Hackeando el Sistema.` : 'Nueva publicación');

    // 1. Broadcast push notification to all devices
    await broadcastExpoPushNotification({
      title: pushTitle,
      body: pushBody,
      data: {
        postId: post.id,
        slug: post.slug,
        type: isEditorial ? 'EDITORIAL' : 'POST',
      },
    }, prisma);

    // 2. Create in-app notifications for registered users
    if (
      typeof prisma?.user?.findMany === 'function' &&
      typeof prisma?.inAppNotification?.createMany === 'function'
    ) {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      if (users.length > 0) {
        const notifications = users.map((u) => ({
          userId: u.id,
          type: isEditorial ? 'EDITORIAL_POST' : 'BREAKING_NEWS',
          title: isEditorial ? 'Nuevo Editorial publicado' : (post.title || 'Nueva Noticia'),
          message: post.excerpt || post.title || 'Se ha publicado una nueva noticia en Hackeando el Sistema',
          postSlug: post.slug || null,
          postId: post.id,
          isRead: false,
        }));

        await prisma.inAppNotification.createMany({
          data: notifications,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[notifyEditorialPost] Error creating notifications:', err);
  }
}

export const notifyPublishedPost = notifyEditorialPost;

export async function notifyCommentFollowers({ prisma, commenter, post, comment, parentId }) {
  try {
    if (
      !commenter?.id ||
      !post?.id ||
      typeof prisma?.userFollow?.findMany !== 'function' ||
      typeof prisma?.inAppNotification?.createMany !== 'function'
    ) {
      return;
    }

    // 1. Find all users following the commenter
    const followers = await prisma.userFollow.findMany({
      where: { followingId: commenter.id },
      select: { followerId: true },
    });

    // 2. Check if this is a reply to another comment
    let parentAuthorId = null;
    if (parentId && typeof prisma?.comment?.findUnique === 'function') {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parent?.userId && parent.userId !== commenter.id) {
        parentAuthorId = parent.userId;
      }
    }

    const notifications = [];
    const snippet = (comment.body || '').length > 120
      ? `${(comment.body || '').slice(0, 117)}...`
      : (comment.body || '');

    for (const f of followers) {
      if (f.followerId !== commenter.id && f.followerId !== parentAuthorId) {
        notifications.push({
          userId: f.followerId,
          actorId: commenter.id,
          type: 'FOLLOWED_COMMENT',
          title: `${commenter.displayName} comentó en un post`,
          message: `"${post.title || 'Artículo'}": "${snippet}"`,
          postSlug: post.slug || null,
          postId: post.id,
          commentId: comment.id,
          isRead: false,
        });
      }
    }

    if (parentAuthorId) {
      notifications.push({
        userId: parentAuthorId,
        actorId: commenter.id,
        type: 'COMMENT_REPLY',
        title: `${commenter.displayName} respondió a tu comentario`,
        message: `"${snippet}"`,
        postSlug: post.slug || null,
        postId: post.id,
        commentId: comment.id,
        isRead: false,
      });

      // Disparar Notificación Push al dispositivo del autor original del comentario
      sendPushToUser(parentAuthorId, {
        title: `${commenter.displayName} respondió a tu comentario`,
        body: snippet,
        data: { postId: post.id, slug: post.slug, commentId: comment.id },
      }, prisma).catch(() => {});
    }

    if (notifications.length > 0) {
      await prisma.inAppNotification.createMany({
        data: notifications,
      });

      // Disparar push a los seguidores que no sean el propio autor
      for (const f of followers) {
        if (f.followerId !== commenter.id && f.followerId !== parentAuthorId) {
          sendPushToUser(f.followerId, {
            title: `${commenter.displayName} comentó en un post`,
            body: `"${post.title || 'Artículo'}": "${snippet}"`,
            data: { postId: post.id, slug: post.slug, commentId: comment.id },
          }, prisma).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[notifyCommentFollowers] Error creating notifications:', err);
  }
}

export async function notifyCommunityPostFollowers({ prisma, author, post }) {
  try {
    if (
      !author?.id ||
      !post?.id ||
      typeof prisma?.userFollow?.findMany !== 'function' ||
      typeof prisma?.inAppNotification?.createMany !== 'function'
    ) {
      return;
    }

    const followers = await prisma.userFollow.findMany({
      where: { followingId: author.id },
      select: { followerId: true },
    });

    if (followers.length === 0) return;

    const snippet = (post.content || '').length > 100
      ? `${(post.content || '').slice(0, 97)}...`
      : (post.content || '');

    const notifications = followers.map((f) => ({
      userId: f.followerId,
      actorId: author.id,
      type: 'COMMUNITY_POST',
      title: `${author.displayName || 'Un usuario que sigues'} publicó en la comunidad`,
      message: `"${snippet}"`,
      postSlug: null,
      postId: post.id,
      isRead: false,
    }));

    await prisma.inAppNotification.createMany({
      data: notifications,
    });

    // Enviar push a los seguidores
    for (const f of followers) {
      sendPushToUser(f.followerId, {
        title: `${author.displayName || 'Un usuario que sigues'} publicó en la comunidad`,
        body: snippet,
        data: { type: 'COMMUNITY_POST', postId: post.id },
      }, prisma).catch(() => {});
    }
  } catch (err) {
    console.error('[notifyCommunityPostFollowers] Error creating notifications:', err);
  }
}

export async function notifyCommunityComment({ prisma, commenter, post, comment, parentId = null }) {
  try {
    if (
      !commenter?.id ||
      !post?.id ||
      typeof prisma?.inAppNotification?.create !== 'function'
    ) {
      return;
    }

    const snippet = (comment.content || '').length > 120
      ? `${(comment.content || '').slice(0, 117)}...`
      : (comment.content || '');

    // 1. Notificar al autor de la publicación comunitaria si no es quien comenta
    if (post.userId && post.userId !== commenter.id) {
      await prisma.inAppNotification.create({
        data: {
          userId: post.userId,
          actorId: commenter.id,
          type: 'COMMUNITY_COMMENT',
          title: `${commenter.displayName} comentó en tu publicación`,
          message: `"${snippet}"`,
          postId: post.id,
          commentId: comment.id,
          isRead: false,
        },
      }).catch(() => {});

      sendPushToUser(post.userId, {
        title: `${commenter.displayName} comentó en tu publicación`,
        body: snippet,
        data: { type: 'COMMUNITY_COMMENT', postId: post.id, commentId: comment.id },
      }, prisma).catch(() => {});
    }

    // 2. Si es respuesta a un comentario previo, notificar al autor de dicho comentario
    if (parentId && typeof prisma?.communityComment?.findUnique === 'function') {
      const parent = await prisma.communityComment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parent?.userId && parent.userId !== commenter.id && parent.userId !== post.userId) {
        await prisma.inAppNotification.create({
          data: {
            userId: parent.userId,
            actorId: commenter.id,
            type: 'COMMUNITY_REPLY',
            title: `${commenter.displayName} respondió a tu comentario`,
            message: `"${snippet}"`,
            postId: post.id,
            commentId: comment.id,
            isRead: false,
          },
        }).catch(() => {});

        sendPushToUser(parent.userId, {
          title: `${commenter.displayName} respondió a tu comentario`,
          body: snippet,
          data: { type: 'COMMUNITY_REPLY', postId: post.id, commentId: comment.id },
        }, prisma).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[notifyCommunityComment] Error creating notification:', err);
  }
}
