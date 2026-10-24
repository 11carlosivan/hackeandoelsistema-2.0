import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { fetchSportsScoreboard, SportsGame } from '@/services/api';
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  Clock,
  Activity,
  MapPin,
  Calendar,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type SportTab = 'all' | 'lidom' | 'mlb' | 'nba' | 'soccer' | 'nfl' | 'f1';

interface TabItem {
  id: SportTab;
  label: string;
  badge: string;
}

const TABS: TabItem[] = [
  { id: 'all', label: 'Todos', badge: '🔥' },
  { id: 'lidom', label: 'LIDOM', badge: '🇩🇴' },
  { id: 'mlb', label: 'MLB', badge: '⚾' },
  { id: 'nba', label: 'NBA', badge: '🏀' },
  { id: 'soccer', label: 'Fútbol', badge: '⚽' },
  { id: 'nfl', label: 'NFL', badge: '🏈' },
  { id: 'f1', label: 'F1', badge: '🏎️' },
];

export default function SportsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SportTab>('all');
  const [games, setGames] = useState<SportsGame[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchSportsScoreboard(activeTab);
      setGames(data?.games || []);
    } catch (err: any) {
      console.warn('[SportsScreen] Error loading scores:', err);
      setError('No se pudieron cargar los resultados en este momento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const liveGames = games.filter((g) => g.status === 'IN_PROGRESS');
  const finalGames = games.filter((g) => g.status === 'FINAL');
  const scheduledGames = games.filter((g) => g.status === 'SCHEDULED');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header superior */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.inputBackground }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Marcadores Deportivos</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            En vivo • Cobertura oficial
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.inputBackground }]}
          onPress={() => loadData(false)}
          activeOpacity={0.7}
          disabled={loading || refreshing}
        >
          <RefreshCw size={18} color={loading ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs horizontales por deporte */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={styles.tabBadge}>{tab.badge}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenido principal */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.textMuted }]}>Cargando marcadores...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => loadData(false)}
            >
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : games.length === 0 ? (
          <View style={styles.centerBox}>
            <Trophy size={42} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay partidos programados</Text>
            <Text style={[styles.stateText, { color: colors.textMuted }]}>
              No se encontraron encuentros activos o recientes para este deporte hoy.
            </Text>
          </View>
        ) : (
          <View style={styles.gamesList}>
            {/* Resumen rápido si hay en vivo */}
            {liveGames.length > 0 && (
              <View style={styles.sectionHeaderWrap}>
                <View style={styles.liveIndicatorDot} />
                <Text style={[styles.sectionHeading, { color: colors.primary }]}>EN VIVO AHORA ({liveGames.length})</Text>
              </View>
            )}

            {games.map((game) => (
              <GameDetailCard key={game.id} game={game} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GameDetailCard({ game, colors }: { game: SportsGame; colors: any }) {
  const isLive = game.status === 'IN_PROGRESS';
  const isFinal = game.status === 'FINAL';
  const hasScores = game.awayTeam?.score !== null && game.homeTeam?.score !== null;

  if (game.isRacing && game.podium?.length) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.leagueBadgeWrap}>
            <Text style={styles.f1Flag}>🏎️</Text>
            <Text style={[styles.cardLeague, { color: colors.textSecondary }]}>
              {game.leagueName.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isLive ? 'rgba(255, 59, 48, 0.15)' : colors.inputBackground },
            ]}
          >
            {isLive ? <Activity size={12} color="#EF4444" style={{ marginRight: 4 }} /> : null}
            <Text style={[styles.statusPillText, { color: isLive ? '#EF4444' : colors.textMuted }]}>
              {game.statusDetail || 'FINAL'}
            </Text>
          </View>
        </View>

        <Text style={[styles.racingTitle, { color: colors.text }]}>{game.name}</Text>
        {game.venue ? (
          <View style={styles.venueRow}>
            <MapPin size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.venueText, { color: colors.textMuted }]}>{game.venue}</Text>
          </View>
        ) : null}

        <View style={[styles.podiumContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Text style={[styles.podiumHeading, { color: colors.textSecondary }]}>PODIO OFICIAL</Text>
          {game.podium.map((p, pIdx) => (
            <View key={pIdx} style={styles.podiumItem}>
              <View style={styles.podiumDriverWrap}>
                <Text style={styles.podiumMedal}>
                  {p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉'}
                </Text>
                <Text style={styles.podiumPos}>P{p.position}</Text>
                {p.flag ? (
                  <Image source={{ uri: p.flag }} style={styles.countryFlag} resizeMode="cover" />
                ) : null}
                <Text style={[styles.podiumDriverName, { color: colors.text }]} numberOfLines={1}>
                  {p.driver}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const awayWon = isFinal && hasScores && Number(game.awayTeam.score) > Number(game.homeTeam.score);
  const homeWon = isFinal && hasScores && Number(game.homeTeam.score) > Number(game.awayTeam.score);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: isLive ? '#DC2626' : colors.border,
          borderWidth: isLive ? 1.5 : 1,
        },
      ]}
    >
      {/* Cabecera de la tarjeta */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardLeague, { color: colors.textSecondary }]}>
          {game.leagueName.toUpperCase()}
        </Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: isLive ? 'rgba(239, 68, 68, 0.15)' : colors.inputBackground },
          ]}
        >
          {isLive ? <Activity size={12} color="#EF4444" style={{ marginRight: 4 }} /> : null}
          <Text
            style={[
              styles.statusPillText,
              { color: isLive ? '#EF4444' : isFinal ? colors.text : colors.textMuted },
            ]}
          >
            {game.statusDetail || (isFinal ? 'FINAL' : 'PROGRAMADO')}
          </Text>
        </View>
      </View>

      {/* Equipos y Marcadores */}
      <View style={styles.teamsContainer}>
        {/* Visitante */}
        <View style={styles.teamRow}>
          <View style={styles.teamLeft}>
            {game.awayTeam.logo ? (
              <Image source={{ uri: game.awayTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.placeholderLetter, { color: colors.text }]}>
                  {game.awayTeam.shortName?.[0] || 'V'}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.teamName,
                { color: colors.text, fontWeight: awayWon ? '800' : '600' },
              ]}
              numberOfLines={1}
            >
              {game.awayTeam.name}
            </Text>
          </View>
          <Text
            style={[
              styles.scoreVal,
              {
                color: isLive ? '#EF4444' : hasScores ? colors.text : colors.textMuted,
                fontWeight: isLive || hasScores ? '800' : '600',
              },
            ]}
          >
            {game.awayTeam.score !== null ? game.awayTeam.score : '—'}
          </Text>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        {/* Local */}
        <View style={styles.teamRow}>
          <View style={styles.teamLeft}>
            {game.homeTeam.logo ? (
              <Image source={{ uri: game.homeTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.teamLogoPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.placeholderLetter, { color: colors.text }]}>
                  {game.homeTeam.shortName?.[0] || 'L'}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.teamName,
                { color: colors.text, fontWeight: homeWon ? '800' : '600' },
              ]}
              numberOfLines={1}
            >
              {game.homeTeam.name}
            </Text>
          </View>
          <Text
            style={[
              styles.scoreVal,
              {
                color: isLive ? '#EF4444' : hasScores ? colors.text : colors.textMuted,
                fontWeight: isLive || hasScores ? '800' : '600',
              },
            ]}
          >
            {game.homeTeam.score !== null ? game.homeTeam.score : '—'}
          </Text>
        </View>
      </View>

      {/* Sede / Estadio al pie */}
      {game.venue ? (
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <MapPin size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.venueText, { color: colors.textMuted }]} numberOfLines={1}>
            {game.venue}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  tabsContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabBadge: {
    fontSize: 13,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  stateText: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  gamesList: {
    gap: 12,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leagueBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  f1Flag: {
    fontSize: 14,
    marginRight: 6,
  },
  cardLeague: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  teamsContainer: {
    gap: 6,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  teamLogo: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  teamLogoPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  placeholderLetter: {
    fontSize: 11,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 14,
    flex: 1,
  },
  scoreVal: {
    fontSize: 18,
    fontFamily: 'monospace',
    minWidth: 26,
    textAlign: 'right',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  venueText: {
    fontSize: 11,
    fontWeight: '500',
  },
  racingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  podiumContainer: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  podiumHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  podiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  podiumDriverWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  podiumMedal: {
    fontSize: 12,
    marginRight: 4,
  },
  podiumPos: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    marginRight: 6,
  },
  countryFlag: {
    width: 16,
    height: 11,
    borderRadius: 2,
    marginRight: 6,
  },
  podiumDriverName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
