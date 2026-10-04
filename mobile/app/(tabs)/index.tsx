import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { OpinionSlider } from '@/components/OpinionSlider';
import { CategorySection } from '@/components/CategorySection';
import { useTheme } from '@/context/ThemeContext';
import { fetchPublicPosts, fetchCategories, Post, Category } from '@/services/api';
import { useRouter } from 'expo-router';
import { Flame, Clock } from 'lucide-react-native';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [fetchedPosts, fetchedCategories] = await Promise.all([
      fetchPublicPosts({ limit: 50 }),
      fetchCategories(),
    ]);

    setPosts(fetchedPosts);
    setCategories(fetchedCategories);
    setLoading(false);
    setRefreshing(false);
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
          {/* 1. OPINIÓN SLIDER (Top 5 Columnists Carousel) */}
          <OpinionSlider posts={posts} />

          {/* 2. HERO FEATURED ARTICLE (Portada Periodística) */}
          {heroPost ? (
            <View style={styles.heroSection}>
              <View style={styles.heroHeaderRow}>
                <Flame size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.heroHeaderTitle, { color: colors.text }]}>PORTADA Y TITULAR</Text>
              </View>

              <TouchableOpacity
                style={[styles.heroCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => router.push(`/article/${heroPost.slug}` as any)}
                activeOpacity={0.85}
              >
                {heroPost.featuredImage ? (
                  <Image source={{ uri: heroPost.featuredImage }} style={styles.heroImage} resizeMode="cover" />
                ) : null}

                <View style={styles.heroBody}>
                  <View style={styles.heroMetaRow}>
                    <View style={[styles.heroCategoryBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.heroCategoryText}>{heroPost.category?.toUpperCase()}</Text>
                    </View>

                    {heroPost.publishedAt ? (
                      <View style={styles.heroDateRow}>
                        <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.heroDateText, { color: colors.textMuted }]}>
                          {new Date(heroPost.publishedAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.heroTitle, { color: colors.text }]}>{heroPost.title}</Text>

                  {heroPost.excerpt ? (
                    <Text style={[styles.heroExcerpt, { color: colors.textMuted }]} numberOfLines={3}>
                      {heroPost.excerpt}
                    </Text>
                  ) : null}

                  <Text style={[styles.heroAuthor, { color: colors.textMuted }]}>
                    Por <Text style={{ color: colors.text, fontWeight: '700' }}>{heroPost.author?.name || 'Redacción HES'}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
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
  categoriesWrapper: {
    paddingHorizontal: 16,
  },
});
