import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { Post, togglePostLike, registerPostShare } from '@/services/api';
import { Clock, Heart, MessageSquare, Share2 } from 'lucide-react-native';

interface ArticleCardProps {
  post: Post;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ post }) => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const { showModal } = useNotification();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [comments] = useState(post.commentCount || (post.comments?.length ?? 0));
  const [shares, setShares] = useState(post.shareCount || 0);
  const [loadingLike, setLoadingLike] = useState(false);

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' })
    : '';

  const handleCardPress = () => {
    router.push(`/article/${post.slug}` as any);
  };

  const handleLike = async () => {
    if (loadingLike) return;

    if (!user || !token) {
      showModal({
        icon: 'question',
        title: 'Iniciar Sesión',
        message: 'Debes iniciar sesión con tu cuenta para dar Me Gusta.',
        buttons: [
          { text: 'Iniciar Sesión', style: 'primary', onPress: () => router.push('/login') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      });
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    setLoadingLike(true);

    const res = await togglePostLike(post.id, nextLiked, token);
    setLoadingLike(false);

    if (res) {
      setLiked(res.liked);
      setLikes(res.likeCount);
    }
  };

  const handleCommentPress = () => {
    router.push(`/article/${post.slug}` as any);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://hackeandoelsistema.net/${post.slug}/`;
      const result = await Share.share({
        title: post.title,
        message: Platform.OS === 'android' ? `${post.title}\n\n${shareUrl}` : post.title,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        setShares((prev) => prev + 1);
        registerPostShare(post.id, 'native');
      }
    } catch (err) {
      console.warn('[Share] Error sharing post:', err);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <TouchableOpacity
        onPress={handleCardPress}
        activeOpacity={0.85}
      >
        {post.featuredImage ? (
          <Image source={{ uri: post.featuredImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>HES</Text>
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: post.isOpinion ? colors.badgeOpinionBg : colors.inputBackground }]}>
              <Text style={[styles.categoryText, { color: post.isOpinion ? colors.badgeOpinionText : colors.primary }]}>
                {post.category?.toUpperCase()}
              </Text>
            </View>
            {formattedDate ? (
              <View style={styles.dateRow}>
                <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {post.title}
          </Text>

          {post.excerpt ? (
            <Text style={[styles.excerpt, { color: colors.textMuted }]} numberOfLines={2}>
              {post.excerpt}
            </Text>
          ) : null}

          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: colors.textMuted }]}>
              Por <Text style={{ fontWeight: '700', color: colors.text }}>{post.author?.name || 'Redacción HES'}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Barra de interacción social sincronizada con la web */}
      <View style={[styles.engagementRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.engagementBtn}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Heart
            size={16}
            color={liked ? '#EF4444' : colors.textMuted}
            fill={liked ? '#EF4444' : 'transparent'}
          />
          <Text style={[styles.engagementText, { color: liked ? '#EF4444' : colors.text }]}>
            {likes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementBtn}
          onPress={handleCommentPress}
          activeOpacity={0.7}
        >
          <MessageSquare size={16} color={colors.textMuted} />
          <Text style={[styles.engagementText, { color: colors.text }]}>
            {comments}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.engagementBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Share2 size={16} color={colors.textMuted} />
          <Text style={[styles.engagementText, { color: colors.text }]}>
            {shares}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  engagementText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});
