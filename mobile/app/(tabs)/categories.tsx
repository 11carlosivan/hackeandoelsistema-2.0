import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { fetchCategories, Category } from '@/services/api';
import { useRouter } from 'expo-router';
import { ChevronRight, Grid } from 'lucide-react-native';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.headerTitleRow}>
        <Grid size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>EXPLORAR CATEGORÍAS</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.itemCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => router.push(`/category/${item.slug}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.itemDot, { backgroundColor: item.slug === 'opinion' ? colors.primary : colors.textMuted }]} />
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loadingBox: {
    paddingTop: 40,
    alignItems: 'center',
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
});
