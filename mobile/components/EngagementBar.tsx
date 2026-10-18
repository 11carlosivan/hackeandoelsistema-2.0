import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchPostEngagement, togglePostLike, togglePostSave, registerPostShare } from '@/services/api';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react-native';
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
  const { user, token, refreshUser } = useAuth();
  const { showModal, toast } = useNotification();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikeCount);
  const [saved, setSaved] = useState(false);
  const [saves, setSaves] = useState(0);
  const [comments, setComments] = useState(initialCommentCount);
  const [shares, setShares] = useState(initialShareCount);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPostEngagement(postId, token).then((data) => {
        if (data) {
          setLiked(data.liked);
          setSaved(data.saved);
          setLikes(data.counts.likes);
          setSaves(data.counts.saves);
          setComments(data.counts.comments);
          setShares(data.counts.shares);
        }
      });
    }
  }, [postId, token]);

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

    const res = await togglePostLike(postId, nextLiked, token);
    setLoadingLike(false);

    if (res) {
      setLiked(res.liked);
      setLikes(res.likeCount);
    }
  };

  const handleSave = async () => {
    if (loadingSave) return;

    if (!user || !token) {
      showModal({
        icon: 'question',
        title: 'Iniciar Sesión',
        message: 'Debes iniciar sesión con tu cuenta para guardar artículos.',
        buttons: [
          { text: 'Iniciar Sesión', style: 'primary', onPress: () => router.push('/login') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      });
      return;
    }

    const nextSaved = !saved;
    setSaved(nextSaved);
    setSaves((prev) => Math.max(0, prev + (nextSaved ? 1 : -1)));
    setLoadingSave(true);

    const res = await togglePostSave(postId, nextSaved, token);
    setLoadingSave(false);

    if (res) {
      setSaved(res.saved);
      setSaves(res.saveCount);
      toast.success(
        res.saved ? 'Artículo Guardado' : 'Guardado Eliminado',
        res.saved ? 'Puedes consultarlo desde tu perfil.' : 'Se eliminó de tus guardados.'
      );
      refreshUser();
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://hackeandoelsistema.net/${postSlug}/`;
      const result = await Share.share({
        title: postTitle,
        message: Platform.OS === 'android' ? `${postTitle}\n\n${shareUrl}` : postTitle,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        setShares((prev) => prev + 1);
        registerPostShare(postId, 'native');
      }
    } catch (err) {
      console.warn('[Share] Error sharing from EngagementBar:', err);
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

      {/* Botón de Guardar / Bookmark */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleSave}
        activeOpacity={0.7}
      >
        {loadingSave ? (
          <ActivityIndicator size="small" color="#F59E0B" />
        ) : (
          <Bookmark
            size={20}
            color={saved ? '#F59E0B' : colors.textMuted}
            fill={saved ? '#F59E0B' : 'transparent'}
          />
        )}
        <Text style={[styles.actionCount, { color: saved ? '#F59E0B' : colors.text }]}>
          {saves}
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
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 20,
  },
});
