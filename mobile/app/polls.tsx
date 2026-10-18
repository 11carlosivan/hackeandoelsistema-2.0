import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { PollCard } from '@/components/PollCard';
import { useTheme } from '@/context/ThemeContext';
import { fetchPolls, PollItem } from '@/services/api';
import { BarChart3, HelpCircle } from 'lucide-react-native';

export default function PollsScreen() {
  const { colors } = useTheme();
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPolls = async () => {
    try {
      const data = await fetchPolls();
      setPolls(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPolls();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <BarChart3 size={22} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.heading, { color: colors.text }]}>Encuestas de Opinión</Text>
        </View>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Participa con tu voto y descubre la opinión de la comunidad en tiempo real
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando encuestas...</Text>
        </View>
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <PollCard
              poll={item}
              onVoted={(updated) => {
                setPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <HelpCircle size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay encuestas activas en este momento.
              </Text>
            </View>
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
  listPadding: {
    padding: 16,
    paddingBottom: 40,
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
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
});
