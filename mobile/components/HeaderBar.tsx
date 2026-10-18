import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Sun, Moon, Bell, Search, Menu } from 'lucide-react-native';
import { fetchNotifications } from '@/services/api';
import { HamburgerMenuModal } from './HamburgerMenuModal';

export const HeaderBar: React.FC = () => {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, token } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(user?.unreadNotificationsCount || 0);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (user?.unreadNotificationsCount !== undefined) {
      setUnreadCount(user.unreadNotificationsCount);
    }
  }, [user?.unreadNotificationsCount]);

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    let isMounted = true;
    const checkNotifications = async () => {
      const res = await fetchNotifications(token);
      if (isMounted) {
        setUnreadCount(res.unreadCount || 0);
      }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  return (
    <>
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.8}
        >
          <Image
            source={require('@/assets/images/isotipo.png')}
            style={styles.isotipoImage}
            resizeMode="contain"
          />
          <View style={styles.textLogoContainer}>
            <Text style={[styles.mainBrandText, { color: colors.text }]}>
              HACKEANDO<Text style={{ color: colors.primary }}>ELSISTEMA</Text>
            </Text>
            <Text style={[styles.subBrandText, { color: colors.textMuted }]}>
              PERIODISMO DIGITAL INDEPENDIENTE
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          {/* Search Button */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.inputBackground }]}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.7}
            accessibilityLabel="Buscar"
          >
            <Search size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.inputBackground }]}
            onPress={() => {
              if (token) {
                router.push('/notifications');
              } else {
                router.push('/login');
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Notificaciones"
          >
            <Bell size={18} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Hamburger Menu Toggle */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.inputBackground }]}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Menú de opciones"
          >
            <Menu size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <HamburgerMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
};

export default HeaderBar;

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  isotipoImage: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  textLogoContainer: {
    justifyContent: 'center',
  },
  mainBrandText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  subBrandText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
