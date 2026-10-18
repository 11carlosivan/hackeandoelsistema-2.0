import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { fetchSystemStats } from '@/services/api';
import {
  CloudSun,
  Coins,
  Fuel,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Wind,
  Droplets,
  Calendar,
  MapPin,
  RefreshCw,
  Sun,
  CloudRain,
  Cloud,
} from 'lucide-react-native';

export default function InfoScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'currencies' | 'oil' | 'market'>('all');
  const [selectedCity, setSelectedCity] = useState<'santo-domingo' | 'santiago'>('santo-domingo');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await fetchSystemStats();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const weatherData = stats?.weatherCities?.[selectedCity] || {
    city: selectedCity === 'santo-domingo' ? 'Santo Domingo' : 'Santiago',
    temp: 31,
    condition: 'Parcialmente nublado',
    humidity: '68%',
    wind: '12 km/h',
    feelsLike: '35°C',
    forecast: [
      { day: 'Hoy', max: 32, min: 24, condition: 'Soleado' },
      { day: 'Mañana', max: 31, min: 24, condition: 'Parcialmente nublado' },
      { day: 'Mié', max: 31, min: 23, condition: 'Parcialmente nublado' },
      { day: 'Jue', max: 32, min: 24, condition: 'Soleado' },
    ],
  };

  const currencies = stats?.currencies || {
    dollar: { pair: 'USD/DOP', buy: 60.10, sell: 60.25, changePct: '+0.12%', trend: 'up' },
    euro: { pair: 'EUR/DOP', buy: 63.40, sell: 63.80, changePct: '+0.08%', trend: 'up' },
  };

  const commodities = stats?.commodities || {
    oil: { name: 'Petróleo (WTI)', priceUsd: 82.40, changePct: '-1.25%', trend: 'down', unit: 'US$ / barril' },
    canastaBasica: { name: 'Canasta básica', amountDop: 45320, changePct: '+0.8%', trend: 'up', period: 'Junio 2026' },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <TrendingUp size={22} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.heading, { color: colors.text }]}>Información Clave</Text>
        </View>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Clima, divisas, petróleo y economía en tiempo real para República Dominicana
        </Text>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {[
            { key: 'all', label: 'Todo' },
            { key: 'weather', label: 'Clima' },
            { key: 'currencies', label: 'Divisas' },
            { key: 'oil', label: 'Petróleo' },
            { key: 'market', label: 'Mercados' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : colors.text, fontWeight: isSelected ? '800' : '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Obteniendo indicadores...</Text>
          </View>
        ) : (
          <>
            {/* ================= CLIMA ================= */}
            {(activeTab === 'all' || activeTab === 'weather') && (
              <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                {/* City Selector */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <CloudSun size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Clima en Rep. Dominicana</Text>
                  </View>
                  <View style={styles.citySelector}>
                    <TouchableOpacity
                      style={[
                        styles.cityBtn,
                        selectedCity === 'santo-domingo' && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setSelectedCity('santo-domingo')}
                    >
                      <Text
                        style={[
                          styles.cityBtnText,
                          { color: selectedCity === 'santo-domingo' ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        Sto. Dgo.
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.cityBtn,
                        selectedCity === 'santiago' && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setSelectedCity('santiago')}
                    >
                      <Text
                        style={[
                          styles.cityBtnText,
                          { color: selectedCity === 'santiago' ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        Santiago
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Big Temperature & Condition */}
                <View style={styles.weatherMainRow}>
                  <View>
                    <Text style={[styles.bigTemp, { color: colors.text }]}>{weatherData.temp}&deg;C</Text>
                    <Text style={[styles.weatherCondition, { color: colors.textMuted }]}>
                      {weatherData.condition}
                    </Text>
                    <Text style={[styles.weatherSubinfo, { color: colors.textMuted }]}>
                      Humedad: {weatherData.humidity} &bull; Viento: {weatherData.wind}
                    </Text>
                  </View>
                  <Sun size={54} color="#F59E0B" />
                </View>

                {/* Forecast row */}
                <View style={[styles.forecastRow, { borderTopColor: colors.border }]}>
                  {weatherData.forecast?.map((item: any, idx: number) => (
                    <View key={idx} style={styles.forecastCol}>
                      <Text style={[styles.forecastDay, { color: colors.textMuted }]}>{item.day}</Text>
                      <CloudSun size={20} color="#F59E0B" style={{ marginVertical: 4 }} />
                      <Text style={[styles.forecastTemp, { color: colors.text }]}>
                        {item.max}&deg; / {item.min}&deg;
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ================= DIVISAS ================= */}
            {(activeTab === 'all' || activeTab === 'currencies') && (
              <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Coins size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Tasas de Cambio (Banco Central)</Text>
                  </View>
                </View>

                {/* Dólar */}
                <View style={[styles.rateItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.rateLeft}>
                    <Text style={[styles.ratePair, { color: colors.text }]}>Dólar (USD)</Text>
                    <Text style={[styles.rateSubtext, { color: colors.textMuted }]}>
                      Compra: RD$ {currencies.dollar?.buy?.toFixed(2) || '60.10'} &bull; Venta: RD${' '}
                      {currencies.dollar?.sell?.toFixed(2) || '60.25'}
                    </Text>
                  </View>
                  <View style={styles.rateRight}>
                    <Text style={[styles.rateValue, { color: colors.text }]}>
                      RD$ {currencies.dollar?.sell?.toFixed(2) || '60.25'}
                    </Text>
                    <View style={styles.trendRow}>
                      <TrendingUp size={12} color="#10B981" style={{ marginRight: 2 }} />
                      <Text style={[styles.trendText, { color: '#10B981' }]}>
                        {currencies.dollar?.changePct || '+0.12%'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Euro */}
                <View style={styles.rateItem}>
                  <View style={styles.rateLeft}>
                    <Text style={[styles.ratePair, { color: colors.text }]}>Euro (EUR)</Text>
                    <Text style={[styles.rateSubtext, { color: colors.textMuted }]}>
                      Compra: RD$ {currencies.euro?.buy?.toFixed(2) || '63.40'} &bull; Venta: RD${' '}
                      {currencies.euro?.sell?.toFixed(2) || '63.80'}
                    </Text>
                  </View>
                  <View style={styles.rateRight}>
                    <Text style={[styles.rateValue, { color: colors.text }]}>
                      RD$ {currencies.euro?.sell?.toFixed(2) || '63.80'}
                    </Text>
                    <View style={styles.trendRow}>
                      <TrendingUp size={12} color="#10B981" style={{ marginRight: 2 }} />
                      <Text style={[styles.trendText, { color: '#10B981' }]}>
                        {currencies.euro?.changePct || '+0.08%'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ================= PETRÓLEO ================= */}
            {(activeTab === 'all' || activeTab === 'oil') && (
              <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Fuel size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Petróleo de Texas (WTI)</Text>
                  </View>
                </View>

                <View style={styles.rateItem}>
                  <View style={styles.rateLeft}>
                    <Text style={[styles.ratePair, { color: colors.text }]}>Petróleo (WTI)</Text>
                    <Text style={[styles.rateSubtext, { color: colors.textMuted }]}>
                      Precio internacional por barril
                    </Text>
                  </View>
                  <View style={styles.rateRight}>
                    <Text style={[styles.rateValue, { color: colors.text }]}>
                      US$ {commodities.oil?.priceUsd?.toFixed(2) || '82.40'}
                    </Text>
                    <View style={styles.trendRow}>
                      <TrendingDown size={12} color="#EF4444" style={{ marginRight: 2 }} />
                      <Text style={[styles.trendText, { color: '#EF4444' }]}>
                        {commodities.oil?.changePct || '-1.25%'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ================= CANASTA BÁSICA / MERCADOS ================= */}
            {(activeTab === 'all' || activeTab === 'market') && (
              <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTitleRow}>
                    <ShoppingCart size={18} color="#6366F1" style={{ marginRight: 6 }} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Canasta Básica Familiar</Text>
                  </View>
                </View>

                <View style={styles.rateItem}>
                  <View style={styles.rateLeft}>
                    <Text style={[styles.ratePair, { color: colors.text }]}>Costo promedio mensual</Text>
                    <Text style={[styles.rateSubtext, { color: colors.textMuted }]}>
                      Fuente: Banco Central ({commodities.canastaBasica?.period || 'Junio 2026'})
                    </Text>
                  </View>
                  <View style={styles.rateRight}>
                    <Text style={[styles.rateValue, { color: colors.text }]}>
                      RD$ {commodities.canastaBasica?.amountDop?.toLocaleString() || '45,320'}
                    </Text>
                    <View style={styles.trendRow}>
                      <TrendingUp size={12} color="#EF4444" style={{ marginRight: 2 }} />
                      <Text style={[styles.trendText, { color: '#EF4444' }]}>
                        {commodities.canastaBasica?.changePct || '+0.8%'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    marginBottom: 16,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  citySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderRadius: 8,
    padding: 2,
  },
  cityBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cityBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weatherMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bigTemp: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
  },
  weatherCondition: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  weatherSubinfo: {
    fontSize: 12,
    marginTop: 4,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  forecastCol: {
    alignItems: 'center',
    flex: 1,
  },
  forecastDay: {
    fontSize: 11,
    fontWeight: '700',
  },
  forecastTemp: {
    fontSize: 11,
    fontWeight: '800',
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rateLeft: {
    flex: 1,
  },
  ratePair: {
    fontSize: 14,
    fontWeight: '700',
  },
  rateSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  rateRight: {
    alignItems: 'flex-end',
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
