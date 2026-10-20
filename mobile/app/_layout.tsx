import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { MatrixLoadingScreen } from '@/components/MatrixLoadingScreen';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

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

