import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Share, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { fetchPostBySlug, Post, registerPostShare } from '@/services/api';
import { GutenbergRenderer } from '@/components/GutenbergRenderer';
import { EngagementBar } from '@/components/EngagementBar';
import { CommentSection } from '@/components/CommentSection';
import { ArrowLeft, Share2, Clock, User, Quote } from 'lucide-react-native';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsLayoutY = useRef(0);

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
        const shareUrl = `https://hackeandoelsistema.net/${post.slug}/`;
        const result = await Share.share({
          title: post.title,
          message: Platform.OS === 'android' ? `${post.title}\n\n${shareUrl}` : post.title,
          url: shareUrl,
        });

        if (result.action === Share.sharedAction) {
          registerPostShare(post.id, 'native');
        }
      } catch (err) {
        console.warn('[Share] Error sharing post:', err);
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <GutenbergRenderer content={post.content || post.excerpt || ''} postId={post.id} />

          {/* Barra de interacción social: Likes, Comentarios, Compartir */}
          <EngagementBar
            postId={post.id}
            postTitle={post.title}
            postSlug={post.slug}
            initialLikeCount={post.likeCount || 0}
            initialCommentCount={post.commentCount || (post.comments?.length ?? 0)}
            initialShareCount={post.shareCount || 0}
            onCommentsPress={() => {
              if (commentsLayoutY.current > 0) {
                scrollViewRef.current?.scrollTo({ y: commentsLayoutY.current, animated: true });
              }
            }}
          />

          {/* Sección de comentarios bidireccionales con la web */}
          <View onLayout={(e) => { commentsLayoutY.current = e.nativeEvent.layout.y; }}>
            <CommentSection
              postId={post.id}
              initialComments={post.comments || []}
            />
          </View>

          {/* Artículos Relacionados */}
          {post.relatedPosts && post.relatedPosts.length > 0 ? (
            <View style={styles.relatedSection}>
              <View style={styles.relatedHeaderRow}>
                <View style={[styles.relatedAccent, { backgroundColor: colors.primary }]} />
                <Text style={[styles.relatedSectionTitle, { color: colors.text }]}>
                  ARTÍCULOS RELACIONADOS
                </Text>
              </View>
              <View style={styles.relatedList}>
                {post.relatedPosts.map((related) => (
                  <TouchableOpacity
                    key={related.id || related.slug}
                    style={[styles.relatedCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => router.push(`/article/${related.slug}` as any)}
                    activeOpacity={0.7}
                  >
                    {related.featuredImage ? (
                      <Image source={{ uri: related.featuredImage }} style={styles.relatedThumbnail} resizeMode="cover" />
                    ) : null}
                    <View style={styles.relatedContent}>
                      {related.category ? (
                        <Text style={[styles.relatedCategory, { color: colors.primary }]}>
                          {related.category.toUpperCase()}
                        </Text>
                      ) : null}
                      <Text style={[styles.relatedTitle, { color: colors.text }]} numberOfLines={2}>
                        {related.title}
                      </Text>
                      {related.publishedAt ? (
                        <Text style={[styles.relatedDate, { color: colors.textMuted }]}>
                          {new Date(related.publishedAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
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
  relatedSection: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  relatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  relatedAccent: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  relatedSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  relatedList: {
    gap: 12,
  },
  relatedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    gap: 12,
    alignItems: 'center',
  },
  relatedThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  relatedContent: {
    flex: 1,
  },
  relatedCategory: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  relatedDate: {
    fontSize: 11,
  },
});
