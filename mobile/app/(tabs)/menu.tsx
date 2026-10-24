import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Users,
  Tv,
  BarChart3,
  TrendingUp,
  Bookmark,
  Bell,
  User,
  Briefcase,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  Grid,
  Search,
  Flame,
  ArrowRight,
  Trophy,
} from 'lucide-react-native';

export default function MenuScreen() {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = () => {
    router.push('/(tabs)/search' as any);
  };

  const menuSections = [
    {
      title: 'Servicios e Información',
      items: [
        { label: 'Marcadores Deportivos', icon: Trophy, path: '/sports', desc: 'Resultados y partidos en vivo de LIDOM, MLB, NBA, Fútbol, NFL y F1' },
        { label: 'Info (Clima, Divisas y Petróleo)', icon: TrendingUp, path: '/(tabs)/info', desc: 'Indicadores económicos y tiempo meteorológico en tiempo real' },
        { label: 'Encuestas de Opinión', icon: BarChart3, path: '/polls', desc: 'Participa y revisa resultados' },
        { label: 'Artículos Guardados', icon: Bookmark, path: '/saved', desc: 'Tus noticias archivadas' },
        { label: 'Notificaciones', icon: Bell, path: '/notifications', desc: 'Alertas de actividad y editoriales' },
      ],
    },
    {
      title: 'Comunidad y Redes',
      items: [
        { label: 'Feed Comunitario', icon: Users, path: '/(tabs)/community', desc: 'Publicaciones y opiniones de usuarios' },
        { label: 'Buscador y Tendencias', icon: Search, path: '/(tabs)/search', desc: 'Explorar noticias, temas y usuarios' },
      ],
    },
    {
      title: 'Oportunidades y Categorías',
      items: [
        { label: 'Bolsa de Empleos', icon: Briefcase, path: '/(tabs)/jobs', desc: 'Ofertas de trabajo y vacantes' },
        { label: 'Secciones del Periódico', icon: Grid, path: '/(tabs)/categories', desc: 'Nacional, Política, Economía y más' },
      ],
    },
    {
      title: 'Cuenta y Ajustes',
      items: [
        { label: token ? 'Mi Perfil' : 'Iniciar Sesión / Registro', icon: User, path: '/(tabs)/profile', desc: token ? `@${user?.username || 'usuario'}` : 'Accede a tu cuenta' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Prominent Search Bar in "Más" */}
        <View
          style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
        >
          <Search size={19} color="#DC2626" style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar noticias, usuarios o temas..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={() => {
              if (searchTerm.trim()) {
                router.push({ pathname: '/(tabs)/search', params: { q: searchTerm.trim() } } as any);
              } else {
                router.push('/(tabs)/search' as any);
              }
            }}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchGoBadge, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (searchTerm.trim()) {
                router.push({ pathname: '/(tabs)/search', params: { q: searchTerm.trim() } } as any);
              } else {
                router.push('/(tabs)/search' as any);
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowRight size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Trending Chips */}
        <View style={styles.quickTrendsRow}>
          <Flame size={14} color="#DC2626" style={{ marginRight: 5 }} />
          <Text style={[styles.quickTrendLabel, { color: colors.textMuted }]}>Tendencias:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendChipsScroll}>
            {['#Arroz', '#PRM', '#Haití', '#PuntaCatalina', '#Elecciones2028'].map((tag, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.trendChip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: tag.replace('#', '') } } as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.trendChipText, { color: colors.text }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Info Feature Card */}
        <TouchableOpacity
          style={[styles.infoBanner, { backgroundColor: isDark ? '#1C212D' : '#FEF2F2', borderColor: isDark ? '#2D3748' : '#FECACA' }]}
          onPress={() => router.push('/(tabs)/info' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.infoIconBox, { backgroundColor: '#DC2626' }]}>
            <TrendingUp size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.text }]}>
              Info: Clima, Divisas y Petróleo
            </Text>
            <Text style={[styles.infoBannerSubtitle, { color: colors.textMuted }]}>
              Consulta indicadores clave en vivo y pronósticos
            </Text>
          </View>
          <ChevronRight size={18} color="#DC2626" />
        </TouchableOpacity>

        {/* Menu Sections List */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isLast = iIdx === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={iIdx}
                    style={[
                      styles.menuRow,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    ]}
                    onPress={() => router.push(item.path as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: colors.inputBackground }]}>
                      <Icon size={18} color={colors.primary} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                      {item.desc ? (
                        <Text style={[styles.menuDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Theme Switcher Row */}
        <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 4 }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.inputBackground }]}>
              {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#6366F1" />}
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Tema {isDark ? 'Oscuro' : 'Claro'}
              </Text>
              <Text style={[styles.menuDesc, { color: colors.textMuted }]}>
                Tocar para cambiar a modo {isDark ? 'claro' : 'oscuro'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerNote}>
          <ShieldCheck size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Hackeando el Sistema 2.0 &bull; Versión Oficial
          </Text>
        </View>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchGoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTrendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  quickTrendLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  trendChipsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  trendChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
