// In-memory Push Token registry (userId -> Set of Expo Push Tokens)
const userPushTokens = new Map();

export function registerUserPushToken(userId, token) {
  if (!userId || !token) return;
  if (!userPushTokens.has(userId)) {
    userPushTokens.set(userId, new Set());
  }
  userPushTokens.get(userId).add(token);
}

export function getUserPushTokens(userId) {
  return Array.from(userPushTokens.get(userId) || []);
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

export async function notifyEditorialPost({ prisma, post }) {
  try {
    if (
      !post?.id ||
      typeof prisma?.postCategory?.findMany !== 'function' ||
      typeof prisma?.user?.findMany !== 'function' ||
      typeof prisma?.inAppNotification?.createMany !== 'function'
    ) {
      return;
    }

    // Check categories for this post
    const postCategories = await prisma.postCategory.findMany({
      where: { postId: post.id },
      include: { category: true },
    });

    const isEditorial = postCategories.some((pc) => {
      const slug = (pc.category?.slug || '').toLowerCase();
      const name = (pc.category?.name || '').toLowerCase();
      return slug === 'editorial' || name.includes('editorial');
    });

    if (!isEditorial) return;

    // Fetch all active registered users
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (users.length === 0) return;

    // Create notifications for all active users
    const notifications = users.map((u) => ({
      userId: u.id,
      type: 'EDITORIAL_POST',
      title: 'Nuevo Editorial publicado',
      message: post.title || 'Se ha publicado un nuevo editorial en Hackeando el Sistema',
      postSlug: post.slug || null,
      postId: post.id,
      isRead: false,
    }));

    await prisma.inAppNotification.createMany({
      data: notifications,
    });
  } catch (err) {
    console.error('[notifyEditorialPost] Error creating notifications:', err);
  }
}

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
      const tokens = userPushTokens.get(parentAuthorId);
      if (tokens && tokens.size > 0) {
        for (const pt of tokens) {
          sendExpoPushNotification(pt, {
            title: `${commenter.displayName} respondió a tu comentario`,
            body: snippet,
            data: { postId: post.id, slug: post.slug, commentId: comment.id },
          }).catch(() => {});
        }
      }
    }

    if (notifications.length > 0) {
      await prisma.inAppNotification.createMany({
        data: notifications,
      });
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
  } catch (err) {
    console.error('[notifyCommunityPostFollowers] Error creating notifications:', err);
  }
}
