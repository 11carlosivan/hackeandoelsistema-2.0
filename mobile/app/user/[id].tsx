import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  ArrowLeft,
  User as UserIcon,
  Calendar,
  Users,
  UserPlus,
  UserCheck,
  X,
  ExternalLink,
  MoreVertical,
  Heart,
  MessageCircle,
  Flag,
  ShieldAlert,
} from 'lucide-react-native';
import {
  fetchUserProfile,
  toggleFollowUser,
  fetchUserFollowers,
  fetchUserFollowing,
  resolveImageUrl,
  UserProfileData,
  FollowUserItem,
  reportUser,
  blockUser,
  unblockUser,
  getBlockedUserIds,
  fetchUserCommunityPosts,
  CommunityPostItem,
} from '@/services/api';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { user: currentUser, token, refreshUser } = useAuth();
  const { toast } = useNotification();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Blocked and Community Posts State
  const [isBlocked, setIsBlocked] = useState(false);
  const [userPosts, setUserPosts] = useState<CommunityPostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Modal for Followers / Following list
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listModalTitle, setListModalTitle] = useState<'Seguidores' | 'Siguiendo'>('Seguidores');
  const [modalUsers, setModalUsers] = useState<FollowUserItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const isOwnProfile = currentUser?.id === profile?.id;

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id, token]);

  async function loadProfile() {
    if (!id) return;
    setIsLoading(true);
    const [data, blockedIds, posts] = await Promise.all([
      fetchUserProfile(id, token),
      getBlockedUserIds(),
      fetchUserCommunityPosts(id, token),
    ]);
    if (data) {
      setProfile(data);
      setIsFollowing(Boolean(data.isFollowing));
      setIsBlocked(blockedIds.includes(data.id));
      setUserPosts(posts || []);
    }
    setIsLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  async function handleToggleFollow() {
    if (!token) {
      toast.info('Inicia sesión', 'Debes iniciar sesión para seguir a otros usuarios.');
      router.push('/login');
      return;
    }
    if (!profile) return;

    setFollowLoading(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followersCount: Math.max(0, prev.followersCount + (nextState ? 1 : -1)),
          }
        : null
    );

    const res = await toggleFollowUser(profile.id, token);
    setFollowLoading(false);

    if (!res.success) {
      // rollback
      setIsFollowing(!nextState);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followersCount: Math.max(0, prev.followersCount + (nextState ? -1 : 1)),
            }
          : null
      );
      toast.error('Error', res.error || 'No se pudo actualizar el estado de seguimiento.');
    } else {
      if (res.following !== undefined) {
        setIsFollowing(res.following);
      }
      if (res.followersCount !== undefined) {
        setProfile((prev) => (prev ? { ...prev, followersCount: res.followersCount! } : null));
      }
      refreshUser();
    }
  }

  async function openListModal(type: 'Seguidores' | 'Siguiendo') {
    if (!profile) return;
    setListModalTitle(type);
    setListModalVisible(true);
    setModalLoading(true);
    try {
      const users =
        type === 'Seguidores'
          ? await fetchUserFollowers(profile.id)
          : await fetchUserFollowing(profile.id);
      setModalUsers(users);
    } catch {
      setModalUsers([]);
    }
    setModalLoading(false);
  }

  function formatJoinDate(dateStr?: string) {
    if (!dateStr) return 'Reciente';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-DO', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Reciente';
    }
  }

  const handleProfileOptions = () => {
    if (!profile) return;
    Alert.alert(
      'Opciones de usuario',
      `Acciones para @${profile.username || 'usuario'}`,
      [
        {
          text: '🚩 Reportar usuario',
          onPress: handleReportUser,
        },
        {
          text: isBlocked ? 'Desbloquear usuario' : '🚫 Bloquear usuario',
          style: isBlocked ? 'default' : 'destructive',
          onPress: handleToggleBlock,
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleReportUser = () => {
    if (!profile) return;
    Alert.alert(
      'Reportar usuario',
      '¿Por qué deseas reportar a este usuario? Nuestro equipo lo revisará en menos de 24 horas:',
      [
        { text: 'Spam o cuenta falsa', onPress: () => submitUserReport('SPAM') },
        { text: 'Acoso o difamación', onPress: () => submitUserReport('HARASSMENT') },
        { text: 'Discurso de odio', onPress: () => submitUserReport('HATE_SPEECH') },
        { text: 'Contenido inapropiado', onPress: () => submitUserReport('INAPPROPRIATE') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const submitUserReport = async (reason: string) => {
    if (!profile) return;
    const res = await reportUser(profile.id, reason, '', token);
    Alert.alert('Reporte enviado', res.message || 'El reporte ha sido recibido por moderación.');
  };

  const handleToggleBlock = async () => {
    if (!profile) return;
    if (isBlocked) {
      await unblockUser(profile.id);
      setIsBlocked(false);
      Alert.alert('Usuario desbloqueado', `Has desbloqueado a @${profile.username || 'usuario'}.`);
    } else {
      Alert.alert(
        'Bloquear usuario',
        `¿Confirmas que deseas bloquear a @${profile.username || 'usuario'}? No verás sus publicaciones ni comentarios en la comunidad.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Bloquear',
            style: 'destructive',
            onPress: async () => {
              await blockUser(profile.id);
              setIsBlocked(true);
              Alert.alert('Usuario bloqueado', `Has bloqueado a @${profile.username || 'usuario'}.`);
            },
          },
        ]
      );
    }
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil de Usuario</Text>
        {!isOwnProfile && profile ? (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.inputBackground }]}
            onPress={handleProfileOptions}
            activeOpacity={0.7}
          >
            <MoreVertical size={18} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#D32F2F" size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.centerContainer}>
          <UserIcon size={56} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Usuario no encontrado</Text>
          <Text style={[styles.notFoundSub, { color: colors.textMuted }]}>
            El perfil que intentas consultar no existe o fue suspendido.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#D32F2F']}
              tintColor="#D32F2F"
            />
          }
        >
          {/* Main Card */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: isDark ? '#161922' : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {profile.avatarUrl ? (
                <Image source={{ uri: resolveImageUrl(profile.avatarUrl) || profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitials}>
                    {(profile.displayName || 'U').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Names */}
            <Text style={[styles.displayName, { color: colors.text }]}>
              {profile.displayName}
            </Text>
            {profile.username && (
              <Text style={[styles.username, { color: colors.textMuted }]}>
                @{profile.username}
              </Text>
            )}

            {/* Joined info */}
            <View style={styles.joinedRow}>
              <Calendar size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.joinedText, { color: colors.textMuted }]}>
                Miembro desde {formatJoinDate(profile.createdAt)}
              </Text>
            </View>

            {/* Biography */}
            {profile.bio ? (
              <View style={[styles.bioBox, { backgroundColor: isDark ? '#1F2430' : '#F8FAFC' }]}>
                <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                  {profile.bio}
                </Text>
              </View>
            ) : null}

            {/* Stats Row */}
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => openListModal('Seguidores')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {profile.followersCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Seguidores</Text>
              </TouchableOpacity>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => openListModal('Siguiendo')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {profile.followingCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Siguiendo</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            {!isOwnProfile ? (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  isFollowing
                    ? [styles.followingBtn, { borderColor: colors.border, backgroundColor: isDark ? '#1F2430' : '#F1F5F9' }]
                    : { backgroundColor: '#D32F2F' },
                ]}
                onPress={handleToggleFollow}
                disabled={followLoading}
                activeOpacity={0.8}
              >
                {followLoading ? (
                  <ActivityIndicator color={isFollowing ? colors.text : '#FFFFFF'} size="small" />
                ) : isFollowing ? (
                  <>
                    <UserCheck size={18} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.followingBtnText, { color: colors.text }]}>Siguiendo</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.followBtnText}>Seguir</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.ownProfileBadge, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                <Text style={[styles.ownProfileText, { color: '#3B82F6' }]}>
                  Este es tu perfil público
                </Text>
              </View>
            )}

            {/* User Community Posts Section */}
            <View style={{ marginTop: 24, width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  Publicaciones en la Comunidad
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {userPosts.length} post{userPosts.length === 1 ? '' : 's'}
                </Text>
              </View>

              {userPosts.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center', backgroundColor: isDark ? '#161922' : '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                    Este usuario no ha publicado nada en la comunidad todavía.
                  </Text>
                </View>
              ) : (
                userPosts.map((post) => (
                  <View
                    key={post.id}
                    style={{
                      backgroundColor: isDark ? '#161922' : '#FFFFFF',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                      {post.content}
                    </Text>
                    {post.mediaUrl ? (
                      <Image
                        source={{ uri: post.mediaUrl }}
                        style={{ width: '100%', height: 180, borderRadius: 8, marginTop: 10 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {new Date(post.createdAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Heart size={14} color={post.isLiked ? '#DC2626' : colors.textMuted} fill={post.isLiked ? '#DC2626' : 'transparent'} />
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{post.likesCount || 0}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MessageCircle size={14} color={colors.textMuted} />
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>{post.commentsCount || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Followers / Following List Modal */}
      <Modal
        visible={listModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setListModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#161922' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{listModalTitle}</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setListModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator color="#D32F2F" size="large" />
              </View>
            ) : modalUsers.length === 0 ? (
              <View style={styles.modalLoadingContainer}>
                <Users size={42} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyModalText, { color: colors.textMuted }]}>
                  No hay usuarios en esta lista.
                </Text>
              </View>
            ) : (
              <FlatList
                data={modalUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.userListItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setListModalVisible(false);
                      router.push(`/user/${encodeURIComponent(item.id)}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: resolveImageUrl(item.avatarUrl) || item.avatarUrl }} style={styles.listAvatar} />
                    ) : (
                      <View style={[styles.listAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.listInitials}>
                          {(item.displayName || 'U').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.listUserInfo}>
                      <Text style={[styles.listName, { color: colors.text }]}>
                        {item.displayName}
                      </Text>
                      {item.bio ? (
                        <Text style={[styles.listBio, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.bio}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  notFoundSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioBox: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    width: '100%',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  followingBtn: {
    borderWidth: 1,
  },
  followingBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ownProfileBadge: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  ownProfileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: 300,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyModalText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  listAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  listUserInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '700',
  },
  listBio: {
    fontSize: 12,
    marginTop: 2,
  },
});
