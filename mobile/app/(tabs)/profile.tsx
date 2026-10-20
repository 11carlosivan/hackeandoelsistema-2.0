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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchSavedPosts,
  updateMyProfile,
  fetchUserFollowers,
  fetchUserFollowing,
  uploadAvatarImage,
  Post,
  FollowUserItem,
} from '@/services/api';

export default function ProfileScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { user, token, logout, deleteAccount, refreshUser, updateUser, refreshAccessToken } = useAuth();
  const { toast, showModal } = useNotification();
  const router = useRouter();

  // Active view tab: 'saved' or 'settings'
  const [activeTab, setActiveTab] = useState<'saved' | 'settings'>('saved');

  // Saved Posts state
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Followers / Following Modal state
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState<'Seguidores' | 'Siguiendo'>('Seguidores');
  const [followModalUsers, setFollowModalUsers] = useState<FollowUserItem[]>([]);
  const [loadingFollowModal, setLoadingFollowModal] = useState(false);

  useEffect(() => {
    if (token) {
      loadSavedArticles();
      refreshUser();
    }
  }, [token]);

  async function loadSavedArticles() {
    if (!token) return;
    setLoadingSaved(true);
    const posts = await fetchSavedPosts(token);
    setSavedPosts(posts);
    setLoadingSaved(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshUser();
    if (token) {
      await loadSavedArticles();
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

  async function openFollowersModal(type: 'Seguidores' | 'Siguiendo') {
    if (!user || !user.id) return;
    setFollowModalTitle(type);
    setFollowModalVisible(true);
    setLoadingFollowModal(true);
    try {
      const list =
        type === 'Seguidores'
          ? await fetchUserFollowers(user.id)
          : await fetchUserFollowing(user.id);
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
    showModal({
      icon: 'error',
      title: 'Eliminar Mi Cuenta',
      message:
        '¿Estás seguro de que deseas eliminar permanentemente tu cuenta y todos tus datos guardados? Esta acción es irreversible.',
      buttons: [
        {
          text: 'Eliminar Definitivamente',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            setSavedPosts([]);
            toast.success('Cuenta Eliminada', 'Tu cuenta y datos asociados han sido eliminados.');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    });
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
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
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
                  onPress={() => setActiveTab('saved')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    {savedPosts.length || user.savedPostsCount || 0}
                  </Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Guardados</Text>
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
                Artículos Guardados ({savedPosts.length})
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
                Ajustes y Cuenta
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tab 1: Saved Posts */}
        {user && activeTab === 'saved' ? (
          <View style={styles.savedSection}>
            {loadingSaved ? (
              <ActivityIndicator color="#D32F2F" style={{ marginVertical: 32 }} />
            ) : savedPosts.length === 0 ? (
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
                      <Image source={{ uri: post.featuredImage }} style={styles.savedThumb} />
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
            )}
          </View>
        ) : null}

        {/* Tab 2: Settings & Account */}
        {(!user || activeTab === 'settings') && (
          <View style={styles.settingsSection}>
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
        <View style={styles.modalOverlay}>
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

            <ScrollView contentContainerStyle={{ padding: 20 }}>
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
                    <Image source={{ uri: editAvatarUrl }} style={styles.avatarPreviewImg} />
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
        </View>
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
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>{followModalTitle}</Text>
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
                <Users size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyModalText, { color: colors.textMuted }]}>
                  No hay usuarios para mostrar.
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
                      <Image source={{ uri: item.avatarUrl }} style={styles.listAvatar} />
                    ) : (
                      <View style={[styles.listAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.listInitials}>
                          {(item.displayName || 'U').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.listUserInfo}>
                      <Text style={[styles.listName, { color: colors.text }]}>{item.displayName}</Text>
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
});
