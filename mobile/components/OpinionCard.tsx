import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { Post, togglePostLike, registerPostShare } from '@/services/api';
import { Quote, Heart, MessageSquare, Share2 } from 'lucide-react-native';

interface OpinionCardProps {
  post: Post;
}

export const OpinionCard: React.FC<OpinionCardProps> = ({ post }) => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const { showModal } = useNotification();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [comments] = useState(post.commentCount || (post.comments?.length ?? 0));
  const [shares, setShares] = useState(post.shareCount || 0);
  const [loadingLike, setLoadingLike] = useState(false);

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

  const handleShare = async () => {
    try {
      const shareUrl = `https://hackeandoelsistema.net/${post.slug}`;
      const result = await Share.share({
        title: post.title,
        message: `${post.title}\n\n${shareUrl}`,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        setShares((prev) => prev + 1);
        registerPostShare(post.id, 'native');
      }
    } catch (err) {
      // Ignored
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}
      onPress={() => router.push(`/article/${post.slug}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.topHeader}>
        <View style={[styles.pillBadge, { backgroundColor: colors.primary }]}>
          <Quote size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.pillText}>OPINIÓN Y ANÁLISIS</Text>
        </View>
      </View>

      <View style={styles.body}>
        {post.featuredImage ? (
          <Image source={{ uri: post.featuredImage }} style={styles.authorAvatar} resizeMode="cover" />
        ) : (
          <View style={[styles.authorAvatarFallback, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitial}>{(post.author?.name || 'O')[0]}</Text>
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={[styles.authorTitle, { color: colors.text }]} numberOfLines={2}>
            {post.title}
          </Text>

          <Text style={[styles.authorName, { color: colors.primary }]}>
            — {post.author?.name || 'Columnista HES'}
          </Text>

          {post.excerpt ? (
            <Text style={[styles.excerpt, { color: colors.textMuted }]} numberOfLines={2}>
              "{post.excerpt}"
            </Text>
          ) : null}
        </View>
      </View>

      {/* Barra de interacción social sincronizada */}
      <View style={[styles.engagementRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.engagementBtn} onPress={handleLike} activeOpacity={0.7}>
          <Heart size={15} color={liked ? '#EF4444' : colors.textMuted} fill={liked ? '#EF4444' : 'transparent'} />
          <Text style={[styles.engagementText, { color: liked ? '#EF4444' : colors.text }]}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.engagementBtn} onPress={() => router.push(`/article/${post.slug}` as any)} activeOpacity={0.7}>
          <MessageSquare size={15} color={colors.textMuted} />
          <Text style={[styles.engagementText, { color: colors.text }]}>{comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.engagementBtn} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={15} color={colors.textMuted} />
          <Text style={[styles.engagementText, { color: colors.text }]}>{shares}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  authorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  authorAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  authorTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 8,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  engagementText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
});
