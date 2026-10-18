import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Newspaper,
  UserCheck,
  CheckCheck,
} from 'lucide-react-native';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  InAppNotificationItem,
} from '@/services/api';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const { token, refreshUser } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [token]);

  async function loadNotifications() {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
    setIsLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotifications();
    await refreshUser();
    setRefreshing(false);
  }

  async function handleNotificationPress(item: InAppNotificationItem) {
    if (!item.isRead && token) {
      await markNotificationRead(item.id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      refreshUser();
    }

    if (item.postSlug) {
      router.push(`/article/${encodeURIComponent(item.postSlug)}`);
    } else if (item.actor?.id) {
      router.push(`/user/${encodeURIComponent(item.actor.id)}` as any);
    }
  }

  async function handleMarkAllAsRead() {
    if (!token) return;
    await markAllNotificationsRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    refreshUser();
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'EDITORIAL_POST':
        return <Newspaper size={20} color="#D32F2F" />;
      case 'FOLLOWED_COMMENT':
      case 'COMMENT_REPLY':
        return <MessageSquare size={20} color="#2563EB" />;
      case 'NEW_FOLLOWER':
        return <UserCheck size={20} color="#059669" />;
      default:
        return <Bell size={20} color="#D32F2F" />;
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} d`;
    } catch {
      return '';
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.inputBackground }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notificaciones</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <CheckCheck size={18} color="#D32F2F" />
            <Text style={styles.markAllText}>Leer todo</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#D32F2F" size="large" />
        </View>
      ) : !token ? (
        <View style={styles.centerContainer}>
          <Bell size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Inicia sesión para recibir alertas</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Recibe notificaciones cuando se publiquen editoriales o comenten en post seguidos.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Bell size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes notificaciones</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Aquí verás avisos de nuevos editoriales y comentarios de los usuarios que sigues.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#D32F2F']}
              tintColor="#D32F2F"
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemCard,
                {
                  backgroundColor: item.isRead
                    ? isDark
                      ? '#161922'
                      : '#FFFFFF'
                    : isDark
                    ? '#221919'
                    : '#FEF2F2',
                  borderColor: item.isRead ? colors.border : '#FCA5A5',
                },
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1F2430' : '#F1F5F9' }]}>
                {getNotificationIcon(item.type)}
              </View>

              <View style={styles.itemTextContainer}>
                <View style={styles.itemHeaderRow}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>

                <Text style={[styles.itemMessage, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.message}
                </Text>

                <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    marginLeft: 8,
  },
  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
  },
});
