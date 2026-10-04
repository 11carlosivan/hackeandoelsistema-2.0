import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { fetchPostBySlug, Post } from '@/services/api';
import { GutenbergRenderer } from '@/components/GutenbergRenderer';
import { ArrowLeft, Share2, Clock, User, Quote } from 'lucide-react-native';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPostBySlug(slug).then((data) => {
        setPost(data);
        setLoading(false);
      });
    }
  }, [slug]);

  const handleShare = async () => {
    if (post) {
      try {
        await Share.share({
          title: post.title,
          message: `${post.title}\n\nhttps://hackeandoelsistema.net/noticia/${post.slug}`,
        });
      } catch (err) {
        // Share dismissed
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Detail Header Bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {post?.title || 'Noticia'}
        </Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando artículo...</Text>
        </View>
      ) : post ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: post.isOpinion ? colors.badgeOpinionBg : colors.inputBackground }]}>
            {post.isOpinion ? <Quote size={12} color={colors.primary} style={{ marginRight: 4 }} /> : null}
            <Text style={[styles.categoryText, { color: post.isOpinion ? colors.badgeOpinionText : colors.primary }]}>
              {post.category?.toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>

          {/* Meta Information Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <User size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{post.author?.name || 'Redacción HES'}</Text>
            </View>
            {post.publishedAt ? (
              <View style={styles.metaItem}>
                <Clock size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {new Date(post.publishedAt).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Featured Image */}
          {post.featuredImage ? (
            <Image source={{ uri: post.featuredImage }} style={styles.featuredImage} resizeMode="cover" />
          ) : null}

          {/* Excerpt Lead */}
          {post.excerpt ? (
            <Text style={[styles.excerptLead, { color: colors.textMuted, borderLeftColor: colors.primary }]}>
              {post.excerpt}
            </Text>
          ) : null}

          {/* Article Body Content */}
          <GutenbergRenderer content={post.content || post.excerpt || ''} />
        </ScrollView>
      ) : (
        <View style={styles.loadingBox}>
          <Text style={{ color: colors.text }}>No se pudo cargar el artículo.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  shareBtn: {
    padding: 8,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  content: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  featuredImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  excerptLead: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    paddingLeft: 12,
    borderLeftWidth: 3,
    marginBottom: 16,
  },
});
