import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';
import { SurgeArea } from '../../types/driver';
import { getDriverMapHtml } from './map-template';

export interface RadarMapViewProps {
  onSelectSurge?: (surge: SurgeArea) => void;
  onSimulateOrder?: () => void;
}

export const RadarMapView: React.FC<RadarMapViewProps> = ({ onSelectSurge, onSimulateOrder }) => {
  const { currentLocation, isOnline, surgeAreas, currentOrder } = useDriver();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [isNightMode, setIsNightMode] = useState(true);

  const lat = currentLocation?.latitude ?? -6.1952;
  const lon = currentLocation?.longitude ?? 106.8231;
  const heading = currentLocation?.heading ?? 90;

  const mapHtml = useMemo(() => getDriverMapHtml(lat, lon), []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
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
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, [surgeAreas, onSelectSurge]);

  const sendCommand = (cmd: object) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(cmd), '*');
    }
  };

  // Sync state to Web MapLibre GL
  useEffect(() => {
    if (!ready) return;

    const isInTrip = currentOrder?.step === 'in_trip';
    const isArrived = currentOrder?.step === 'arrived_at_pickup';

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
            route: isInTrip
              ? [
                  [lon, lat],
                  [currentOrder.destination.longitude, currentOrder.destination.latitude],
                ]
              : isArrived
              ? [
                  [currentOrder.pickup.longitude, currentOrder.pickup.latitude],
                  [currentOrder.destination.longitude, currentOrder.destination.latitude],
                ]
              : [
                  [lon, lat],
                  [currentOrder.pickup.longitude, currentOrder.pickup.latitude],
                ],
          }
        : null,
    };

    sendCommand({ type: 'UPDATE_STATE', state });
  }, [ready, lat, lon, heading, isOnline, currentOrder, surgeAreas]);

  const handleRecenter = () => {
    sendCommand({ type: 'RECENTER', lon, lat });
  };

  const handleTogglePerspective = () => {
    setIs3DMode((prev) => !prev);
    sendCommand({ type: 'PERSPECTIVE', lon, lat, heading });
  };

  const handleToggleNightMode = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    sendCommand({ type: 'TOGGLE_NIGHT', enabled: next });
  };

  const handleZoomIn = () => {
    sendCommand({ type: 'ZOOM_IN' });
  };

  const handleZoomOut = () => {
    sendCommand({ type: 'ZOOM_OUT' });
  };

  return (
    <View style={styles.container}>
      {/* MapLibre GL OSM Navigation View for Web */}
      <iframe
        key="driver-radar-map-v3"
        ref={iframeRef}
        srcDoc={mapHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#121517',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        title="Driver MapLibre Navigation"
      />

      {/* Driver Cockpit Floating Controls */}
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
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121517',
    overflow: 'hidden',
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
