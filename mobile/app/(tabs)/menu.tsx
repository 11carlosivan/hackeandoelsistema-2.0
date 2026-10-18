import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Users,
  Tv,
  Radio,
  BarChart3,
  TrendingUp,
  Bookmark,
  Bell,
  User,
  Briefcase,
  HeartHandshake,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  Grid,
} from 'lucide-react-native';

export default function MenuScreen() {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();

  const menuSections = [
    {
      title: 'Principal',
      items: [
        { label: 'Portada / Noticias', icon: Home, path: '/(tabs)' },
        { label: 'Feed Comunitario', icon: Users, path: '/(tabs)/community' },
        { label: 'HES Live (En Vivo)', icon: Tv, path: '/(tabs)/live' },
      ],
    },
    {
      title: 'Servicios e Información',
      items: [
        { label: 'Información Clave (Clima, Divisas, Petróleo)', icon: TrendingUp, path: '/info' },
        { label: 'Encuestas', icon: BarChart3, path: '/polls' },
        { label: 'Artículos Guardados', icon: Bookmark, path: '/saved' },
        { label: 'Notificaciones', icon: Bell, path: '/notifications' },
      ],
    },
    {
      title: 'Comunidad y Oportunidades',
      items: [
        { label: 'Bolsa de Empleos', icon: Briefcase, path: '/(tabs)/jobs' },
        { label: 'Secciones y Categorías', icon: Grid, path: '/(tabs)/categories' },
      ],
    },
    {
      title: 'Cuenta y Ajustes',
      items: [
        { label: token ? 'Mi Perfil' : 'Iniciar Sesión / Registro', icon: User, path: token ? '/(tabs)/profile' : '/login' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerTitleRow}>
          <Grid size={22} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={[styles.pageTitle, { color: colors.text }]}>Más Opciones</Text>
        </View>

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
                    <View style={styles.iconContainer}>
                      <Icon size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
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
            <View style={styles.iconContainer}>
              {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#6366F1" />}
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              Tema {isDark ? 'Oscuro (Tocar para Claro)' : 'Claro (Tocar para Oscuro)'}
            </Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
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
