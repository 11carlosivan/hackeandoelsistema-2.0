import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { ArticleCard } from '@/components/ArticleCard';
import { useTheme } from '@/context/ThemeContext';
import { fetchPublicPosts, Post } from '@/services/api';
import { Search as SearchIcon, X, History } from 'lucide-react-native';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(['Política', 'Ciberseguridad', 'Opinión', 'Elecciones']);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchPublicPosts({ q: query.trim(), limit: 20 });
      setResults(data);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.content}>
        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <SearchIcon size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Buscar noticias, opinión, autores..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Suggestions / Recent Search Chips */}
        {query.length === 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <History size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.recentTitle, { color: colors.textMuted }]}>Búsquedas Populares</Text>
            </View>
            <View style={styles.chipsContainer}>
              {recentQueries.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.chip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => handleRecentClick(term)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Results List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Buscando resultados...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <ArticleCard post={item} />}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              query.length > 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No se encontraron resultados</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    Prueba buscando con otros términos como "política", "opinión" o el nombre de un autor.
                  </Text>
                </View>
              ) : null
            }
          />
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
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  recentSection: {
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingBox: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  listPadding: {
    paddingBottom: 20,
  },
  emptyBox: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
