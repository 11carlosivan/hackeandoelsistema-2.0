import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Image, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { OpinionSlider } from '@/components/OpinionSlider';
import { CategorySection } from '@/components/CategorySection';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchPublicPosts, fetchCategories, Post, Category, togglePostLike, registerPostShare } from '@/services/api';
import { useRouter } from 'expo-router';
import { Flame, Clock, Heart, MessageSquare, Share2 } from 'lucide-react-native';

const HeroArticleCard: React.FC<{ post: Post }> = ({ post }) => {
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
      console.warn('[Share] Error sharing hero post:', err);
    }
  };

  return (
    <View
      style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <TouchableOpacity
        onPress={() => router.push(`/article/${post.slug}` as any)}
        activeOpacity={0.85}
      >
        {post.featuredImage ? (
          <Image source={{ uri: post.featuredImage }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        <View style={styles.heroBody}>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroCategoryBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.heroCategoryText}>{post.category?.toUpperCase()}</Text>
            </View>

            {post.publishedAt ? (
              <View style={styles.heroDateRow}>
                <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.heroDateText, { color: colors.textMuted }]}>
                  {new Date(post.publishedAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>{post.title}</Text>

          {post.excerpt ? (
            <Text style={[styles.heroExcerpt, { color: colors.textMuted }]} numberOfLines={3}>
              {post.excerpt}
            </Text>
          ) : null}

          <Text style={[styles.heroAuthor, { color: colors.textMuted }]}>
            Por <Text style={{ color: colors.text, fontWeight: '700' }}>{post.author?.name || 'Redacción HES'}</Text>
          </Text>
        </View>
      </TouchableOpacity>

      {/* Barra de interacción social sincronizada */}
      <View style={[styles.heroEngagementRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.heroEngagementBtn} onPress={handleLike} activeOpacity={0.7}>
          <Heart size={16} color={liked ? '#EF4444' : colors.textMuted} fill={liked ? '#EF4444' : 'transparent'} />
          <Text style={[styles.heroEngagementText, { color: liked ? '#EF4444' : colors.text }]}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.heroEngagementBtn} onPress={() => router.push(`/article/${post.slug}` as any)} activeOpacity={0.7}>
          <MessageSquare size={16} color={colors.textMuted} />
          <Text style={[styles.heroEngagementText, { color: colors.text }]}>{comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.heroEngagementBtn} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={16} color={colors.textMuted} />
          <Text style={[styles.heroEngagementText, { color: colors.text }]}>{shares}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [opinionPosts, setOpinionPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [fetchedPosts, fetchedCategories, fetchedOpinionPosts] = await Promise.all([
        fetchPublicPosts({ limit: 50 }),
        fetchCategories(),
        fetchPublicPosts({ categorySlug: 'opinion', limit: 10 }).catch(() => []),
      ]);

      const directOpinions = fetchedPosts.filter((p) => p.isOpinion);
      const combinedOpinionPosts = [
        ...fetchedOpinionPosts,
        ...directOpinions,
      ];
      const seenIds = new Set();
      const uniqueOpinionPosts = combinedOpinionPosts.filter((p) => {
        const id = p.slug || p.id;
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      setPosts(fetchedPosts);
      setCategories(fetchedCategories);
      setOpinionPosts(uniqueOpinionPosts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Extract Hero Post (Latest lead article)
  const heroPost = posts[0];
  const remainingPosts = posts.slice(1);

  // Group posts by Category
  const getPostsForCategory = (categorySlug: string) => {
    return remainingPosts.filter((p) => (
      p.categorySlug === categorySlug ||
      p.category?.toLowerCase() === categorySlug.toLowerCase()
    ));
  };

  // Priority categories for front page newspaper layout
  const priorityCategorySlugs = [
    { title: 'Política', slug: 'politica' },
    { title: 'Nacionales', slug: 'nacionales' },
    { title: 'Internacionales', slug: 'internacionales' },
    { title: 'Economía', slug: 'economia' },
    { title: 'Investigación', slug: 'investigacion' },
    { title: 'Tecnología', slug: 'tecnologia' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando edición digital de HES...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* 1. OPINIÓN SLIDER (Top 10 Columnists Carousel) */}
          <OpinionSlider posts={opinionPosts.length > 0 ? opinionPosts : posts} />

          {/* 2. HERO FEATURED ARTICLE (Portada Periodística) */}
          {heroPost ? (
            <View style={styles.heroSection}>
              <View style={styles.heroHeaderRow}>
                <Flame size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.heroHeaderTitle, { color: colors.text }]}>PORTADA Y TITULAR</Text>
              </View>

              <HeroArticleCard post={heroPost} />
            </View>
          ) : null}

          {/* 3. NOTICIAS AGRUPADAS POR CATEGORÍA CON BOTÓN "VER MÁS" */}
          <View style={styles.categoriesWrapper}>
            {priorityCategorySlugs.map((cat) => {
              const catPosts = getPostsForCategory(cat.slug);
              // Fallback: if empty, pick random remaining posts for demo display
              const displayPosts = catPosts.length > 0 ? catPosts : remainingPosts.slice(0, 4);

              return (
                <CategorySection
                  key={cat.slug}
                  categoryTitle={cat.title}
                  categorySlug={cat.slug}
                  posts={displayPosts}
                />
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  heroBody: {
    padding: 16,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroCategoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDateText: {
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 8,
  },
  heroExcerpt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  heroAuthor: {
    fontSize: 12,
  },
  heroEngagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
  },
  heroEngagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  heroEngagementText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  categoriesWrapper: {
    paddingHorizontal: 16,
  },
});
