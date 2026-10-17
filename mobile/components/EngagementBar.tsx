import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchPostEngagement, togglePostLike, registerPostShare } from '@/services/api';
import { Heart, MessageSquare, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface EngagementBarProps {
  postId: string;
  postTitle: string;
  postSlug: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialShareCount?: number;
  onCommentsPress?: () => void;
}

export const EngagementBar: React.FC<EngagementBarProps> = ({
  postId,
  postTitle,
  postSlug,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialShareCount = 0,
  onCommentsPress,
}) => {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikeCount);
  const [comments, setComments] = useState(initialCommentCount);
  const [shares, setShares] = useState(initialShareCount);
  const [loadingLike, setLoadingLike] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPostEngagement(postId, token).then((data) => {
        if (data) {
          setLiked(data.liked);
          setLikes(data.counts.likes);
          setComments(data.counts.comments);
          setShares(data.counts.shares);
        }
      });
    }
  }, [postId, token]);

  const handleLike = async () => {
    if (loadingLike) return;

    if (!user || !token) {
      Alert.alert(
        'Iniciar Sesión',
        'Debes iniciar sesión con tu cuenta para dar Me Gusta.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    setLoadingLike(true);

    const res = await togglePostLike(postId, nextLiked, token);
    setLoadingLike(false);

    if (res) {
      setLiked(res.liked);
      setLikes(res.likeCount);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://hackeandoelsistema.net/noticia/${postSlug}`;
      const result = await Share.share({
        title: postTitle,
        message: `${postTitle}\n\n${shareUrl}`,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        setShares((prev) => prev + 1);
        registerPostShare(postId, 'native');
      }
    } catch (err) {
      // Ignored
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Botón de Like */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleLike}
        activeOpacity={0.7}
      >
        {loadingLike ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Heart
            size={20}
            color={liked ? '#EF4444' : colors.textMuted}
            fill={liked ? '#EF4444' : 'transparent'}
          />
        )}
        <Text style={[styles.actionCount, { color: liked ? '#EF4444' : colors.text }]}>
          {likes}
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Botón de Comentarios */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onCommentsPress}
        activeOpacity={0.7}
      >
        <MessageSquare size={19} color={colors.textMuted} />
        <Text style={[styles.actionCount, { color: colors.text }]}>
          {comments}
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Botón de Compartir */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleShare}
        activeOpacity={0.7}
      >
        <Share2 size={19} color={colors.textMuted} />
        <Text style={[styles.actionCount, { color: colors.text }]}>
          {shares}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 20,
  },
});
