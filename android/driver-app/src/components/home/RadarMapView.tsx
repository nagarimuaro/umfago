import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';
import { SurgeArea } from '../../types/driver';
import { SoundService } from '../../services/sound';
import { getDriverMapHtml } from './map-template';

export interface RadarMapViewProps {
  onSelectSurge?: (surge: SurgeArea) => void;
  onSimulateOrder?: () => void;
}

export const RadarMapView: React.FC<RadarMapViewProps> = ({ onSelectSurge, onSimulateOrder }) => {
  const { currentLocation, isOnline, surgeAreas, currentOrder, activeRoute } = useDriver();
  const webViewRef = useRef<WebView<object>>(null);
  const [ready, setReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);

  const lat = currentLocation?.latitude ?? -0.664159;
  const lon = currentLocation?.longitude ?? 100.939844;
  const heading = currentLocation?.heading ?? 90;

  const mapHtml = useMemo(() => getDriverMapHtml(lat, lon), []);

  useEffect(() => {
    SoundService.setNativeRingHandler((playing) => {
      webViewRef.current?.injectJavaScript(`window.setOrderRing && window.setOrderRing(${playing}); true;`);
    });
    return () => SoundService.setNativeRingHandler(null);
  }, []);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'ready') {
        setReady(true);
      } else if (data?.type === 'SURGE_SELECT' && onSelectSurge) {
        const found = surgeAreas.find((s) => s.id === data.id);
        if (found) onSelectSurge(found);
      }
    } catch {
      // ignore
    }
  };

  // Sync driver & order state into MapLibre GL JS / Leaflet
  useEffect(() => {
    if (!ready) return;

    const isInTrip = currentOrder?.step === 'in_trip';
    const isArrived = currentOrder?.step === 'arrived_at_pickup';

    // Gunakan rute jalan raya riil (jarak terdekat) bila tersedia
    let routeCoords: Array<[number, number]> = [];
    if (currentOrder) {
      if (activeRoute && activeRoute.length > 0) {
        routeCoords = activeRoute;
      } else if (isInTrip) {
        routeCoords = [
          [lon, lat],
          [currentOrder.destination.longitude, currentOrder.destination.latitude],
        ];
      } else if (isArrived) {
        routeCoords = [
          [currentOrder.pickup.longitude, currentOrder.pickup.latitude],
          [currentOrder.destination.longitude, currentOrder.destination.latitude],
        ];
      } else {
        routeCoords = [
          [lon, lat],
          [currentOrder.pickup.longitude, currentOrder.pickup.latitude],
        ];
      }
    }

    const state = {
      driver: { lat, lon, heading },
      isOnline,
      surges: surgeAreas,
      order: currentOrder
        ? {
            step: currentOrder.step,
            pickup: isInTrip
              ? null
              : {
                  lat: currentOrder.pickup.latitude,
                  lon: currentOrder.pickup.longitude,
                },
            dest: {
              lat: currentOrder.destination.latitude,
              lon: currentOrder.destination.longitude,
            },
            route: routeCoords,
          }
        : null,
    };

    webViewRef.current?.injectJavaScript(`window.updateState(${JSON.stringify(state)}); true;`);
  }, [ready, lat, lon, heading, isOnline, currentOrder, surgeAreas, activeRoute]);

  const handleRecenter = () => {
    webViewRef.current?.injectJavaScript(`window.recenter(${lon}, ${lat}); true;`);
  };

  const handleTogglePerspective = () => {
    setIs3DMode((prev) => !prev);
    webViewRef.current?.injectJavaScript(`window.togglePerspective(${lon}, ${lat}, ${heading}); true;`);
  };

  const handleToggleNightMode = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    webViewRef.current?.injectJavaScript(`window.toggleNightMode(${next}); true;`);
  };

  const handleZoomIn = () => {
    webViewRef.current?.injectJavaScript(`window.zoomIn(); true;`);
  };

  const handleZoomOut = () => {
    webViewRef.current?.injectJavaScript(`window.zoomOut(); true;`);
  };

  return (
    <View style={styles.container}>
      <WebView<object>
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
      />

      {/* Driver Cockpit Controls */}
      <View style={styles.floatingControls}>
        {/* Recenter Driver GPS */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleRecenter} style={styles.controlBtn}>
          <Ionicons name="locate" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* 3D Navigation Perspective Mode */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTogglePerspective}
          style={[
            styles.controlBtn,
            is3DMode && { backgroundColor: 'rgba(200, 255, 0, 0.2)', borderColor: colors.primary },
          ]}
        >
          <Ionicons
            name={is3DMode ? 'navigate' : 'compass-outline'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>

        {/* Day / Night Map Mode Toggle */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleNightMode}
          style={[
            styles.controlBtn,
            isNightMode && { backgroundColor: 'rgba(200, 255, 0, 0.2)', borderColor: colors.primary },
          ]}
        >
          <Ionicons
            name={isNightMode ? 'moon' : 'sunny-outline'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>

        {/* Zoom Controls */}
        <View style={styles.zoomBtnGroup}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleZoomIn} style={styles.zoomBtn}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity activeOpacity={0.7} onPress={handleZoomOut} style={styles.zoomBtn}>
            <Ionicons name="remove" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Demo Test Order Trigger */}
        {onSimulateOrder && (
          <TouchableOpacity activeOpacity={0.8} onPress={onSimulateOrder} style={styles.simulateBtn}>
            <MaterialIcons name="bolt" size={18} color={colors.black} />
            <Text style={styles.simulateText}>Test Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121517',
  },
  webView: {
    flex: 1,
    backgroundColor: '#121517',
  },
  floatingControls: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 24,
    gap: spacing.sm,
    alignItems: 'center',
    zIndex: 20,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 28, 28, 0.95)',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  zoomBtnGroup: {
    backgroundColor: 'rgba(27, 28, 28, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  zoomBtn: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.outline,
    width: '100%',
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
