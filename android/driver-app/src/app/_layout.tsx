import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DriverProvider } from '../hooks/use-driver';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DriverProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="history/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile/vehicle" options={{ headerShown: false }} />
          <Stack.Screen name="profile/kyc" options={{ headerShown: false }} />
          <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
        </Stack>
      </DriverProvider>
    </SafeAreaProvider>
  );
}
