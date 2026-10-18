import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { fetchSavedPosts, togglePostSave } from '@/services/api';
import {
  Bookmark,
  ChevronRight,
  Trash2,
  Share2,
  Newspaper,
  MessageSquare,
  Video,
  BarChart2,
  Clock,
} from 'lucide-react-native';

export default function SavedScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'news' | 'posts' | 'videos' | 'polls'>('news');
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const items = await fetchSavedPosts(token);
      setSavedItems(items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSaved();
  }, [token]);

  const handleRemove = async (postId: string) => {
    if (!token) return;
    setSavedItems((prev) => prev.filter((p) => p.id !== postId));
    await togglePostSave(postId, false, token);
  };

  const handleOpenItem = (item: any) => {
    if (item.slug) {
      router.push(`/article/${item.slug}` as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <Bookmark size={22} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.heading, { color: colors.text }]}>Guardados</Text>
        </View>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Tus noticias, opiniones y publicaciones archivadas para consultar luego
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {[
          { key: 'news', label: 'Noticias', icon: Newspaper },
          { key: 'posts', label: 'Publicaciones', icon: MessageSquare },
          { key: 'videos', label: 'Videos', icon: Video },
          { key: 'polls', label: 'Encuestas', icon: BarChart2 },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isSelected && styles.activeTabBtn]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isSelected ? '#DC2626' : colors.textMuted },
                  isSelected && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando guardados...</Text>
        </View>
      ) : !token ? (
        <View style={styles.emptyBox}>
          <Bookmark size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Inicia Sesión</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Regístrate o inicia sesión para guardar artículos y consultarlos en cualquier dispositivo.
          </Text>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSaved();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Bookmark size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes elementos guardados</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Pulsa el icono de marcador en cualquier noticia o publicación comunitaria para guardarla aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => handleOpenItem(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: item.coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.catRow}>
                  <Text style={[styles.categoryBadge, { color: colors.primary }]}>
                    {item.category?.name || 'EDITORIAL'}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={10}>
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.cardFooter}>
                  <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardDate, { color: colors.textMuted }]}>Guardado recientemente</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 13,
    lineHeight: 18,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: '#DC2626',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabLabel: {
    fontWeight: '900',
  },
  listPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    height: 100,
  },
  cardImage: {
    width: 100,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 11,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  loginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
