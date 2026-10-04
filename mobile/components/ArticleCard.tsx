import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/services/api';
import { Clock } from 'lucide-react-native';

interface ArticleCardProps {
  post: Post;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ post }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric' })
    : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => router.push(`/article/${post.slug}` as any)}
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
  },
  authorName: {
    fontSize: 12,
  },
});
