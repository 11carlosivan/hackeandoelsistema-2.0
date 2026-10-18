import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  X,
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
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const HamburgerMenuModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

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
        { label: 'Voluntariado HES', icon: HeartHandshake, path: '/(tabs)/categories' },
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.headerBackground }]}>
          <Text style={[styles.title, { color: colors.text }]}>Menú de Secciones</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBackground }]} activeOpacity={0.7}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                      onPress={() => navigateTo(item.path)}
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
          <View style={[styles.cardGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 12 }]}>
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 20,
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
