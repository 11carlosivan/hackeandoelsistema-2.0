import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@/constants/Config';

// Configurar cómo se presentan las notificaciones cuando la app está abierta (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permisos y registra el Expo Push Token del usuario en el backend.
 */
export async function registerForPushNotificationsAsync(authToken: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permiso para notificaciones no otorgado');
      return null;
    }

    // Configurar canal en Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2323',
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    ).catch((err) => {
      console.warn('[Push] Error al obtener push token:', err);
      return null;
    });

    if (!tokenResponse?.data) {
      return null;
    }

    const pushToken = tokenResponse.data;

    // Enviar el token al backend
    await fetch(`${API_BASE_URL}/api/v1/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    }).catch((err) => {
      console.warn('[Push] Error al registrar push token en backend:', err);
    });

    return pushToken;
  } catch (error) {
    console.warn('[Push] Error inesperado configurando notificaciones:', error);
    return null;
  }
}

const PUSH_ENABLED_STORAGE_KEY = '@hes_push_notifications_enabled';

export async function isPushNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PUSH_ENABLED_STORAGE_KEY);
    if (val === null) return true; // Default: habilitadas
    return val === 'true';
  } catch {
    return true;
  }
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PUSH_ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export async function unregisterPushNotificationsAsync(authToken: string): Promise<boolean> {
  try {
    await setPushNotificationsEnabled(false);
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/push-token`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn('[Push] Error al desregistrar push token:', err);
    return false;
  }
}
