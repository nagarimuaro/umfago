import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';

export const OnlineStatusToggle: React.FC = () => {
  const { isOnline, toggleOnline, currentOrder, currentLocation, locateDriverNow } = useDriver();
  const [address, setAddress] = useState<string>('Mendeteksi Lokasi GPS...');

  useEffect(() => {
    let isMounted = true;
    if (!currentLocation) return;

    (async () => {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.latitude}&lon=${currentLocation.longitude}`,
          { headers: { 'User-Agent': 'UmfagoDriver/1.0' } }
        );
        if (resp.ok) {
          const data = await resp.json();
          const addr = data.address;
          const street = addr?.road || data.name || addr?.suburb || addr?.village;
          const city = addr?.city_district || addr?.city || addr?.county || addr?.state || 'Sumatera Barat';
          if (isMounted) {
            setAddress(street ? `${street}, ${city}` : city);
          }
          return;
        }
      } catch {
        // Fallback ke alamat default bila offline
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const getStatusContent = () => {
    if (currentOrder) {
      return (
        <Text style={[styles.statusText, { color: colors.busy }]} numberOfLines={1}>
          Sedang Menjalankan Order
        </Text>
      );
    }

    if (isOnline) {
      return (
        <Text style={styles.locationText} numberOfLines={1}>
          {address}
        </Text>
      );
    }

    return (
      <Text style={styles.offlineText} numberOfLines={1}>
        Driver Sedang Istirahat
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Left Status Indicator & Location Address (Tap to refresh & center GPS) */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => locateDriverNow(true)}
        style={styles.statusGroup}
      >
        <View style={styles.dotContainer}>
          {isOnline && <View style={styles.pingRing} />}
          <View
            style={[
              styles.innerDot,
              {
                backgroundColor: currentOrder
                  ? colors.busy
                  : isOnline
                  ? colors.primary
                  : colors.offline,
              },
            ]}
          />
        </View>

        <View style={styles.textContainer}>
          {getStatusContent()}
        </View>
      </TouchableOpacity>

      {/* Right Quick Toggle Switch Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleOnline}
        disabled={!!currentOrder}
        style={[
          styles.toggleBtn,
          {
            backgroundColor: isOnline ? 'rgba(200, 255, 0, 0.12)' : colors.surfaceLow,
            borderColor: isOnline ? colors.primary : colors.outline,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleText,
            { color: isOnline ? colors.primary : colors.textSecondary },
          ]}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
        <Ionicons
          name={isOnline ? 'toggle' : 'toggle-outline'}
          size={22}
          color={isOnline ? colors.primary : colors.offline}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(25, 26, 26, 0.94)',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  dotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
