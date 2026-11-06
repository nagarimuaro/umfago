import { Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Brand, Palette, Typography } from '@/constants/design-system';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { BookingProvider } from '@/hooks/use-booking';
import { FoodOrderProvider } from '@/hooks/use-food-order';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();

  const isLoggedIn = !!user;

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        // Alur pembuka: Splash screen geser (onboarding slider) -> register / login
        router.replace('/auth/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isLoggedIn, isLoading]);

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Palette.surface },
          headerTintColor: Brand.ink,
          headerTitleStyle: Typography.headlineMd,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Palette.surface },
        }}>
        <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/payment" options={{ headerShown: false }} />
        <Stack.Screen name="profile/addresses" options={{ headerShown: false }} />
        <Stack.Screen name="profile/safety" options={{ headerShown: false }} />
        <Stack.Screen name="profile/help" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Food is reached from the Home tile, and draws its own search app bar. */}
        <Stack.Screen name="food" options={{ headerShown: false }} />
        {/* A store's menu floats its own back button over the hero photo, so no header. */}
        <Stack.Screen name="food/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="food/checkout" options={{ headerShown: false }} />
        <Stack.Screen name="food/address" options={{ headerShown: false }} />
        <Stack.Screen name="history/[id]" options={{ headerShown: false }} />
        {/* The service screen floats its own back button over the map, so no header. */}
        <Stack.Screen name="booking/service" options={{ headerShown: false }} />
        <Stack.Screen name="booking/searching" options={{ headerShown: false }} />
        <Stack.Screen name="booking/trip" options={{ headerShown: false }} />
        <Stack.Screen name="booking/order-done" options={{ headerShown: false }} />
        {/* The conversation screen draws its own app bar with the driver's details. */}
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        {/*
          The call screen dismisses itself with a downward chevron rather than a back
          arrow, so it is presented as a full-screen modal that slides up over the
          conversation instead of being pushed onto it.
        */}
        <Stack.Screen
          name="call/[id]"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <BookingProvider>
        <FoodOrderProvider>
          <RootNavigator />
        </FoodOrderProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

