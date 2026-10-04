import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/services/api';
import { Quote } from 'lucide-react-native';

interface OpinionCardProps {
  post: Post;
}

export const OpinionCard: React.FC<OpinionCardProps> = ({ post }) => {
  const { colors } = useTheme();
  const router = useRouter();

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
});
