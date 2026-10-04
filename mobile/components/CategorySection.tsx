import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/services/api';
import { ArticleCard } from '@/components/ArticleCard';
import { ChevronDown, ChevronRight, Tag } from 'lucide-react-native';

interface CategorySectionProps {
  categoryTitle: string;
  categorySlug: string;
  posts: Post[];
}

export const CategorySection: React.FC<CategorySectionProps> = ({ categoryTitle, categorySlug, posts }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(3);

  if (posts.length === 0) return null;

  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  const handleLoadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => prev + 3);
    } else {
      router.push(`/category/${categorySlug}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={[styles.redIndicator, { backgroundColor: colors.primary }]} />
          <Tag size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {categoryTitle.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.seeAllLink}
          onPress={() => router.push(`/category/${categorySlug}` as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ir a sección</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.postsList}>
        {visiblePosts.map((post) => (
          <ArticleCard key={String(post.id)} post={post} />
        ))}
      </View>

      {/* "Ver más" button at the bottom of the section */}
      <TouchableOpacity
        style={[styles.loadMoreBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={handleLoadMore}
        activeOpacity={0.7}
      >
        <Text style={[styles.loadMoreText, { color: colors.text }]}>
          {hasMore ? `Ver más noticias de ${categoryTitle}` : `Explorar categoría ${categoryTitle}`}
        </Text>
        <ChevronDown size={16} color={colors.primary} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  seeAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 2,
  },
  postsList: {
    gap: 12,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
