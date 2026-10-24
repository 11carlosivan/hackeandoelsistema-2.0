import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderBar } from '@/components/HeaderBar';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useRouter } from 'expo-router';
import {
  User,
  Sun,
  Moon,
  Monitor,
  Trash2,
  LogOut,
  ShieldCheck,
  FileText,
  Bookmark,
  Edit3,
  Camera,
  Users,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  Heart,
  Share2,
  MoreVertical,
  UserX,
  Shield,
  Bell,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchSavedPosts,
  updateMyProfile,
  fetchUserFollowers,
  fetchUserFollowing,
  fetchMyNucleo,
  uploadAvatarImage,
  resolveImageUrl,
  getSavedCommunityPosts,
  toggleSaveCommunityPost,
  fetchUserCommunityPosts,
  updateCommunityPost,
  deleteCommunityPost,
  getBlockedUserIds,
  unblockUser,
  Post,
  FollowUserItem,
  CommunityPostItem,
} from '@/services/api';
import {
  isPushNotificationsEnabled,
  setPushNotificationsEnabled,
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from '@/services/pushNotifications';

export default function ProfileScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { user, token, logout, deleteAccount, refreshUser, updateUser, refreshAccessToken } = useAuth();
  const { toast, showModal } = useNotification();
  const router = useRouter();

  // Active view tab: 'posts' | 'saved' | 'settings'
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'settings'>('posts');

  // User's own community posts
  const [userPosts, setUserPosts] = useState<CommunityPostItem[]>([]);
  const [loadingUserPosts, setLoadingUserPosts] = useState(false);

  // Edit User Post Modal
  const [editingPost, setEditingPost] = useState<CommunityPostItem | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [updatingPost, setUpdatingPost] = useState(false);
  const [editPostModalVisible, setEditPostModalVisible] = useState(false);

  // Blocked users management
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Push Notifications toggle state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);

  useEffect(() => {
    isPushNotificationsEnabled().then(setPushEnabled);
  }, []);

  const handleTogglePushNotifications = async (val: boolean) => {
    setPushEnabled(val);
    setTogglingPush(true);
    await setPushNotificationsEnabled(val);
    if (!val) {
      if (token) {
        await unregisterPushNotificationsAsync(token);
      }
      toast.info('Notificaciones desactivadas', 'No recibirás alertas push en este dispositivo.');
    } else {
      if (token) {
        await registerForPushNotificationsAsync(token);
      }
      toast.success('Notificaciones activadas', 'Recibirás alertas push sobre tus publicaciones y comentarios.');
    }
    setTogglingPush(false);
  };

  // Saved Posts state (Artículos y Comunidad)
  const [savedSubTab, setSavedSubTab] = useState<'articles' | 'community'>('articles');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedCommunityPosts, setSavedCommunityPosts] = useState<CommunityPostItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Danger Zone / Account Deletion Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Edit Profile Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Followers / Following / Núcleo Modal state
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState<'Seguidores' | 'Siguiendo' | 'Núcleo'>('Seguidores');
  const [followModalUsers, setFollowModalUsers] = useState<FollowUserItem[]>([]);
  const [loadingFollowModal, setLoadingFollowModal] = useState(false);

  useEffect(() => {
    if (token) {
      loadSavedArticles();
      loadUserPosts();
      loadBlockedList();
      refreshUser();
    }
  }, [token, user?.id]);

  async function loadUserPosts() {
    if (!token || !user?.id) return;
    setLoadingUserPosts(true);
    try {
      const posts = await fetchUserCommunityPosts(user.id, token);
      setUserPosts(posts);
    } catch {
      setUserPosts([]);
    } finally {
      setLoadingUserPosts(false);
    }
  }

  async function loadBlockedList() {
    const list = await getBlockedUserIds();
    setBlockedUserIds(list);
  }

  async function loadSavedArticles() {
    if (!token) return;
    setLoadingSaved(true);
    const [posts, communityPosts] = await Promise.all([
      fetchSavedPosts(token),
      getSavedCommunityPosts(),
    ]);
    setSavedPosts(posts);
    setSavedCommunityPosts(communityPosts);
    setLoadingSaved(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshUser();
    if (token) {
      await Promise.all([
        loadSavedArticles(),
        loadUserPosts(),
        loadBlockedList(),
      ]);
    }
    setRefreshing(false);
  }

  function openEditModal() {
    if (!user) return;
    setEditName(user.displayName || user.name || '');
    setEditBio(user.bio || '');
    setEditAvatarUrl(user.avatarUrl || '');
    setSelectedAvatarFile(null);
    setEditModalVisible(true);
  }

  const handlePickAvatarFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permiso requerido', 'Se necesita acceso a tus fotos para seleccionar tu foto de perfil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = file.fileName || `avatar_${Date.now()}.jpg`;
        const mimeType = file.mimeType || 'image/jpeg';

        setSelectedAvatarFile({
          uri: file.uri,
          name: fileName,
          mimeType,
        });
        setEditAvatarUrl(file.uri);
      }
    } catch (err) {
      toast.error('Error', 'No se pudo abrir la galería de fotos.');
    }
  };

  const handleTakeAvatarPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permiso requerido', 'Se necesita acceso a la cámara para tomar una foto.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileName = `avatar_cam_${Date.now()}.jpg`;
        const mimeType = file.mimeType || 'image/jpeg';

        setSelectedAvatarFile({
          uri: file.uri,
          name: fileName,
          mimeType,
        });
        setEditAvatarUrl(file.uri);
      }
    } catch (err) {
      toast.error('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handlePickAvatar = () => {
    Alert.alert(
      'Cambiar Foto de Perfil',
      '¿De dónde deseas seleccionar tu foto?',
      [
        {
          text: 'Elegir de la Galería',
          onPress: handlePickAvatarFromGallery,
        },
        {
          text: 'Tomar Foto con la Cámara',
          onPress: handleTakeAvatarPhoto,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  async function handleSaveProfile() {
    if (!token) {
      toast.error('Sesión requerida', 'Debes iniciar sesión para editar tu perfil.');
      return;
    }
    if (!editName.trim()) {
      toast.error('Error', 'El nombre no puede estar vacío.');
      return;
    }

    setSavingProfile(true);

    let activeToken = token;
    let finalAvatarUrl = editAvatarUrl;

    // Si el usuario seleccionó un archivo local, lo subimos
    if (selectedAvatarFile) {
      let uploadRes = await uploadAvatarImage(
        selectedAvatarFile.uri,
        selectedAvatarFile.name,
        selectedAvatarFile.mimeType,
        activeToken
      );

      // Si falló (ej: token expirado), intentamos refrescar el token automáticamente y reintentar
      if (!uploadRes && refreshAccessToken) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          activeToken = refreshedToken;
          uploadRes = await uploadAvatarImage(
            selectedAvatarFile.uri,
            selectedAvatarFile.name,
            selectedAvatarFile.mimeType,
            activeToken
          );
        }
      }

      if (uploadRes?.avatarUrl) {
        finalAvatarUrl = uploadRes.avatarUrl;
      } else {
        setSavingProfile(false);
        toast.error('Error al subir foto', 'No se pudo subir la foto seleccionada. Verifica tu conexión.');
        return;
      }
    }

    let res = await updateMyProfile(
      {
        displayName: editName.trim(),
        bio: editBio.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
      },
      activeToken
    );

    // Si falló por token expirado, reintentamos refrescando
    if (!res.success && res.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        activeToken = refreshedToken;
        res = await updateMyProfile(
          {
            displayName: editName.trim(),
            bio: editBio.trim() || undefined,
            avatarUrl: finalAvatarUrl || undefined,
          },
          activeToken
        );
      }
    }

    setSavingProfile(false);

    if (res.success && res.user) {
      updateUser({
        displayName: res.user.displayName,
        name: res.user.displayName,
        bio: res.user.bio,
        avatarUrl: res.user.avatarUrl || finalAvatarUrl,
      });
      setSelectedAvatarFile(null);
      setEditModalVisible(false);
      toast.success('Perfil Actualizado', 'Tus datos e imagen se guardaron exitosamente.');
      refreshUser();
    } else {
      toast.error('Error', res.error || 'No se pudo actualizar el perfil.');
    }
  }

  async function openFollowersModal(type: 'Seguidores' | 'Siguiendo' | 'Núcleo') {
    if (!user || !user.id) return;
    setFollowModalTitle(type);
    setFollowModalVisible(true);
    setLoadingFollowModal(true);
    try {
      let list: FollowUserItem[] = [];
      if (type === 'Seguidores') {
        list = await fetchUserFollowers(user.id);
      } else if (type === 'Siguiendo') {
        list = await fetchUserFollowing(user.id);
      } else if (type === 'Núcleo') {
        list = token ? await fetchMyNucleo(token) : [];
      }
      setFollowModalUsers(list);
    } catch {
      setFollowModalUsers([]);
    }
    setLoadingFollowModal(false);
  }

  const handleLogout = () => {
    showModal({
      icon: 'question',
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de tu cuenta?',
      buttons: [
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setSavedPosts([]);
            toast.info('Sesión cerrada', 'Has cerrado sesión exitosamente.');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setSavedPosts([]);
      setSavedCommunityPosts([]);
      setDeleteModalVisible(false);
      toast.success('Cuenta Eliminada', 'Tu cuenta y datos asociados han sido eliminados.');
    } catch {
      toast.error('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRemoveSavedCommunityPost = async (post: CommunityPostItem) => {
    await toggleSaveCommunityPost(post);
    setSavedCommunityPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.info('Post removido', 'Publicación eliminada de tus guardados.');
  };

  const handleOpenEditPost = (post: CommunityPostItem) => {
    setEditingPost(post);
    setEditPostContent(post.content);
    setEditPostModalVisible(true);
  };

  const handleSaveEditedPost = async () => {
    if (!editingPost || !token) return;
    if (!editPostContent.trim()) {
      Alert.alert('Error', 'El contenido no puede estar vacío.');
      return;
    }
    setUpdatingPost(true);
    const res = await updateCommunityPost(editingPost.id, { content: editPostContent.trim() }, token);
    setUpdatingPost(false);
    if (res.success && res.post) {
      setUserPosts((prev) => prev.map((p) => (p.id === res.post?.id ? res.post : p)));
      setEditPostModalVisible(false);
      setEditingPost(null);
      toast.success('Publicación actualizada', 'Los cambios se guardaron con éxito.');
    } else {
      Alert.alert('Error', res.error || 'No se pudo actualizar la publicación.');
    }
  };

  const handleDeletePost = (post: CommunityPostItem) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que deseas eliminar permanentemente esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUserPosts((prev) => prev.filter((p) => p.id !== post.id));
            const res = await deleteCommunityPost(post.id, token || undefined);
            if (res.success) {
              toast.info('Publicación eliminada', 'Tu publicación ha sido eliminada.');
            } else {
              toast.error('Error', res.error || 'No se pudo eliminar la publicación.');
              loadUserPosts();
            }
          },
        },
      ]
    );
  };

  const handlePostOptions = (post: CommunityPostItem) => {
    Alert.alert(
      'Opciones de publicación',
      'Elige una acción para tu publicación',
      [
        { text: 'Editar', onPress: () => handleOpenEditPost(post) },
        { text: 'Eliminar', style: 'destructive', onPress: () => handleDeletePost(post) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleUnblock = async (blockedId: string) => {
    await unblockUser(blockedId);
    setBlockedUserIds((prev) => prev.filter((id) => id !== blockedId));
    toast.success('Usuario desbloqueado', 'Ahora volverás a ver su contenido en la comunidad.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar />

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
        {/* Profile Header Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border },
          ]}
        >
          {user ? (
            <>
              {/* Avatar + Edit Photo icon */}
              <View style={styles.avatarContainer}>
                {user.avatarUrl ? (
                  <Image source={{ uri: resolveImageUrl(user.avatarUrl) || user.avatarUrl, cache: 'force-cache' }} style={styles.avatarImg} fadeDuration={0} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarInitials}>
                      {(user.displayName || user.name || 'U').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.cameraBadge, { backgroundColor: colors.primary }]}
                  onPress={openEditModal}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* User Identity */}
              <Text style={[styles.userName, { color: colors.text }]}>
                {user.displayName || user.name}
              </Text>
              {user.username && (
                <Text style={[styles.userUsername, { color: colors.textMuted }]}>
                  @{user.username}
                </Text>
              )}
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                {user.email}
              </Text>

              {/* Biography */}
              {user.bio ? (
                <View style={[styles.bioBox, { backgroundColor: isDark ? '#1F2430' : '#F8FAFC' }]}>
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                    {user.bio}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBioBtn} onPress={openEditModal}>
                  <Sparkles size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.addBioText, { color: colors.primary }]}>
                    Añade una biografía a tu perfil
                  </Text>
                </TouchableOpacity>
              )}

              {/* Social Stat Counters */}
              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => setActiveTab('posts')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    {userPosts.length}
                  </Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Posts</Text>
                </TouchableOpacity>

                <View style={[styles.statSep, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => openFollowersModal('Seguidores')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    {user.followersCount ?? 0}
                  </Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Seguidores</Text>
                </TouchableOpacity>

                <View style={[styles.statSep, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => openFollowersModal('Siguiendo')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    {user.followingCount ?? 0}
                  </Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Siguiendo</Text>
                </TouchableOpacity>

                <View style={[styles.statSep, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() => openFollowersModal('Núcleo')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statVal, { color: colors.primary, fontWeight: '900' }]}>
                    {user.nucleoCount ?? 0}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Sparkles size={11} color={colors.primary} />
                    <Text style={[styles.statLbl, { color: colors.primary, fontWeight: '800' }]}>Núcleo</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.profileActionRow}>
                <TouchableOpacity
                  style={[styles.profileActionBtn, { backgroundColor: colors.inputBackground }]}
                  onPress={openEditModal}
                  activeOpacity={0.7}
                >
                  <Edit3 size={15} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.profileActionText, { color: colors.text }]}>Editar Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileActionBtn, { backgroundColor: isDark ? '#1F2430' : '#F1F5F9' }]}
                  onPress={() => router.push(`/user/${encodeURIComponent(user.id)}` as any)}
                  activeOpacity={0.7}
                >
                  <Eye size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.profileActionText, { color: colors.primary }]}>Perfil Público</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Guest View */
            <View style={styles.guestContainer}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <User size={38} color="#FFFFFF" />
              </View>
              <Text style={[styles.userName, { color: colors.text, marginTop: 12 }]}>
                Sesión de Invitado
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted, textAlign: 'center', marginBottom: 16 }]}>
                Regístrate o inicia sesión para guardar artículos, seguir a otros lectores y recibir alertas.
              </Text>
              <TouchableOpacity
                style={[styles.mainLoginBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/login')}
                activeOpacity={0.8}
              >
                <Text style={styles.mainLoginBtnText}>Iniciar Sesión / Registrarse</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tab Selector */}
        {user ? (
          <View style={[styles.tabSelector, { backgroundColor: isDark ? '#161922' : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'posts' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#232A3B' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab('posts')}
            >
              <MessageSquare
                size={16}
                color={activeTab === 'posts' ? '#D32F2F' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'posts' ? colors.text : colors.textMuted },
                ]}
              >
                Mis Posts ({userPosts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'saved' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#232A3B' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab('saved')}
            >
              <Bookmark
                size={16}
                color={activeTab === 'saved' ? '#D32F2F' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'saved' ? colors.text : colors.textMuted },
                ]}
              >
                Guardados ({savedPosts.length + savedCommunityPosts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'settings' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#232A3B' : '#FFFFFF' },
                ],
              ]}
              onPress={() => setActiveTab('settings')}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'settings' ? colors.text : colors.textMuted },
                ]}
              >
                Ajustes
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tab: Mis Publicaciones */}
        {user && activeTab === 'posts' ? (
          <View style={styles.savedSection}>
            {loadingUserPosts ? (
              <ActivityIndicator color="#D32F2F" style={{ marginVertical: 32 }} />
            ) : userPosts.length === 0 ? (
              <View style={[styles.emptySavedBox, { borderColor: colors.border }]}>
                <MessageSquare size={42} color={colors.textMuted} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptySavedTitle, { color: colors.text }]}>
                  No tienes publicaciones aún
                </Text>
                <Text style={[styles.emptySavedSub, { color: colors.textMuted, marginBottom: 16 }]}>
                  Comparte tus reflexiones, análisis y opiniones con toda la comunidad de Hackeando el Sistema.
                </Text>
                <TouchableOpacity
                  style={[styles.createFirstPostBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(tabs)/community' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createFirstPostBtnText}>Ir al Feed Comunitario</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.savedList}>
                {userPosts.map((post) => (
                  <View
                    key={post.id}
                    style={[
                      styles.userPostCard,
                      { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.userPostHeader}>
                      <View style={styles.userPostAuthorRow}>
                        {user.avatarUrl ? (
                          <Image
                            source={{ uri: resolveImageUrl(user.avatarUrl) || user.avatarUrl }}
                            style={styles.userPostAvatar}
                          />
                        ) : (
                          <View style={[styles.userPostAvatarFallback, { backgroundColor: colors.primary }]}>
                            <Text style={styles.userPostAvatarInitial}>
                              {(user.displayName || user.name || 'U').slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View>
                          <Text style={[styles.userPostAuthorName, { color: colors.text }]}>
                            {user.displayName || user.name}
                          </Text>
                          <Text style={[styles.userPostDate, { color: colors.textMuted }]}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.userPostOptionsBtn}
                        onPress={() => handlePostOptions(post)}
                      >
                        <MoreVertical size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.userPostContent, { color: colors.text }]}>
                      {post.content}
                    </Text>

                    {post.mediaUrl ? (
                      <Image
                        source={{ uri: post.mediaUrl }}
                        style={styles.userPostImage}
                        resizeMode="cover"
                      />
                    ) : null}

                    <View style={[styles.userPostFooter, { borderTopColor: colors.border }]}>
                      <View style={styles.userPostStat}>
                        <Heart size={15} color={post.isLiked ? '#D32F2F' : colors.textMuted} fill={post.isLiked ? '#D32F2F' : 'transparent'} />
                        <Text style={[styles.userPostStatText, { color: colors.textMuted }]}>
                          {post.likesCount || 0}
                        </Text>
                      </View>
                      <View style={styles.userPostStat}>
                        <MessageSquare size={15} color={colors.textMuted} />
                        <Text style={[styles.userPostStatText, { color: colors.textMuted }]}>
                          {post.commentsCount || 0}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.userPostActionLink}
                        onPress={() => router.push('/(tabs)/community' as any)}
                      >
                        <Text style={[styles.userPostActionLinkText, { color: colors.primary }]}>
                          Ver en Comunidad
                        </Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Tab 1: Saved Items (Articles & Community) */}
        {user && activeTab === 'saved' ? (
          <View style={styles.savedSection}>
            {/* Sub-tab selector */}
            <View style={[styles.subTabSelector, { backgroundColor: isDark ? '#1F2430' : '#E2E8F0' }]}>
              <TouchableOpacity
                style={[
                  styles.subTabBtn,
                  savedSubTab === 'articles' && [
                    styles.subTabBtnActive,
                    { backgroundColor: isDark ? '#161922' : '#FFFFFF' },
                  ],
                ]}
                onPress={() => setSavedSubTab('articles')}
              >
                <Text
                  style={[
                    styles.subTabBtnText,
                    { color: savedSubTab === 'articles' ? colors.text : colors.textMuted },
                    savedSubTab === 'articles' && { fontWeight: '800' },
                  ]}
                >
                  Artículos ({savedPosts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.subTabBtn,
                  savedSubTab === 'community' && [
                    styles.subTabBtnActive,
                    { backgroundColor: isDark ? '#161922' : '#FFFFFF' },
                  ],
                ]}
                onPress={() => setSavedSubTab('community')}
              >
                <Text
                  style={[
                    styles.subTabBtnText,
                    { color: savedSubTab === 'community' ? colors.text : colors.textMuted },
                    savedSubTab === 'community' && { fontWeight: '800' },
                  ]}
                >
                  Comunidad ({savedCommunityPosts.length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingSaved ? (
              <ActivityIndicator color="#D32F2F" style={{ marginVertical: 32 }} />
            ) : savedSubTab === 'articles' ? (
              savedPosts.length === 0 ? (
                <View style={[styles.emptySavedBox, { borderColor: colors.border }]}>
                  <Bookmark size={42} color={colors.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptySavedTitle, { color: colors.text }]}>
                    No tienes artículos guardados
                  </Text>
                  <Text style={[styles.emptySavedSub, { color: colors.textMuted }]}>
                    Pulsa el ícono de marcador en cualquier noticia para leerla más tarde desde aquí.
                  </Text>
                </View>
              ) : (
                <View style={styles.savedList}>
                  {savedPosts.map((post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={[
                        styles.savedCard,
                        { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border },
                      ]}
                      onPress={() => router.push(`/article/${encodeURIComponent(post.slug)}`)}
                      activeOpacity={0.8}
                    >
                      {post.featuredImage ? (
                        <Image source={{ uri: post.featuredImage, cache: 'force-cache' }} style={styles.savedThumb} fadeDuration={0} />
                      ) : (
                        <View style={[styles.savedThumbPlaceholder, { backgroundColor: isDark ? '#1F2430' : '#E2E8F0' }]}>
                          <Bookmark size={24} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.savedInfo}>
                        <Text style={[styles.savedCategory, { color: colors.primary }]}>
                          {post.category || 'General'}
                        </Text>
                        <Text style={[styles.savedTitle, { color: colors.text }]} numberOfLines={2}>
                          {post.title}
                        </Text>
                        <Text style={[styles.savedDate, { color: colors.textMuted }]}>
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('es-DO') : ''}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : (
              savedCommunityPosts.length === 0 ? (
                <View style={[styles.emptySavedBox, { borderColor: colors.border }]}>
                  <Bookmark size={42} color={colors.textMuted} style={{ marginBottom: 10 }} />
                  <Text style={[styles.emptySavedTitle, { color: colors.text }]}>
                    No tienes publicaciones de comunidad guardadas
                  </Text>
                  <Text style={[styles.emptySavedSub, { color: colors.textMuted }]}>
                    Toca el ícono de marcador en cualquier post del feed comunitario para guardarlo aquí.
                  </Text>
                </View>
              ) : (
                <View style={styles.savedList}>
                  {savedCommunityPosts.map((cPost) => (
                    <View
                      key={cPost.id}
                      style={[
                        styles.savedCommunityCard,
                        { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.savedCommunityHeader}>
                        <View style={styles.savedCommunityAuthor}>
                          {cPost.user?.avatarUrl ? (
                            <Image
                              source={{ uri: resolveImageUrl(cPost.user.avatarUrl) || cPost.user.avatarUrl }}
                              style={styles.savedCommunityAvatar}
                            />
                          ) : (
                            <View style={[styles.savedCommunityAvatarFallback, { backgroundColor: colors.primary }]}>
                              <Text style={styles.savedCommunityAvatarInitial}>
                                {(cPost.user?.displayName || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text style={[styles.savedCommunityName, { color: colors.text }]}>
                              {cPost.user?.displayName || 'Usuario'}
                            </Text>
                            <Text style={[styles.savedCommunityUsername, { color: colors.textMuted }]}>
                              @{cPost.user?.username || 'usuario'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveSavedCommunityPost(cPost)}
                          style={styles.removeSavedBtn}
                        >
                          <Bookmark size={18} color="#D32F2F" fill="#D32F2F" />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.savedCommunityContent, { color: colors.text }]}>
                        {cPost.content}
                      </Text>

                      <View style={styles.savedCommunityFooter}>
                        <Text style={[styles.savedDate, { color: colors.textMuted }]}>
                          {cPost.createdAt ? new Date(cPost.createdAt).toLocaleDateString('es-DO') : 'Reciente'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => router.push('/(tabs)/community' as any)}
                          style={styles.viewCommunityLink}
                        >
                          <Text style={[styles.viewCommunityLinkText, { color: colors.primary }]}>
                            Ver en Comunidad
                          </Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        ) : null}

        {/* Tab 2: Settings & Account */}
        {(!user || activeTab === 'settings') && (
          <View style={styles.settingsSection}>
            {/* Push Notifications Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICACIONES</Text>
              <View style={[styles.optionsGroup, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border }]}>
                <View style={[styles.optionRow, { justifyContent: 'space-between' }]}>
                  <View style={[styles.optionLeft, { flex: 1, marginRight: 12 }]}>
                    <Bell size={18} color={pushEnabled ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionText, { color: colors.text }]}>Notificaciones Push</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {pushEnabled
                          ? 'Recibirás alertas de actividad, comentarios y respuestas.'
                          : 'Notificaciones push desactivadas en este dispositivo.'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={pushEnabled}
                    onValueChange={handleTogglePushNotifications}
                    disabled={togglingPush}
                    trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                    thumbColor={Platform.OS === 'android' ? (pushEnabled ? '#FFFFFF' : '#94A3B8') : undefined}
                  />
                </View>
              </View>
            </View>

            {/* Theme Settings Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APARIENCIA Y TEMA</Text>
              <View style={[styles.optionsGroup, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border }]}>
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

            {/* Moderación y Seguridad */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SEGURIDAD Y MODERACIÓN</Text>
              <View style={[styles.optionsGroup, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setBlockedUsersModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <UserX size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Usuarios Bloqueados</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }}>
                      {blockedUserIds.length}
                    </Text>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    Alert.alert(
                      'Normas de la Comunidad (EULA)',
                      'Hackeando el Sistema mantiene una política estricta de tolerancia cero ante contenidos objetables o abusivos:\n\n• Queda prohibido el acoso, amenazas o lenguaje que incite al odio.\n• No se permite spam, desinformación intencionada o material sexualmente explícito.\n• Toda infracción conlleva la eliminación del contenido en menos de 24 horas y la suspensión permanente de la cuenta.\n• Puedes bloquear usuarios o reportar publicaciones en cualquier momento con el botón de opciones (⋮).'
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Shield size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Normas de la Comunidad</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Legal Links */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>POLÍTICAS Y TÉRMINOS</Text>
              <View style={[styles.optionsGroup, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => Linking.openURL('https://hackeandoelsistema.net/politica-de-privacidad')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <ShieldCheck size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Política de Privacidad</Text>
                  </View>
                  <ExternalLink size={14} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => Linking.openURL('https://hackeandoelsistema.net/terminos-de-uso')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <FileText size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Términos y Condiciones</Text>
                  </View>
                  <ExternalLink size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Management & Logout */}
            {user ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GESTIÓN DE CUENTA</Text>
                <View style={[styles.optionsGroup, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: colors.border }]}>
                  <TouchableOpacity style={styles.optionRow} onPress={handleLogout}>
                    <View style={styles.optionLeft}>
                      <LogOut size={18} color="#D32F2F" style={{ marginRight: 10 }} />
                      <Text style={[styles.optionText, { color: '#D32F2F', fontWeight: '700' }]}>
                        Cerrar Sesión
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <TouchableOpacity style={styles.optionRow} onPress={handleDeleteAccount}>
                    <View style={styles.optionLeft}>
                      <Trash2 size={18} color="#EF4444" style={{ marginRight: 10 }} />
                      <Text style={[styles.optionText, { color: '#EF4444' }]}>
                        Darme de Baja (Eliminar Cuenta)
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#161922' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Editar Perfil</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setEditModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.text }]}>Nombre para mostrar</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Tu nombre o alias"
                placeholderTextColor={colors.textMuted}
              />

              {/* Foto de Perfil (Avatar) - Subida directa idéntica a la web */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>
                Foto de Perfil (Avatar)
              </Text>

              <View style={[styles.avatarUploadContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <View style={styles.avatarPreviewWrapper}>
                  {editAvatarUrl ? (
                    <Image source={{ uri: resolveImageUrl(editAvatarUrl) || editAvatarUrl }} style={styles.avatarPreviewImg} />
                  ) : (
                    <View style={[styles.avatarPreviewPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarPreviewInitials}>
                        {(editName || user?.displayName || 'U').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.avatarUploadActions}>
                  <TouchableOpacity
                    style={[styles.uploadPhotoBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    <Camera size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadPhotoBtnText}>
                      {editAvatarUrl ? 'Cambiar Foto' : 'Subir Mi Foto de Perfil'}
                    </Text>
                  </TouchableOpacity>

                  {editAvatarUrl ? (
                    <TouchableOpacity
                      style={[styles.removePhotoBtn, { borderColor: colors.border }]}
                      onPress={() => {
                        setEditAvatarUrl('');
                        setSelectedAvatarFile(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={13} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.removePhotoBtnText}>Quitar Foto</Text>
                    </TouchableOpacity>
                  ) : null}

                  <Text style={[styles.uploadHintText, { color: colors.textMuted }]}>
                    Toca para seleccionar desde tu galería (JPG, PNG, WEBP).
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Biografía</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
                ]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Cuéntanos un poco sobre ti..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Followers / Following List Modal */}
      <Modal
        visible={followModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFollowModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#161922' : '#FFFFFF', maxHeight: '75%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                {followModalTitle === 'Núcleo' ? 'Mi Núcleo' : followModalTitle}
              </Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setFollowModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingFollowModal ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#D32F2F" size="large" />
              </View>
            ) : followModalUsers.length === 0 ? (
              <View style={styles.modalLoading}>
                {followModalTitle === 'Núcleo' ? (
                  <Sparkles size={40} color={colors.primary} style={{ marginBottom: 8 }} />
                ) : (
                  <Users size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
                )}
                <Text style={[styles.emptyModalText, { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 }]}>
                  {followModalTitle === 'Núcleo'
                    ? 'Aún no tienes conexiones en tu Núcleo. Cuando sigas a un usuario y este te siga de vuelta, ambos formarán un Núcleo.'
                    : 'No hay usuarios para mostrar.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={followModalUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.userListItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setFollowModalVisible(false);
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.listName, { color: colors.text }]}>{item.displayName}</Text>
                        {followModalTitle === 'Núcleo' && (
                          <View
                            style={{
                              backgroundColor: colors.primary + '20',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                              ⚡ Núcleo
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.bio ? (
                        <Text style={[styles.listBio, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.bio}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Retención para Eliminación de Cuenta */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !deletingAccount && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.retentionModalBox, { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: isDark ? '#371B1D' : '#FEE2E2' }]}>
            <View style={styles.retentionHeader}>
              <View style={styles.retentionIconBox}>
                <AlertTriangle size={32} color="#DC2626" />
              </View>
              <Text style={[styles.retentionTitle, { color: colors.text }]}>
                ¿Deseas darte de baja y eliminar tu cuenta?
              </Text>
              <Text style={[styles.retentionSubtitle, { color: colors.textMuted }]}>
                Esta acción es definitiva. Antes de proceder, ten en cuenta los accesos y beneficios que perderás:
              </Text>
            </View>

            {/* Lista de Retención */}
            <View style={[styles.retentionWarningList, { backgroundColor: isDark ? '#231518' : '#FEF2F2', borderColor: isDark ? '#4A1D20' : '#FECACA' }]}>
              <Text style={styles.retentionWarningHeader}>
                Cosas que ya NO podrás hacer:
              </Text>

              <View style={styles.retentionItem}>
                <Text style={styles.retentionBullet}>✕</Text>
                <Text style={[styles.retentionItemText, { color: colors.text }]}>
                  Acceder a tus artículos guardados para leer más tarde.
                </Text>
              </View>

              <View style={styles.retentionItem}>
                <Text style={styles.retentionBullet}>✕</Text>
                <Text style={[styles.retentionItemText, { color: colors.text }]}>
                  Guardar publicaciones y participar en el feed comunitario.
                </Text>
              </View>

              <View style={styles.retentionItem}>
                <Text style={styles.retentionBullet}>✕</Text>
                <Text style={[styles.retentionItemText, { color: colors.text }]}>
                  Seguir a otros miembros de la comunidad o conservar a tus seguidores.
                </Text>
              </View>

              <View style={styles.retentionItem}>
                <Text style={styles.retentionBullet}>✕</Text>
                <Text style={[styles.retentionItemText, { color: colors.text }]}>
                  Recibir notificaciones push cuando respondan a tus comentarios.
                </Text>
              </View>

              <View style={styles.retentionItem}>
                <Text style={styles.retentionBullet}>✕</Text>
                <Text style={[styles.retentionItemText, { color: colors.text }]}>
                  Mantener tus sesiones activas en cualquier otro dispositivo.
                </Text>
              </View>
            </View>

            {/* Botones de acción */}
            <View style={styles.retentionActions}>
              <TouchableOpacity
                style={[styles.retentionKeepBtn, { backgroundColor: colors.primary }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.retentionKeepBtnText}>Mantener mi cuenta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.retentionDeleteBtn, { borderColor: '#DC2626' }]}
                onPress={handleConfirmDeleteAccount}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text style={styles.retentionDeleteBtnText}>Eliminar definitivamente</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Editar Publicación de la Comunidad */}
      <Modal
        visible={editPostModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditPostModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#161922' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Editar Publicación</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setEditPostModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="¿Qué deseas actualizar en tu publicación?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={250}
                value={editPostContent}
                onChangeText={setEditPostContent}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 }}>
                {editPostContent.length}/250
              </Text>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEditedPost}
                disabled={updatingPost}
              >
                {updatingPost ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Gestión de Usuarios Bloqueados */}
      <Modal
        visible={blockedUsersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBlockedUsersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#161922' : '#FFFFFF', maxHeight: '75%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Usuarios Bloqueados</Text>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.inputBackground }]}
                onPress={() => setBlockedUsersModalVisible(false)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {blockedUserIds.length === 0 ? (
              <View style={styles.modalLoading}>
                <UserX size={44} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyModalText, { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }]}>
                  No tienes usuarios bloqueados
                </Text>
                <Text style={[styles.emptyModalText, { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 }]}>
                  Los usuarios que bloquees en el feed comunitario aparecerán aquí y no verás sus publicaciones.
                </Text>
              </View>
            ) : (
              <FlatList
                data={blockedUserIds}
                keyExtractor={(item) => item}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View style={[styles.blockedUserRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.blockedUserInfo}>
                      <View style={[styles.blockedAvatarFallback, { backgroundColor: isDark ? '#232A3B' : '#E2E8F0' }]}>
                        <UserX size={18} color={colors.textMuted} />
                      </View>
                      <View>
                        <Text style={[styles.blockedUserName, { color: colors.text }]}>
                          Usuario bloqueado
                        </Text>
                        <Text style={[styles.blockedUserId, { color: colors.textMuted }]}>
                          ID: {item.slice(0, 12)}...
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.unblockBtn, { borderColor: colors.primary }]}
                      onPress={() => handleUnblock(item)}
                    >
                      <Text style={[styles.unblockBtnText, { color: colors.primary }]}>Desbloquear</Text>
                    </TouchableOpacity>
                  </View>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  userUsername: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  bioBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  addBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  addBioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 24,
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  mainLoginBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  mainLoginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedSection: {
    marginBottom: 16,
  },
  emptySavedBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySavedTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySavedSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  savedList: {
    gap: 10,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
  },
  savedThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    marginRight: 12,
  },
  savedThumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedInfo: {
    flex: 1,
    marginRight: 8,
  },
  savedCategory: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  savedDate: {
    fontSize: 11,
  },
  settingsSection: {
    gap: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    height: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  bioInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  modalLoading: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyModalText: {
    fontSize: 13,
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
  avatarUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 6,
    gap: 14,
  },
  avatarPreviewWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#DC2626',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
  },
  avatarPreviewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  avatarUploadActions: {
    flex: 1,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  uploadPhotoBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  removePhotoBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  uploadHintText: {
    fontSize: 10,
    marginTop: 2,
  },
  // Sub-tabs in Saved Section
  subTabSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  subTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Saved Community Cards
  savedCommunityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  savedCommunityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savedCommunityAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedCommunityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  savedCommunityAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  savedCommunityAvatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  savedCommunityName: {
    fontSize: 14,
    fontWeight: '700',
  },
  savedCommunityUsername: {
    fontSize: 12,
  },
  removeSavedBtn: {
    padding: 6,
  },
  savedCommunityContent: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  savedCommunityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  viewCommunityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCommunityLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Account Deletion Retention Modal Styles
  retentionModalBox: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  retentionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  retentionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  retentionTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  retentionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  retentionWarningList: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  retentionWarningHeader: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  retentionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  retentionBullet: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  retentionItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  retentionActions: {
    gap: 10,
  },
  retentionKeepBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retentionKeepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  retentionDeleteBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retentionDeleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  // User Posts Styling in Profile
  userPostCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  userPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userPostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userPostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  userPostAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userPostAvatarInitial: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  userPostAuthorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  userPostDate: {
    fontSize: 11,
    marginTop: 1,
  },
  userPostOptionsBtn: {
    padding: 4,
  },
  userPostContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  userPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  userPostFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  userPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userPostStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userPostActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  userPostActionLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  createFirstPostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  createFirstPostBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Blocked Users Management
  blockedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  blockedAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blockedUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  blockedUserId: {
    fontSize: 11,
    marginTop: 2,
  },
  unblockBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  unblockBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
