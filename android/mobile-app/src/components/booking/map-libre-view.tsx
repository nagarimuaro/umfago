import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { Overlay, Radius, Sizes, Spacing } from '@/constants/design-system';
import { useBooking } from '@/hooks/use-booking';

interface MapLibreOSMViewProps {
  height?: number;
  activeTarget?: 'pickup' | 'destination';
  /** Dipanggil saat pengguna menekan "Pilih lokasi ini" dengan koordinat tengah peta. */
  onConfirmLocation?: (lat: number, lon: number) => void;
  /** Titik sudah dikunci: pin tengah disembunyikan, geser peta tidak mengubah apa pun. */
  pinLocked?: boolean;
  confirming?: boolean;
  onUnlock?: () => void;
}

const FallbackCenter = { lat: -0.664159, lon: 100.939844 };

/**
 * Peta MapLibre GL JS + tile OpenStreetMap di dalam WebView.
 * HTML dimuat sekali; marker, rute, dan kamera diperbarui lewat injectJavaScript
 * supaya peta tidak reload (dan tidak memicu moveend palsu) setiap koordinat berubah.
 */
export function MapLibreOSMView({
  height = Sizes.mapBackdrop,
  activeTarget = 'destination',
  onConfirmLocation,
  pinLocked = false,
  confirming = false,
  onUnlock,
}: MapLibreOSMViewProps) {
  const { pickup, destination, route } = useBooking();
  const webViewRef = useRef<WebView<object>>(null);
  const [ready, setReady] = useState(false);
  const interactive = !!onConfirmLocation;

  // Pusat awal hanya dipakai saat HTML pertama kali dibuat.
  const initial = useRef({
    lat: pickup?.lat ?? FallbackCenter.lat,
    lon: pickup?.lon ?? FallbackCenter.lon,
  }).current;
  const center = useRef(initial);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body, html, #map { width: 100%; height: 100%; overflow: hidden; background: #e5e7eb; }
.mk { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center;
  justify-content: center; color: #fff; font-weight: bold; font-size: 11px; }
.mk-a { background: #10b981; } .mk-b { background: #ef4444; }
</style>
</head><body>
<div id="map"></div>
<script>
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: { osm: { type: 'raster', tileSize: 256, attribution: '&copy; OpenStreetMap',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'] } },
    layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
  },
  center: [${initial.lon}, ${initial.lat}],
  zoom: 16,
  attributionControl: false
});

function mk(cls, txt) { const el = document.createElement('div'); el.className = 'mk ' + cls; el.innerText = txt; return el; }
const markerA = new maplibregl.Marker({ element: mk('mk-a', 'A') });
const markerB = new maplibregl.Marker({ element: mk('mk-b', 'B') });
const empty = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };

map.on('moveend', () => {
  const c = map.getCenter();
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center', lat: c.lat, lon: c.lng }));
});

window.setState = function (s) {
  if (s.pickup) markerA.setLngLat(s.pickup).addTo(map); else markerA.remove();
  if (s.dest) markerB.setLngLat(s.dest).addTo(map); else markerB.remove();
  const src = map.getSource('route');
  if (src) src.setData(s.route && s.route.length > 1
    ? { type: 'Feature', geometry: { type: 'LineString', coordinates: s.route } } : empty);
};
window.focusOn = function (lng, lat) { map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15) }); };
window.fitAll = function (coords) {
  const b = new maplibregl.LngLatBounds();
  coords.forEach((c) => b.extend(c));
  map.fitBounds(b, { padding: 60, maxZoom: 16 });
};

map.on('load', () => {
  map.addSource('route', { type: 'geojson', data: empty });
  map.addLayer({ id: 'route', type: 'line', source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#4f6600', 'line-width': 6, 'line-opacity': 0.85 } });
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
});
</script>
</body></html>`,
    [initial]
  );

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(`${js}; true;`);
  }, []);

  const pLat = pickup?.lat;
  const pLon = pickup?.lon;
  const dLat = destination?.lat;
  const dLon = destination?.lon;
  const coords = route?.coordinates;

  // Sinkronkan marker & garis rute setiap koordinat atau rute berubah.
  useEffect(() => {
    if (!ready) return;
    const state = {
      pickup: pLat != null && pLon != null ? [pLon, pLat] : null,
      dest: dLat != null && dLon != null ? [dLon, dLat] : null,
      route: coords ?? null,
    };
    inject(`window.setState(${JSON.stringify(state)})`);
  }, [ready, pLat, pLon, dLat, dLon, coords, inject]);

  // Kamera: pada peta interaktif, ikuti titik yang dipilih lewat pencarian/GPS
  // (titik hasil geser pin sudah berada di tengah, jadi tidak digerakkan ulang).
  const pickupId = pickup?.id;
  const destId = destination?.id;
  useEffect(() => {
    if (!ready || !interactive || pLat == null || pLon == null) return;
    if (pickupId?.startsWith('map-')) return;
    inject(`window.focusOn(${pLon}, ${pLat})`);
  }, [ready, interactive, pickupId, pLat, pLon, inject]);

  useEffect(() => {
    if (!ready || !interactive || dLat == null || dLon == null) return;
    if (destId?.startsWith('map-')) return;
    inject(`window.focusOn(${dLon}, ${dLat})`);
  }, [ready, interactive, destId, dLat, dLon, inject]);

  // Saat kunci dibuka, arahkan kamera ke titik yang sedang diatur.
  const target = activeTarget === 'pickup' ? pickup : destination;
  useEffect(() => {
    if (!ready || !interactive || pinLocked || target?.lat == null || target?.lon == null) return;
    inject(`window.focusOn(${target.lon}, ${target.lat})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, interactive, pinLocked, activeTarget, inject]);

  // Peta non-interaktif (searching/trip): tampilkan seluruh rute.
  useEffect(() => {
    if (!ready || interactive) return;
    const all =
      coords && coords.length > 1
        ? coords
        : [pLon != null && pLat != null ? [pLon, pLat] : null, dLon != null && dLat != null ? [dLon, dLat] : null].filter(Boolean);
    if (all.length > 0) inject(`window.fitAll(${JSON.stringify(all)})`);
  }, [ready, interactive, coords, pLat, pLon, dLat, dLon, inject]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'ready') setReady(true);
      else if (data?.type === 'center' && typeof data.lat === 'number' && typeof data.lon === 'number') {
        center.current = { lat: data.lat, lon: data.lon };
      }
    } catch {}
  };

  const isPickupTarget = activeTarget === 'pickup';

  return (
    <View style={[styles.container, { height }]}>
      <WebView<object>
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
      />

      {interactive && !pinLocked && (
        <>
          <View style={styles.floatingCenterPinContainer} pointerEvents="none">
            <View style={styles.floatingTooltip}>
              <DSText variant="caption" color="#ffffff" style={styles.tooltipText}>
                {isPickupTarget ? 'Geser peta untuk titik jemput' : 'Geser peta untuk titik tujuan'}
              </DSText>
            </View>
            <View
              style={[styles.pinIconCircle, isPickupTarget ? styles.pinPickup : styles.pinDestination]}>
              <Icon name="location-on" size={24} color="#ffffff" />
            </View>
            <View style={styles.pinShadowDot} />
          </View>
          <View style={styles.confirmWrap} pointerEvents="box-none">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Pilih lokasi ini"
              disabled={confirming}
              activeOpacity={0.85}
              onPress={() => onConfirmLocation?.(center.current.lat, center.current.lon)}
              style={[styles.confirmBtn, isPickupTarget ? styles.pinPickup : styles.pinDestination]}>
              {confirming ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <DSText variant="caption" color="#ffffff" style={styles.confirmText}>
                  Pilih lokasi ini
                </DSText>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {interactive && pinLocked && onUnlock && (
        <View style={styles.confirmWrap} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ubah titik di peta"
            activeOpacity={0.85}
            onPress={onUnlock}
            style={[styles.confirmBtn, styles.unlockBtn]}>
            <Icon name="edit-location" size={16} color="#ffffff" />
            <DSText variant="caption" color="#ffffff" style={styles.confirmText}>
              Ubah titik di peta
            </DSText>
          </TouchableOpacity>
        </View>
      )}

      <LinearGradient
        colors={[Overlay.mapScrim, 'transparent']}
        style={styles.scrim}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: '#edeef1',
  },
  webview: {
    flex: 1,
    backgroundColor: '#edeef1',
  },
  floatingCenterPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 6,
  },
  tooltipText: {
    fontWeight: '700',
    fontSize: 11,
  },
  pinIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  pinPickup: {
    backgroundColor: '#10b981',
  },
  pinDestination: {
    backgroundColor: '#ef4444',
  },
  pinShadowDot: {
    width: 10,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: 3,
  },
  confirmWrap: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: 40,
    alignItems: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 6,
  },
  unlockBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  confirmText: {
    fontWeight: '700',
    fontSize: 13,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Sizes.mapScrim,
  },
});
