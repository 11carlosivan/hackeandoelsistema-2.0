import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fetchSportsScoreboard, SportsGame, SportsScoreboardResponse } from '@/services/api';
import { Trophy, RefreshCw, Clock, Activity } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const ROTATION_SECONDS = 20;

type LeagueType = 'lidom' | 'mlb' | 'nba';

const LEAGUES: { id: LeagueType; name: string; emoji: string; short: string }[] = [
  { id: 'lidom', name: 'LIDOM', emoji: '⚾', short: 'Pelota RD' },
  { id: 'mlb', name: 'MLB', emoji: '⚾', short: 'Grandes Ligas' },
  { id: 'nba', name: 'NBA', emoji: '🏀', short: 'Baloncesto' },
];

export const SportsScoreSection: React.FC = () => {
  const { colors } = useTheme();
  const [selectedLeague, setSelectedLeague] = useState<LeagueType>('lidom');
  const [scoreboard, setScoreboard] = useState<SportsScoreboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);

  const loadData = useCallback(async (league: LeagueType, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchSportsScoreboard(league);
      setScoreboard(data);
    } catch (err) {
      console.warn('Error loading sports scoreboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedLeague);
  }, [selectedLeague, loadData]);

  // Rotación automática cada 20 segundos entre LIDOM, MLB y NBA
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedLeague((curr) => {
        const idx = LEAGUES.findIndex((l) => l.id === curr);
        const nextIdx = (idx + 1) % LEAGUES.length;
        return LEAGUES[nextIdx].id;
      });
      setCycleKey((k) => k + 1);
    }, ROTATION_SECONDS * 1000);

    return () => clearInterval(timer);
  }, [cycleKey]);

  const handleManualSelect = (leagueId: LeagueType) => {
    if (leagueId === selectedLeague) return;
    setSelectedLeague(leagueId);
    setCycleKey((k) => k + 1); // reinicia el temporizador de 20s
  };

  const games = scoreboard?.games || [];

  return (
    <View style={styles.container}>
      {/* Header con título y selector de ligas */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <View style={[styles.redBar, { backgroundColor: colors.primary }]} />
          <Trophy size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            MARCADORES <Text style={{ color: colors.primary }}>DEPORTIVOS</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadData(selectedLeague, true)}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          <RefreshCw
            size={14}
            color={colors.primary}
            style={refreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs de Ligas con indicador de auto-rotación */}
      <View style={styles.tabRow}>
        {LEAGUES.map((l) => {
          const isActive = selectedLeague === l.id;
          return (
            <TouchableOpacity
              key={l.id}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: isActive ? colors.primary : colors.cardBackground,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleManualSelect(l.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabEmoji}>{l.emoji}</Text>
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#000000' : colors.text, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {l.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista de Marcadores o Estado Vacío */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando partidos de {selectedLeague.toUpperCase()}...
          </Text>
        </View>
      ) : games.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No hay partidos recientes ni programados para {scoreboard?.leagueName || selectedLeague.toUpperCase()}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={games}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.listPadding}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isLive = item.status === 'IN_PROGRESS';
            const isFinal = item.status === 'FINAL';
            const hasScores = item.awayTeam.score !== null && item.homeTeam.score !== null;

            return (
              <View
                style={[
                  styles.gameCard,
                  {
                    width: CARD_WIDTH,
                    backgroundColor: colors.cardBackground,
                    borderColor: isLive ? colors.primary : colors.border,
                  },
                ]}
              >
                {/* Header de la tarjeta con estado */}
                <View style={styles.gameCardHeader}>
                  {isLive ? (
                    <View style={[styles.liveBadge, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                      <Activity size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.liveBadgeText, { color: colors.primary }]}>
                        EN VIVO • {item.statusDetail}
                      </Text>
                    </View>
                  ) : isFinal ? (
                    <View style={styles.finalBadge}>
                      <View style={styles.finalDot} />
                      <Text style={[styles.statusText, { color: colors.text }]}>
                        {item.statusDetail || 'FINAL'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.scheduledRow}>
                      <Clock size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                        {item.statusDetail || 'HOY'}
                      </Text>
                    </View>
                  )}

                  {item.venue ? (
                    <Text
                      style={[styles.venueText, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.venue}
                    </Text>
                  ) : null}
                </View>

                {/* Equipo Visitante */}
                <View style={styles.teamRow}>
                  <View style={styles.teamInfo}>
                    {item.awayTeam.logo ? (
                      <Image source={{ uri: item.awayTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.placeholderLogo, { backgroundColor: colors.border }]}>
                        <Text style={[styles.placeholderText, { color: colors.text }]}>
                          {item.awayTeam.shortName?.[0] || 'V'}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamName,
                        {
                          color: colors.text,
                          fontWeight: isFinal && hasScores && Number(item.awayTeam.score) > Number(item.homeTeam.score) ? '800' : '600',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.awayTeam.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreText,
                      {
                        color: isLive ? colors.primary : hasScores ? colors.text : colors.textSecondary,
                        fontWeight: isLive || hasScores ? '800' : '500',
                        fontSize: hasScores ? 16 : 13,
                      },
                    ]}
                  >
                    {item.awayTeam.score !== null ? item.awayTeam.score : 'VS'}
                  </Text>
                </View>

                {/* Separador sutil */}
                <View style={[styles.teamSeparator, { backgroundColor: colors.border }]} />

                {/* Equipo Local */}
                <View style={styles.teamRow}>
                  <View style={styles.teamInfo}>
                    {item.homeTeam.logo ? (
                      <Image source={{ uri: item.homeTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.placeholderLogo, { backgroundColor: colors.border }]}>
                        <Text style={[styles.placeholderText, { color: colors.text }]}>
                          {item.homeTeam.shortName?.[0] || 'L'}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.teamName,
                        {
                          color: colors.text,
                          fontWeight: isFinal && hasScores && Number(item.homeTeam.score) > Number(item.awayTeam.score) ? '800' : '600',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.homeTeam.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreText,
                      {
                        color: isLive ? colors.primary : hasScores ? colors.text : colors.textSecondary,
                        fontWeight: isLive || hasScores ? '800' : '500',
                        fontSize: hasScores ? 16 : 13,
                      },
                    ]}
                  >
                    {item.homeTeam.score !== null ? item.homeTeam.score : 'VS'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
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
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 6,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  tabEmoji: {
    fontSize: 12,
  },
  tabText: {
    fontSize: 12,
  },
  listPadding: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gameCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  finalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  scheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  venueText: {
    fontSize: 10,
    maxWidth: 90,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  teamLogo: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  placeholderLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  placeholderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 13,
    flex: 1,
  },
  scoreText: {
    minWidth: 24,
    textAlign: 'right',
  },
  teamSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
    marginHorizontal: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
