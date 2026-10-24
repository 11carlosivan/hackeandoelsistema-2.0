import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { PollCard } from '@/components/PollCard';
import { SponsoredPostCard } from '@/components/SponsoredPostCard';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchCommunityPosts,
  fetchCommunityPostById,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  toggleCommunityPostLike,
  fetchCommunityComments,
  submitCommunityComment,
  repostCommunityPost,
  fetchSponsoredPosts,
  fetchPolls,
  resolveImageUrl,
  CommunityPostItem,
  SponsoredPostItem,
  PollItem,
  toggleFollowUser,
  getSavedCommunityPosts,
  toggleSaveCommunityPost,
  reportCommunityPost,
  blockUser,
  getBlockedUserIds,
} from '@/services/api';
import {
  Send,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  BarChart2,
  Bookmark,
  Sparkles,
  Users,
  Flame,
  PlusCircle,
  X,
  UserCheck,
  MoreVertical,
  Edit3,
  Trash2,
  Camera,
  Flag,
  ShieldAlert,
  CornerDownRight,
} from 'lucide-react-native';

export default function CommunityFeedScreen() {
  const { colors } = useTheme();
  const { user, token, refreshAccessToken } = useAuth();
  const router = useRouter();
  const { postId: targetPostId, commentId: targetCommentId } = useLocalSearchParams<{ postId?: string; commentId?: string }>();
  const handledTargetPostRef = useRef<string | null>(null);

  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'all' | 'news' | 'community'>('all');
  const [posts, setPosts] = useState<CommunityPostItem[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredPostItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Post Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Edit Post Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPostItem | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [updatingPost, setUpdatingPost] = useState(false);

  // Blocked users & Image state
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Comments Modal State
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<CommunityPostItem | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<{ id: string; user: string } | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const [savedCommunityPostIds, setSavedCommunityPostIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [postRes, adRes, pollRes, savedRes, blockedRes] = await Promise.all([
        fetchCommunityPosts(token),
        fetchSponsoredPosts(),
        fetchPolls(),
        getSavedCommunityPosts(),
        getBlockedUserIds(),
      ]);
      setPosts(postRes);
      setSponsoredAds(adRes);
      setPolls(pollRes);
      setSavedCommunityPostIds(new Set(savedRes.map((p) => p.id)));
      setBlockedUserIds(blockedRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Si se abre desde una notificación con postId, abrir automáticamente los comentarios de la publicación
  useEffect(() => {
    if (targetPostId && handledTargetPostRef.current !== targetPostId) {
      setActiveTab('community');
      handledTargetPostRef.current = targetPostId;

      const existing = posts.find((p) => p.id === targetPostId);
      if (existing) {
        handleOpenComments(existing);
      } else {
        fetchCommunityPostById(targetPostId).then((foundPost) => {
          if (foundPost) {
            handleOpenComments(foundPost);
          } else {
            fetchCommunityComments(targetPostId).then((comms) => {
              setSelectedPostForComments({
                id: targetPostId,
                content: 'Publicación comunitaria',
                createdAt: new Date().toISOString(),
                user: { id: '', displayName: 'Comunidad HES', username: 'comunidad' },
                likesCount: 0,
                commentsCount: comms?.length || 0,
                repostsCount: 0,
                isLiked: false,
              });
              setPostComments(comms || []);
              setCommentsModalVisible(true);
            });
          }
        });
      }
    }
  }, [targetPostId, posts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreatePost = async () => {
    if (!token) {
      Alert.alert('Inicia sesión', 'Debes registrarte o iniciar sesión para publicar en el feed comunitario.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar Sesión', onPress: () => router.push('/login' as any) },
      ]);
      return;
    }

    if (!postText.trim()) {
      Alert.alert('Contenido requerido', 'Escribe algo para tu publicación comunitaria.');
      return;
    }

    if (postText.length > 250) {
      Alert.alert('Límite excedido', 'Tu publicación no puede superar los 250 caracteres.');
      return;
    }

    let pollData = null;
    if (showPollBuilder && pollQuestion.trim() && pollOption1.trim() && pollOption2.trim()) {
      pollData = {
        question: pollQuestion.trim(),
        options: [pollOption1.trim(), pollOption2.trim()],
        expiresDays: 3,
      };
    }

    setPublishing(true);
    let activeToken = token;
    let res = await createCommunityPost(
      {
        content: postText.trim(),
        mediaUrl: selectedImage,
        poll: pollData,
      },
      activeToken
    );

    // Si falló por token expirado, auto-refrescamos la sesión en segundo plano y reintentamos
    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const freshToken = await refreshAccessToken();
      if (freshToken) {
        activeToken = freshToken;
        res = await createCommunityPost(
          {
            content: postText.trim(),
            mediaUrl: selectedImage,
            poll: pollData,
          },
          activeToken
        );
      }
    }

    setPublishing(false);

    if (res.success && res.post) {
      setPosts([res.post, ...posts]);
      setPostText('');
      setSelectedImage(null);
      setPollQuestion('');
      setPollOption1('');
      setPollOption2('');
      setShowPollBuilder(false);
      setModalVisible(false);
      Alert.alert('¡Publicado!', 'Tu post se ha compartido con la comunidad y tus seguidores han sido notificados.');
    } else {
      Alert.alert('Error', res.error || 'No se pudo crear la publicación.');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setSelectedImage(asset.uri);
        }
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  const handlePressOptions = (post: CommunityPostItem) => {
    const isOwner = Boolean(
      user && (user.id === post.user?.id || user.username === post.user?.username || (Array.isArray(user.roles) && user.roles.some((r: string) => ['admin', 'superadmin', 'editor'].includes(r.toLowerCase()))))
    );

    if (isOwner) {
      Alert.alert(
        'Opciones de publicación',
        '¿Qué deseas hacer con tu publicación?',
        [
          {
            text: 'Editar publicación',
            onPress: () => handleStartEdit(post),
          },
          {
            text: 'Eliminar publicación',
            style: 'destructive',
            onPress: () => handleConfirmDelete(post),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        'Opciones de moderación',
        `Acciones para @${post.user?.username || 'usuario'}`,
        [
          {
            text: '🚩 Reportar publicación',
            onPress: () => handleReportPost(post),
          },
          {
            text: `🚫 Bloquear a @${post.user?.username || 'usuario'}`,
            style: 'destructive',
            onPress: () => handleBlockUser(post.user?.id, post.user?.username),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleReportPost = (post: CommunityPostItem) => {
    Alert.alert(
      'Reportar publicación',
      'Selecciona el motivo por el cual reportas este contenido. Nuestro equipo de moderación lo revisará en menos de 24 horas:',
      [
        {
          text: 'Spam o publicidad engañosa',
          onPress: () => submitReport(post.id, 'SPAM'),
        },
        {
          text: 'Acoso o difamación',
          onPress: () => submitReport(post.id, 'HARASSMENT'),
        },
        {
          text: 'Discurso de odio o violencia',
          onPress: () => submitReport(post.id, 'HATE_SPEECH'),
        },
        {
          text: 'Desinformación grave',
          onPress: () => submitReport(post.id, 'MISINFORMATION'),
        },
        {
          text: 'Contenido inapropiado',
          onPress: () => submitReport(post.id, 'INAPPROPRIATE'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (postId: string, reason: string) => {
    const res = await reportCommunityPost(postId, reason, '', token);
    Alert.alert(
      'Reporte enviado',
      res.message || 'Gracias por avisarnos. El equipo de moderación revisará la publicación en un plazo máximo de 24 horas y tomará las medidas oportunas.'
    );
  };

  const handleBlockUser = (authorId?: string, username?: string | null) => {
    if (!authorId) return;
    Alert.alert(
      'Bloquear usuario',
      `¿Estás seguro de que deseas bloquear a @${username || 'usuario'}? No volverás a ver sus publicaciones ni comentarios en la comunidad.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            const updated = await blockUser(authorId);
            setBlockedUserIds(updated);
            setPosts((prev) => prev.filter((p) => p.user?.id !== authorId));
            Alert.alert(
              'Usuario bloqueado',
              `Has bloqueado a @${username || 'usuario'}. Ya no verás sus publicaciones.`
            );
          },
        },
      ]
    );
  };

  const handleStartEdit = (post: CommunityPostItem) => {
    setEditingPost(post);
    setEditPostText(post.content);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !token) return;
    const trimmed = editPostText.trim();
    if (!trimmed) {
      Alert.alert('Contenido requerido', 'El contenido no puede estar vacío.');
      return;
    }
    if (trimmed.length > 250) {
      Alert.alert('Límite excedido', 'Tu publicación no puede superar los 250 caracteres.');
      return;
    }

    setUpdatingPost(true);
    let activeToken = token;
    let res = await updateCommunityPost(editingPost.id, { content: trimmed }, activeToken);

    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const freshToken = await refreshAccessToken();
      if (freshToken) {
        activeToken = freshToken;
        res = await updateCommunityPost(editingPost.id, { content: trimmed }, activeToken);
      }
    }

    setUpdatingPost(false);

    if (res.success && res.post) {
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, content: trimmed } : p))
      );
      setEditModalVisible(false);
      setEditingPost(null);
      Alert.alert('¡Actualizado!', 'La publicación ha sido editada exitosamente.');
    } else {
      Alert.alert('Error', res.error || 'No se pudo actualizar la publicación.');
    }
  };

  const handleConfirmDelete = (post: CommunityPostItem) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que deseas eliminar este post? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            // Optimistic deletion
            setPosts((prev) => prev.filter((p) => p.id !== post.id));

            let activeToken = token;
            let res = await deleteCommunityPost(post.id, activeToken);

            if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
              const freshToken = await refreshAccessToken();
              if (freshToken) {
                activeToken = freshToken;
                res = await deleteCommunityPost(post.id, activeToken);
              }
            }

            if (!res.success) {
              // Rollback if failure
              setPosts((prev) => [post, ...prev]);
              Alert.alert('Error', res.error || 'No se pudo eliminar la publicación.');
            } else {
              Alert.alert('Eliminado', 'La publicación ha sido eliminada exitosamente.');
            }
          },
        },
      ]
    );
  };

  const handleToggleLike = async (postId: string) => {
    if (!token) {
      router.push('/login' as any);
      return;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasLiked = p.isLiked;
          return {
            ...p,
            isLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    await toggleCommunityPostLike(postId, token);
  };

  const handleOpenComments = async (post: CommunityPostItem) => {
    setSelectedPostForComments(post);
    setCommentsModalVisible(true);
    setLoadingComments(true);
    setPostComments([]);
    setReplyingToComment(null);
    try {
      const comms = await fetchCommunityComments(post.id);
      setPostComments(comms || []);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleStartReplyCommunity = (c: any) => {
    const username = c.user?.username || c.user?.displayName || 'usuario';
    setReplyingToComment({ id: c.id, user: username });
    setNewCommentText(`@${username} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const handleSendCommunityComment = async () => {
    if (!token) {
      setCommentsModalVisible(false);
      router.push('/login' as any);
      return;
    }
    const text = newCommentText.trim();
    if (!text || !selectedPostForComments) return;

    setSubmittingComment(true);
    let activeToken = token;
    let res = await submitCommunityComment(selectedPostForComments.id, text, activeToken);
    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        activeToken = fresh;
        res = await submitCommunityComment(selectedPostForComments.id, text, activeToken);
      }
    }
    setSubmittingComment(false);

    if (res.success && res.comment) {
      setPostComments((prev) => [...prev, res.comment]);
      setNewCommentText('');
      setReplyingToComment(null);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPostForComments.id
            ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
            : p
        )
      );
    } else {
      Alert.alert('Error', res.error || 'No se pudo enviar el comentario');
    }
  };

  const handleRepost = async (postId: string) => {
    if (!token) {
      router.push('/login' as any);
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, repostsCount: (p.repostsCount || 0) + 1 }
          : p
      )
    );
    let activeToken = token;
    let res = await repostCommunityPost(postId, activeToken);
    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        activeToken = fresh;
        res = await repostCommunityPost(postId, activeToken);
      }
    }
    Alert.alert('¡Republicado!', 'Has compartido esta publicación en la comunidad.');
  };

  const handleShare = async (post: CommunityPostItem) => {
    try {
      const shareUrl = `https://hackeandoelsistema.net/comunidad#post-${post.id}`;
      await Share.share({
        title: 'Publicación en Hackeando el Sistema',
        message: `${post.user?.displayName || 'Usuario'}: "${post.content}"\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.warn('Error sharing community post:', e);
    }
  };

  const handleToggleBookmark = async (post: CommunityPostItem) => {
    const isNowSaved = await toggleSaveCommunityPost(post);
    setSavedCommunityPostIds((prev) => {
      const next = new Set(prev);
      if (isNowSaved) {
        next.add(post.id);
      } else {
        next.delete(post.id);
      }
      return next;
    });
  };

  const handleToggleFollow = async (authorId: string) => {
    if (!token) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para seguir a otros usuarios de la comunidad.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar Sesión', onPress: () => router.push('/login' as any) },
      ]);
      return;
    }

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.user?.id === authorId) {
          return {
            ...p,
            user: {
              ...p.user,
              isFollowing: !p.user.isFollowing,
            },
          };
        }
        return p;
      })
    );

    let activeToken = token;
    let res = await toggleFollowUser(authorId, activeToken);
    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const freshToken = await refreshAccessToken();
      if (freshToken) {
        activeToken = freshToken;
        res = await toggleFollowUser(authorId, activeToken);
      }
    }

    if (!res.success) {
      // Revert optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.user?.id === authorId) {
            return {
              ...p,
              user: {
                ...p.user,
                isFollowing: !p.user.isFollowing,
              },
            };
          }
          return p;
        })
      );
      Alert.alert('Error', res.error || 'No se pudo actualizar el seguimiento');
    }
  };

  // Helper for dynamic relative time
  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return 'Hace un momento';
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffMs = Math.max(0, now - past);
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Ahora';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return new Date(dateString).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' });
  };

  // Filter posts based on activeTab and exclude blocked users
  const filteredPosts = React.useMemo(() => {
    const unblocked = posts.filter((p) => !blockedUserIds.includes(p.user?.id));
    if (activeTab === 'news') {
      return unblocked.filter((p) => p.user?.isNucleo || p.content.toLowerCase().includes('noticia') || p.content.toLowerCase().includes('debate'));
    }
    if (activeTab === 'community') {
      return unblocked.filter((p) => !p.user?.isNucleo);
    }
    return unblocked;
  }, [posts, activeTab, blockedUserIds]);

  // Build interleaved feed items (posts, polls, and sponsored ads)
  const feedItems = React.useMemo(() => {
    const list: Array<{ type: 'post' | 'ad' | 'poll'; data: any; key: string }> = [];

    filteredPosts.forEach((p, idx) => {
      list.push({ type: 'post', data: p, key: `post-${p.id}` });

      // Insert sponsored ad every 3 posts
      if (idx === 1 && sponsoredAds.length > 0) {
        list.push({ type: 'ad', data: sponsoredAds[0], key: `ad-${sponsoredAds[0].id}` });
      }

      // Insert poll if available
      if (idx === 2 && polls.length > 0) {
        list.push({ type: 'poll', data: polls[0], key: `poll-${polls[0].id}` });
      }

      if (idx === 4 && sponsoredAds.length > 1) {
        list.push({ type: 'ad', data: sponsoredAds[1], key: `ad-${sponsoredAds[1].id}` });
      }
    });

    // If no community posts yet, show poll & ad
    if (posts.length === 0) {
      if (polls.length > 0) {
        list.push({ type: 'poll', data: polls[0], key: `poll-default` });
      }
      if (sponsoredAds.length > 0) {
        list.push({ type: 'ad', data: sponsoredAds[0], key: `ad-default` });
      }
    }

    return list;
  }, [posts, filteredPosts, sponsoredAds, polls]);

  const renderItem = ({ item }: { item: { type: 'post' | 'ad' | 'poll'; data: any; key: string } }) => {
    if (item.type === 'ad') {
      return <SponsoredPostCard ad={item.data} />;
    }

    if (item.type === 'poll') {
      return <PollCard poll={item.data} />;
    }

    const post = item.data as CommunityPostItem;
    const author = post.user;

    return (
      <View style={[styles.postCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {/* Header Row */}
        <View style={styles.postHeaderRow}>
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() => router.push(`/user/${author.id}` as any)}
            activeOpacity={0.7}
          >
            {author.avatarUrl ? (
              <Image source={{ uri: resolveImageUrl(author.avatarUrl) || author.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>
                  {(author.displayName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.authorMeta}>
              <View style={styles.nameRow}>
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {author.displayName}
                </Text>
                {author.isNucleo ? (
                  <View style={styles.nucleoBadge}>
                    <UserCheck size={10} color="#DC2626" style={{ marginRight: 2 }} />
                    <Text style={styles.nucleoText}>Núcleo</Text>
                  </View>
                ) : author.isFollowing ? (
                  <View style={[styles.siguiendoBadge, { backgroundColor: colors.inputBackground }]}>
                    <Text style={[styles.siguiendoText, { color: colors.textMuted }]}>Siguiendo</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.usernameText, { color: colors.textMuted }]}>
                @{author.username || 'usuario'} &bull; {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action buttons on post header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {(!user || user.id !== author.id) && (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  author.isFollowing
                    ? { borderColor: colors.border, backgroundColor: 'transparent' }
                    : { backgroundColor: '#DC2626', borderColor: '#DC2626' },
                ]}
                onPress={() => handleToggleFollow(author.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    { color: author.isFollowing ? colors.textMuted : '#FFFFFF' },
                  ]}
                >
                  {author.isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ padding: 6 }}
              onPress={() => handlePressOptions(post)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreVertical size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

        {/* Attached Image if present */}
        {post.mediaUrl ? (
          <Image
            source={{ uri: post.mediaUrl, cache: 'force-cache' }}
            style={{ width: '100%', height: 220, borderRadius: 10, marginTop: 10, backgroundColor: colors.inputBackground }}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : null}

        {/* Embedded Poll if present */}
        {post.poll ? (
          <View style={{ marginTop: 10 }}>
            <PollCard poll={post.poll} />
          </View>
        ) : null}

        {/* Action Row */}
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleToggleLike(post.id)}
            activeOpacity={0.7}
          >
            <Heart
              size={18}
              color={post.isLiked ? '#DC2626' : colors.textMuted}
              fill={post.isLiked ? '#DC2626' : 'transparent'}
            />
            <Text
              style={[
                styles.actionCount,
                { color: post.isLiked ? '#DC2626' : colors.textMuted, fontWeight: post.isLiked ? '800' : '600' },
              ]}
            >
              {post.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenComments(post)}
            activeOpacity={0.7}
          >
            <MessageCircle size={18} color={colors.textMuted} />
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>
              {post.commentsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleRepost(post.id)}
            activeOpacity={0.7}
          >
            <Repeat2 size={18} color={colors.textMuted} />
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>
              {post.repostsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(post)}
            activeOpacity={0.7}
          >
            <Share2 size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleToggleBookmark(post)}
            activeOpacity={0.7}
          >
            <Bookmark
              size={18}
              color={savedCommunityPostIds.has(post.id) ? '#DC2626' : colors.textMuted}
              fill={savedCommunityPostIds.has(post.id) ? '#DC2626' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      {/* Tabs Row */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.activeTabBtn]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'all' ? colors.primary : colors.textMuted },
              activeTab === 'all' && styles.activeTabText,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'news' && styles.activeTabBtn]}
          onPress={() => setActiveTab('news')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'news' ? colors.primary : colors.textMuted },
              activeTab === 'news' && styles.activeTabText,
            ]}
          >
            Sobre esta noticia
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'community' && styles.activeTabBtn]}
          onPress={() => setActiveTab('community')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'community' ? colors.primary : colors.textMuted },
              activeTab === 'community' && styles.activeTabText,
            ]}
          >
            Comunidad
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Post Prompt Card */}
      <TouchableOpacity
        style={[styles.promptCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => {
          if (!token) {
            router.push('/login' as any);
          } else {
            setModalVisible(true);
          }
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{
            uri: resolveImageUrl(user?.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            cache: 'force-cache',
          }}
          style={styles.promptAvatar}
          fadeDuration={0}
        />
        <Text style={[styles.promptPlaceholder, { color: colors.textMuted }]}>
          ¿Qué opinas? Publica en la comunidad (máx. 250 car)...
        </Text>
        <PlusCircle size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Main Stream */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando feed comunitario...</Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Users size={36} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
                Aún no hay publicaciones
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                Sé el primero en compartir tu opinión con la comunidad de Hackeando el Sistema.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* New Community Post Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                paddingBottom: keyboardHeight > 0
                  ? (Platform.OS === 'android' ? keyboardHeight + 10 : 18)
                  : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 18),
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva publicación comunitaria</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Input with 250 character countdown */}
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                placeholder="Escribe tu opinión o comparte información (máx. 250 caracteres)..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={250}
                value={postText}
                onChangeText={setPostText}
                autoFocus
              />

              <View style={styles.charCountRow}>
                <Text
                  style={[
                    styles.charCountText,
                    { color: postText.length >= 240 ? '#DC2626' : colors.textMuted },
                  ]}
                >
                  {250 - postText.length} caracteres restantes
                </Text>
              </View>

              {/* Optional Poll Builder */}
              {showPollBuilder && (
                <View style={[styles.pollBuilderBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Text style={[styles.pollBuilderTitle, { color: colors.primary }]}>Agregar Encuesta:</Text>
                  <TextInput
                    style={[styles.pollInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Pregunta de la encuesta..."
                    placeholderTextColor={colors.textMuted}
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />
                  <TextInput
                    style={[styles.pollInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Opción 1"
                    placeholderTextColor={colors.textMuted}
                    value={pollOption1}
                    onChangeText={setPollOption1}
                  />
                  <TextInput
                    style={[styles.pollInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Opción 2"
                    placeholderTextColor={colors.textMuted}
                    value={pollOption2}
                    onChangeText={setPollOption2}
                  />
                </View>
              )}

              {/* Optional Selected Image Preview */}
              {selectedImage && (
                <View style={{ marginTop: 10, position: 'relative' }}>
                  <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 180, borderRadius: 8 }} resizeMode="cover" />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setSelectedImage(null)}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Footer Buttons */}
              <View style={styles.modalActionsRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Subir foto oculto temporalmente a petición del usuario para soporte futuro */}
                  {/*
                  <TouchableOpacity
                    style={[
                      styles.pollToggleBtn,
                      { backgroundColor: selectedImage ? colors.primary : colors.inputBackground },
                    ]}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    <Camera size={16} color={selectedImage ? '#FFFFFF' : colors.text} />
                    <Text style={[styles.pollToggleText, { color: selectedImage ? '#FFFFFF' : colors.text }]}>
                      {selectedImage ? 'Cambiar foto' : 'Foto'}
                    </Text>
                  </TouchableOpacity>
                  */}

                  <TouchableOpacity
                    style={[
                      styles.pollToggleBtn,
                      { backgroundColor: showPollBuilder ? colors.primary : colors.inputBackground },
                    ]}
                    onPress={() => setShowPollBuilder(!showPollBuilder)}
                    activeOpacity={0.7}
                  >
                    <BarChart2 size={16} color={showPollBuilder ? '#FFFFFF' : colors.text} />
                    <Text
                      style={[
                        styles.pollToggleText,
                        { color: showPollBuilder ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {showPollBuilder ? 'Quitar Encuesta' : 'Encuesta'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.publishBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreatePost}
                  disabled={publishing || !postText.trim()}
                  activeOpacity={0.8}
                >
                  {publishing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.publishBtnText}>Publicar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Store EULA Compliance Warning */}
              <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 10, color: colors.textMuted, lineHeight: 14 }}>
                  Al publicar aceptas las Normas de la Comunidad HES (tolerancia cero a odio, acoso, spam o difamación; las infracciones implican suspensión permanente de la cuenta).
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Community Post Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                paddingBottom: keyboardHeight > 0
                  ? (Platform.OS === 'android' ? keyboardHeight + 10 : 18)
                  : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 18),
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Editar publicación</Text>
                </View>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Input with 250 character countdown */}
              <TextInput
                style={[styles.modalInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                placeholder="Modifica tu publicación (máx. 250 caracteres)..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={250}
                value={editPostText}
                onChangeText={setEditPostText}
                autoFocus
              />

              <View style={styles.charCountRow}>
                <Text
                  style={[
                    styles.charCountText,
                    { color: editPostText.length >= 240 ? '#DC2626' : colors.textMuted },
                  ]}
                >
                  {250 - editPostText.length} caracteres restantes
                </Text>
              </View>

              {/* Footer Buttons */}
              <View style={[styles.modalActionsRow, { justifyContent: 'flex-end' }]}>
                <TouchableOpacity
                  style={[styles.publishBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                  disabled={updatingPost || !editPostText.trim()}
                  activeOpacity={0.8}
                >
                  {updatingPost ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.publishBtnText}>Guardar cambios</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Community Post Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.commentsModalCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                paddingBottom: keyboardHeight > 0
                  ? (Platform.OS === 'android' ? keyboardHeight + 10 : 16)
                  : Math.max(insets.bottom, Platform.OS === 'android' ? 32 : 16),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Comentarios</Text>
              </View>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Post Context Preview */}
            {selectedPostForComments && (
              <View style={[styles.commentsPostPreview, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.previewAuthor, { color: colors.primary }]}>
                  {selectedPostForComments.user?.displayName || 'Usuario'}:
                </Text>
                <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
                  {selectedPostForComments.content}
                </Text>
              </View>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 12 }}>Cargando comentarios...</Text>
              </View>
            ) : postComments.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sé el primero en comentar esta publicación.</Text>
              </View>
            ) : (
              <FlatList
                data={postComments}
                keyExtractor={(c) => c.id || String(Math.random())}
                style={{ maxHeight: keyboardHeight > 0 ? 150 : 260 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item: c }) => (
                  <View style={[styles.communityCommentRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.commentAvatar}>
                      {c.user?.avatarUrl ? (
                        <Image source={{ uri: resolveImageUrl(c.user.avatarUrl) || c.user.avatarUrl }} style={styles.avatarMini} />
                      ) : (
                        <View style={[styles.avatarMiniFallback, { backgroundColor: colors.primary }]}>
                          <Text style={styles.avatarInitialMini}>
                            {(c.user?.displayName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={[styles.commentUserName, { color: colors.text }]}>
                          {c.user?.displayName || 'Usuario'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleStartReplyCommunity(c)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 6 }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <CornerDownRight size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>Responder</Text>
                        </TouchableOpacity>
                      </View>
                      {c.createdAt ? (
                        <Text style={{ fontSize: 10.5, color: colors.textMuted, marginBottom: 4 }}>
                          {formatRelativeTime(c.createdAt)}
                        </Text>
                      ) : null}
                      <Text style={[styles.commentContent, { color: colors.text }]}>
                        {c.content}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Replying Banner */}
            {replyingToComment && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.inputBackground, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CornerDownRight size={13} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    Respondiendo a <Text style={{ color: colors.primary, fontWeight: '700' }}>@{replyingToComment.user}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setReplyingToComment(null); setNewCommentText(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Send Comment Input */}
            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
              <TextInput
                ref={commentInputRef}
                style={[styles.commentTextInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                placeholder={token ? (replyingToComment ? `Responde a @${replyingToComment.user}...` : 'Escribe una respuesta...') : 'Inicia sesión para responder...'}
                placeholderTextColor={colors.textMuted}
                value={newCommentText}
                onChangeText={setNewCommentText}
                editable={!submittingComment}
              />
              <TouchableOpacity
                style={[styles.sendCommentBtn, { backgroundColor: colors.primary, opacity: submittingComment || !newCommentText.trim() ? 0.6 : 1 }]}
                onPress={handleSendCommunityComment}
                disabled={submittingComment || !newCommentText.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: '#DC2626',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    fontWeight: '900',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  promptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#374151',
  },
  promptPlaceholder: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  authorMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '800',
  },
  nucleoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  nucleoText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  siguiendoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  siguiendoText: {
    fontSize: 10,
    fontWeight: '700',
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 8,
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  usernameText: {
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionCount: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalInput: {
    height: 100,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 10,
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pollBuilderBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  pollBuilderTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  pollInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    marginBottom: 6,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pollToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pollToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  commentsModalCard: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  commentsPostPreview: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  previewText: {
    fontSize: 13,
  },
  communityCommentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarMiniFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialMini: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  commentAvatar: {
    marginTop: 2,
  },
  commentUserName: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
