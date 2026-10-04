import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { User, Sun, Moon, Monitor, Trash2, LogOut, ShieldCheck, FileText } from 'lucide-react-native';

export default function ProfileScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar Mi Cuenta',
      '¿Estás seguro de que deseas eliminar permanentemente tu cuenta y todos tus datos guardados? Esta acción es irreversible según las políticas de privacidad.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await deleteAccount();
            setDeleting(false);
            Alert.alert('Cuenta Eliminada', 'Tu cuenta y datos asociados han sido eliminados.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={32} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user ? user.name : 'Lector HES'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {user ? user.email : 'Sesión de Invitado'}
            </Text>
          </View>

          {!user ? (
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginBtnText}>Entrar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Theme Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APARIENCIA Y TEMA</Text>
          <View style={[styles.optionsGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.optionRow, themeMode === 'light' && { backgroundColor: colors.inputBackground }]}
              onPress={() => setThemeMode('light')}
            >
              <View style={styles.optionLeft}>
                <Sun size={18} color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: colors.text }]}>Modo Claro</Text>
              </View>
              {themeMode === 'light' && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.optionRow, themeMode === 'dark' && { backgroundColor: colors.inputBackground }]}
              onPress={() => setThemeMode('dark')}
            >
              <View style={styles.optionLeft}>
                <Moon size={18} color="#6366F1" style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: colors.text }]}>Modo Oscuro</Text>
              </View>
              {themeMode === 'dark' && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.optionRow, themeMode === 'system' && { backgroundColor: colors.inputBackground }]}
              onPress={() => setThemeMode('system')}
            >
              <View style={styles.optionLeft}>
                <Monitor size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: colors.text }]}>Automático (Sistema)</Text>
              </View>
              {themeMode === 'system' && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal & App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACERCA DE LA APP</Text>
          <View style={[styles.optionsGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <ShieldCheck size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: colors.text }]}>Política de Privacidad</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <FileText size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: colors.text }]}>Términos y Condiciones</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Deletion & Logout (Store Policy Mandatory Rule) */}
        {user ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GESTIÓN DE CUENTA</Text>
            <View style={[styles.optionsGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.optionRow} onPress={logout}>
                <View style={styles.optionLeft}>
                  <LogOut size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                  <Text style={[styles.optionText, { color: colors.text }]}>Cerrar Sesión</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                <View style={styles.optionLeft}>
                  <Trash2 size={18} color="#DC2626" style={{ marginRight: 10 }} />
                  <Text style={[styles.optionText, { color: '#DC2626', fontWeight: '700' }]}>
                    {deleting ? 'Eliminando...' : 'Eliminar Mi Cuenta'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
});
