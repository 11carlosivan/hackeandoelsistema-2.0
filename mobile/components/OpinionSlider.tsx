import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Post } from '@/services/api';
import { Quote, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;

interface OpinionSliderProps {
  posts: Post[];
}

export const OpinionSlider: React.FC<OpinionSliderProps> = ({ posts }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const opinionPosts = posts.filter((p) => p.isOpinion).slice(0, 5);
  const displayPosts = opinionPosts.length > 0 ? opinionPosts : posts.slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <View style={[styles.redBar, { backgroundColor: colors.primary }]} />
          <Quote size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            PILAR <Text style={{ color: colors.primary }}>OPINIÓN</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => router.push('/(tabs)/opinion')}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todas</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayPosts}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 14}
        decelerationRate="fast"
        contentContainerStyle={styles.sliderPadding}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.slideCard, { width: CARD_WIDTH, backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => router.push(`/article/${item.slug}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.opinionBadge, { backgroundColor: colors.badgeOpinionBg }]}>
                <Quote size={11} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={[styles.badgeText, { color: colors.badgeOpinionText }]}>OPINIÓN</Text>
              </View>
            </View>

            <Text style={[styles.articleTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>

            {item.excerpt ? (
              <Text style={[styles.excerpt, { color: colors.textMuted }]} numberOfLines={2}>
                "{item.excerpt}"
              </Text>
            ) : null}

            <View style={[styles.authorRow, { borderTopColor: colors.border }]}>
              {item.featuredImage ? (
                <Image source={{ uri: item.featuredImage }} style={styles.authorAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.authorAvatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitial}>{(item.author?.name || 'O')[0]}</Text>
                </View>
              )}
              <View style={styles.authorMeta}>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {item.author?.name || 'Columnista HES'}
                </Text>
                <Text style={[styles.columnistLabel, { color: colors.primary }]}>Columnista HES</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redBar: {
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 2,
  },
  sliderPadding: {
    paddingHorizontal: 16,
    gap: 14,
  },
  slideCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginRight: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  opinionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  authorAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
  },
  columnistLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});
