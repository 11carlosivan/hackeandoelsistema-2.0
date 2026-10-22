import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { PollCard } from '@/components/PollCard';
import { SponsoredPostCard } from '@/components/SponsoredPostCard';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCommunityPosts,
  createCommunityPost,
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
} from 'lucide-react-native';

export default function CommunityFeedScreen() {
  const { colors } = useTheme();
  const { user, token, refreshAccessToken } = useAuth();
  const router = useRouter();

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

  // Comments Modal State
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<CommunityPostItem | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [savedCommunityPostIds, setSavedCommunityPostIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [postRes, adRes, pollRes, savedRes] = await Promise.all([
        fetchCommunityPosts(token),
        fetchSponsoredPosts(),
        fetchPolls(),
        getSavedCommunityPosts(),
      ]);
      setPosts(postRes);
      setSponsoredAds(adRes);
      setPolls(pollRes);
      setSavedCommunityPostIds(new Set(savedRes.map((p) => p.id)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    try {
      const comms = await fetchCommunityComments(post.id);
      setPostComments(comms || []);
    } finally {
      setLoadingComments(false);
    }
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

  // Filter posts based on activeTab
  const filteredPosts = React.useMemo(() => {
    if (activeTab === 'news') {
      return posts.filter((p) => p.user?.isNucleo || p.content.toLowerCase().includes('noticia') || p.content.toLowerCase().includes('debate'));
    }
    if (activeTab === 'community') {
      return posts.filter((p) => !p.user?.isNucleo);
    }
    return posts;
  }, [posts, activeTab]);

  // Build interleaved feed items (posts, polls, and sponsored ads)
  const feedItems = React.useMemo(() => {
    const list: Array<{ type: 'post' | 'ad' | 'poll'; data: any; key: string }> = [];

    // Fallback editorial post ONLY if no posts exist at all
    if (posts.length === 0 && !loading) {
      list.push({
        type: 'post',
        key: 'default-post-1',
        data: {
          id: 'def-1',
          content: '¿Qué significa la derogación del arancel al arroz para los productores nacionales? Abro debate.',
          likesCount: 342,
          commentsCount: 86,
          repostsCount: 24,
          isLiked: false,
          createdAt: new Date().toISOString(),
          user: {
            id: 'melvin-sena',
            displayName: 'Melvin Sena',
            username: 'melvinsena',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
            bio: 'Periodista y director de Hackeando el Sistema',
            isFollowing: true,
            isNucleo: true,
          },
        },
      });
    }

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
  }, [posts, filteredPosts, sponsoredAds, polls, loading]);

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
                @{author.username || 'usuario'} &bull; Hace un momento
              </Text>
            </View>
          </TouchableOpacity>

          {/* Botón Seguir / Siguiendo */}
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
        </View>

        {/* Content */}
        <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

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
          }}
          style={styles.promptAvatar}
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
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
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

              {/* Footer Buttons */}
              <View style={styles.modalActionsRow}>
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Community Post Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalBackdrop}
        >
          <View style={[styles.commentsModalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
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
                style={{ maxHeight: 260 }}
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
                      <Text style={[styles.commentUserName, { color: colors.text }]}>
                        {c.user?.displayName || 'Usuario'}
                      </Text>
                      <Text style={[styles.commentContent, { color: colors.text }]}>
                        {c.content}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}

            {/* Send Comment Input */}
            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.commentTextInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                placeholder={token ? 'Escribe una respuesta...' : 'Inicia sesión para responder...'}
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
