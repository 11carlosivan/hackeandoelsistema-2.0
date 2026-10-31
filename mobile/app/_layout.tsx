import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { MatrixLoadingScreen } from '@/components/MatrixLoadingScreen';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function handleNotificationData(data: any) {
      if (!data) return;
      if (data.slug || data.postSlug) {
        router.push(`/article/${encodeURIComponent(data.slug || data.postSlug)}`);
      } else if (data.type?.includes('COMMUNITY') && data.postId) {
        router.push({
          pathname: '/(tabs)/community',
          params: { postId: data.postId, commentId: data.commentId || '' },
        } as any);
      } else if (data.postId) {
        router.push(`/article/${encodeURIComponent(data.postId)}`);
      } else if (data.actorId) {
        router.push(`/user/${encodeURIComponent(data.actorId)}` as any);
      }
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        handleNotificationData(data);
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        handleNotificationData(data);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={showSplash ? 'light' : (isDark ? 'light' : 'dark')} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article/[slug]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="job/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="job/create" options={{ headerShown: false }} />
        <Stack.Screen name="job/my-jobs" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="register" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>

      {showSplash ? (
        <MatrixLoadingScreen onFinish={() => setShowSplash(false)} />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

