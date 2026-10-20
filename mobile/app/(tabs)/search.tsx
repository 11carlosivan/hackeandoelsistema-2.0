import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { ArticleCard } from '@/components/ArticleCard';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  fetchPublicPosts,
  fetchSearchOverview,
  toggleFollowUser,
  resolveImageUrl,
  Post,
} from '@/services/api';
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  Users,
  Flame,
  UserPlus,
  UserCheck,
  ChevronRight,
  Hash,
} from 'lucide-react-native';

export default function SearchScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(params.q || '');
  const [activeTab, setActiveTab] = useState<'all' | 'news' | 'users' | 'topics'>('all');
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Overview data
  const [trends, setTrends] = useState<any[]>([
    { id: '1', tag: 'Arroz', topic: 'Arroz', postsCount: '12.4K publicaciones', category: 'Economía' },
    { id: '2', tag: 'PRM', topic: 'PRM', postsCount: '8.2K publicaciones', category: 'Política' },
    { id: '3', tag: 'Haití', topic: 'Haití', postsCount: '6.1K publicaciones', category: 'Internacional' },
    { id: '4', tag: 'Punta Catalina', topic: 'Punta Catalina', postsCount: '5.8K publicaciones', category: 'Energía' },
    { id: '5', tag: 'Elecciones 2028', topic: 'Elecciones 2028', postsCount: '5.1K publicaciones', category: 'Política' },
  ]);

  const [usersList, setUsersList] = useState<any[]>([
    {
      id: 'maria-lopez',
      displayName: 'María López',
      username: 'mlopez',
      bio: 'Analista de política internacional.',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      isFollowing: false,
    },
    {
      id: 'carlos-m',
      displayName: 'Carlos M.',
      username: 'carlosm',
      bio: 'Periodista de investigación económica.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      isFollowing: false,
    },
    {
      id: 'ana-torres',
      displayName: 'Ana Torres',
      username: 'anatorres',
      bio: 'Activista cívica y columnista.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      isFollowing: false,
    },
  ]);

  useEffect(() => {
    fetchSearchOverview().then((data) => {
      if (data?.trends && data.trends.length > 0) {
        setTrends(data.trends);
      }
      if (data?.users && data.users.length > 0) {
        setUsersList(data.users);
      }
    });
  }, []);

  useEffect(() => {
    if (params.q !== undefined) {
      setQuery(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    if (!query.trim()) {
      setPostResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchPublicPosts({ q: query.trim(), limit: 20 });
      setPostResults(data);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFollowToggle = async (userId: string) => {
    if (!token) {
      router.push('/login' as any);
      return;
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u))
    );

    await toggleFollowUser(userId, token);
  };

  const handleTrendClick = (trendName: string) => {
    setQuery(trendName);
  };

  const filteredUsers = usersList.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.bio || '').toLowerCase().includes(q)
    );
  });

  const filteredTrends = trends.filter((t) => {
    if (!query.trim()) return true;
    return (t.topic || t.tag || '').toLowerCase().includes(query.toLowerCase());
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.content}>
        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <SearchIcon size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Buscar noticias, usuarios o temas..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs Bar */}
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'news', label: 'Noticias' },
            { key: 'users', label: 'Usuarios' },
            { key: 'topics', label: 'Temas' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
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

        {/* Main Content Area */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Buscando...</Text>
          </View>
        ) : query.trim() && activeTab === 'news' ? (
          <FlatList
            data={postResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <ArticleCard post={item} />}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No se encontraron noticias para "{query}"
                </Text>
              </View>
            }
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollPadding}>
            {/* TENDENCIAS SECTION */}
            {(activeTab === 'all' || activeTab === 'topics') && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Flame size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tendencias</Text>
                  </View>
                  <Text style={[styles.verMasText, { color: colors.primary }]}>Ver más</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  {filteredTrends.map((t, idx) => (
                    <TouchableOpacity
                      key={t.id || idx}
                      style={[
                        styles.trendRow,
                        idx < filteredTrends.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                      ]}
                      onPress={() => handleTrendClick(t.topic || t.tag)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.trendLeft}>
                        <Text style={[styles.trendIndex, { color: colors.textMuted }]}>{idx + 1}</Text>
                        <View>
                          <Text style={[styles.trendTopic, { color: colors.text }]}>{t.topic || t.tag}</Text>
                          <Text style={[styles.trendCount, { color: colors.textMuted }]}>
                            {t.postsCount || '12.4K publicaciones'}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* USUARIOS SECTION */}
            {(activeTab === 'all' || activeTab === 'users') && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Users size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Usuarios</Text>
                  </View>
                  <Text style={[styles.verMasText, { color: colors.primary }]}>Ver más</Text>
                </View>

                <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  {filteredUsers.map((u, idx) => (
                    <View
                      key={u.id || idx}
                      style={[
                        styles.userRow,
                        idx < filteredUsers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.userInfoCol}
                        onPress={() => router.push(`/user/${u.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: resolveImageUrl(u.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={styles.userAvatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userDisplayName, { color: colors.text }]} numberOfLines={1}>
                            {u.displayName}
                          </Text>
                          <Text style={[styles.userHandle, { color: colors.textMuted }]}>
                            @{u.username || 'usuario'}
                          </Text>
                          {u.bio ? (
                            <Text style={[styles.userBio, { color: colors.textMuted }]} numberOfLines={1}>
                              {u.bio}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.followBtn,
                          {
                            backgroundColor: u.isFollowing ? colors.inputBackground : colors.primary,
                            borderColor: u.isFollowing ? colors.border : colors.primary,
                          },
                        ]}
                        onPress={() => handleFollowToggle(u.id)}
                        activeOpacity={0.8}
                      >
                        {u.isFollowing ? (
                          <Text style={[styles.followBtnText, { color: colors.text }]}>Siguiendo</Text>
                        ) : (
                          <Text style={[styles.followBtnText, { color: '#FFFFFF' }]}>Seguir</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* NOTICIAS RESULTADOS IF IN ALL TAB */}
            {activeTab === 'all' && postResults.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Noticias relacionadas</Text>
                </View>
                {postResults.slice(0, 5).map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 24,
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
  scrollPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  listPadding: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  verMasText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendIndex: {
    fontSize: 14,
    fontWeight: '900',
    width: 18,
  },
  trendTopic: {
    fontSize: 14,
    fontWeight: '800',
  },
  trendCount: {
    fontSize: 11,
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  userInfoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: '#374151',
  },
  userDisplayName: {
    fontSize: 14,
    fontWeight: '800',
  },
  userHandle: {
    fontSize: 12,
  },
  userBio: {
    fontSize: 11,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
