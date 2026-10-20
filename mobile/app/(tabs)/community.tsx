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
  fetchSponsoredPosts,
  fetchPolls,
  resolveImageUrl,
  CommunityPostItem,
  SponsoredPostItem,
  PollItem,
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

  const loadData = useCallback(async () => {
    try {
      const [postRes, adRes, pollRes] = await Promise.all([
        fetchCommunityPosts(token),
        fetchSponsoredPosts(),
        fetchPolls(),
      ]);
      setPosts(postRes);
      setSponsoredAds(adRes);
      setPolls(pollRes);
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

  // Build interleaved feed items (posts, polls, and sponsored ads)
  const feedItems = React.useMemo(() => {
    const list: Array<{ type: 'post' | 'ad' | 'poll'; data: any; key: string }> = [];

    // Fallback editorial post with mock destacados if needed
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

    posts.forEach((p, idx) => {
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
  }, [posts, sponsoredAds, polls, loading]);

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
            onPress={() => router.push(`/user/${author.id}` as any)}
            activeOpacity={0.7}
          >
            <MessageCircle size={18} color={colors.textMuted} />
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>
              {post.commentsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Repeat2 size={18} color={colors.textMuted} />
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>
              {post.repostsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Share2 size={18} color={colors.textMuted} />
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
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
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
});
