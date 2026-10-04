import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { OpinionCard } from '@/components/OpinionCard';
import { useTheme } from '@/context/ThemeContext';
import { fetchPublicPosts, Post } from '@/services/api';
import { Quote } from 'lucide-react-native';

export default function OpinionScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOpinionData = async () => {
    const allPosts = await fetchPublicPosts({ limit: 40 });
    const opinionFiltered = allPosts.filter((p) => p.isOpinion);
    // Fallback if no posts tagged explicitly opinion: use all
    setPosts(opinionFiltered.length > 0 ? opinionFiltered : allPosts);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadOpinionData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOpinionData();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={[styles.banner, { backgroundColor: colors.badgeOpinionBg, borderColor: colors.primary }]}>
        <Quote size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: colors.primary }]}>PILAR DE OPINIÓN</Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
            Columnas, análisis crítico y editoriales libres de censura.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando columnas de Opinión...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OpinionCard post={item} />}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSub: {
    fontSize: 12,
    marginTop: 2,
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
  listPadding: {
    padding: 16,
  },
});
