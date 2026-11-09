import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { DSText } from '@/components/ds/ds-text';
import { Icon } from '@/components/ds/icon';
import { LEAFLET_CSS, LEAFLET_JS } from '@/constants/leaflet-bundle';
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
  driverCoords?: { lat: number; lon: number } | null;
  driverVehicleType?: 'car' | 'motorcycle';
  customRouteCoords?: [number, number][] | null;
  /** Pemicu eksplisit agar kamera peta langsung mengarah ke koordinat GPS pengguna saat tombol Lokasi Saya ditekan. */
  cameraTarget?: { lat: number; lon: number; ts: number } | null;
  /** Koordinat GPS live pengguna untuk ditampilkan sebagai titik biru pada peta. */
  userGps?: { lat: number; lon: number } | null;
}

const FallbackCenter = { lat: -0.9471, lon: 100.4172 };

/**
 * Peta interaktif OpenStreetMap di dalam WebView.
 * HTML dimuat sekali; marker, rute, dan kamera diperbarui lewat injectJavaScript
 * supaya peta tidak reload setiap koordinat berubah.
 */
export function MapLibreOSMView({
  height = Sizes.mapBackdrop,
  activeTarget = 'destination',
  onConfirmLocation,
  pinLocked = false,
  confirming = false,
  onUnlock,
  driverCoords,
  driverVehicleType = 'motorcycle',
  customRouteCoords,
  cameraTarget,
  userGps,
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
<style>
${LEAFLET_CSS}
* { margin: 0; padding: 0; box-sizing: border-box; }
body, html { width: 100%; height: 100%; overflow: hidden; background: #e5e7eb; }
#map-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #e5e7eb;
}
#map {
  position: absolute;
  width: 120%;
  height: 120%;
  left: -10%;
  top: -10%;
  background: #e5e7eb;
  transform-origin: 50% 50%;
}
body.tilted .mk {
  transform-origin: bottom center;
}
.mk { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center;
  justify-content: center; color: #fff; font-weight: bold; font-size: 11px; }
.mk-a { background: #10b981; } .mk-b { background: #ef4444; }
.mk-gps-wrap {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; position: relative;
}
.mk-gps-pulse {
  position: absolute; width: 34px; height: 34px; border-radius: 50%;
  background: rgba(37, 99, 235, 0.28); animation: gpsPulse 2s infinite ease-out;
}
.mk-gps-dot {
  width: 14px; height: 14px; border-radius: 50%; background: #2563eb;
  border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4); position: relative; z-index: 2;
}
@keyframes gpsPulse {
  0% { transform: scale(0.5); opacity: 0.95; }
  100% { transform: scale(1.7); opacity: 0; }
}
.leaflet-marker-pane .mk-driver { z-index: 999999 !important; }
.mk-driver { width: 58px; height: 58px; border-radius: 50%; background: #1a1a26;
  border: 3.5px solid #c8ff00; box-shadow: 0 6px 20px rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; font-size: 28px;
  transform-origin: 50% 50%; z-index: 999999 !important; }
</style>
<script>
${LEAFLET_JS}
</script>
</head><body>
<div id="map-viewport">
  <div id="map"></div>
</div>
<script>
const map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5, maxZoom: 20 }).setView([${initial.lat}, ${initial.lon}], 16.5);
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  subdomains: 'abc',
  maxNativeZoom: 19,
  maxZoom: 20,
  keepBuffer: 2,
  updateWhenIdle: false,
  updateWhenZooming: false
}).addTo(map);

tileLayer.on('tileerror', function(err) {
  if (err && err.tile && err.coords) {
    if (!err.tile._fallbackStep) {
      err.tile._fallbackStep = 1;
      err.tile.src =
        'https://mt1.google.com/vt/lyrs=m&hl=id&x=' +
        err.coords.x + '&y=' + err.coords.y + '&z=' + err.coords.z;
    } else if (err.tile._fallbackStep === 1) {
      err.tile._fallbackStep = 2;
      err.tile.src =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/' +
        err.coords.z + '/' + err.coords.y + '/' + err.coords.x;
    }
  }
});

const markerUserGps = L.marker([${initial.lat}, ${initial.lon}], {
  icon: L.divIcon({
    className: 'mk-gps',
    html: '<div class="mk-gps-wrap"><div class="mk-gps-pulse"></div><div class="mk-gps-dot"></div></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  }),
  zIndexOffset: 500
});
const markerA = L.marker([${initial.lat}, ${initial.lon}], {
  icon: L.divIcon({ className: 'mk mk-a', html: 'A', iconSize: [26, 26], iconAnchor: [13, 13] })
});
const markerB = L.marker([${initial.lat}, ${initial.lon}], {
  icon: L.divIcon({ className: 'mk mk-b', html: 'B', iconSize: [26, 26], iconAnchor: [13, 13] })
});
const markerDriver = L.marker([${initial.lat}, ${initial.lon}], {
  icon: L.divIcon({ className: 'mk-driver', html: '${driverVehicleType === 'car' ? '🚗' : '🏍️'}', iconSize: [58, 58], iconAnchor: [29, 29] }),
  zIndexOffset: 999999
});
const routeLine = L.polyline([], { color: '#4f6600', weight: 9, opacity: 0.9 }).addTo(map);

var curLat = ${initial.lat};
var curLon = ${initial.lon};
var curHeading = 0;
var targetLat = ${initial.lat};
var targetLon = ${initial.lon};
var targetHeading = 0;
var isAnimating = false;
var isTrackingDriver = false;
var currentRoadPoints = [];
var lastRouteKey = '';

function setNavigationRoad(latlngs) {
  if (!latlngs || latlngs.length === 0) return;
  currentRoadPoints = latlngs.slice();
  updateActiveRouteLine();
}

function isPointBehind(curLat, curLon, headingDeg, ptLat, ptLon) {
  var toRad = Math.PI / 180;
  var hRad = headingDeg * toRad;
  var fLat = Math.cos(hRad);
  var fLon = Math.sin(hRad);
  var dLat = (ptLat - curLat) * 111000;
  var dLon = (ptLon - curLon) * 111000 * Math.cos(curLat * toRad);
  var dot = dLat * fLat + dLon * fLon;
  return dot < -2;
}

function updateActiveRouteLine() {
  if (!routeLine || currentRoadPoints.length === 0) return;

  // Prune points behind vehicle or within 10m
  while (currentRoadPoints.length > 1) {
    var pt = currentRoadPoints[0];
    var d = Math.hypot(pt[0] - curLat, pt[1] - curLon) * 111000;
    if (d < 10 || isPointBehind(curLat, curLon, curHeading, pt[0], pt[1])) {
      currentRoadPoints.shift();
    } else {
      break;
    }
  }

  var displayPts = [[curLat, curLon]].concat(currentRoadPoints);
  routeLine.setLatLngs(displayPts);
}

function fetchRoadRoute(startLon, startLat, endLon, endLat) {
  var key = startLon.toFixed(4) + ',' + startLat.toFixed(4) + '_' + endLon.toFixed(4) + ',' + endLat.toFixed(4);
  if (key === lastRouteKey) return;
  lastRouteKey = key;

  var url = 'https://router.project-osrm.org/route/v1/driving/' + startLon + ',' + startLat + ';' + endLon + ',' + endLat + '?overview=full&geometries=geojson';
  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        var coords = data.routes[0].geometry.coordinates;
        var roadLatLngs = coords.map(function(c) { return [c[1], c[0]]; });
        setNavigationRoad(roadLatLngs);
      }
    })
    .catch(function() {});
}

function updateNavigationOrientation(heading) {
  var mapEl = document.getElementById('map');
  var pin = document.querySelector('.mk-driver');
  var isTilted = document.body.classList.contains('tilted');
  var tiltDeg = isTilted ? 22 : 0;

  if (isTrackingDriver) {
    if (mapEl) {
      if (tiltDeg > 0) {
        mapEl.style.transform = 'rotateX(' + tiltDeg + 'deg) rotate(' + (-heading) + 'deg)';
      } else {
        mapEl.style.transform = 'rotate(' + (-heading) + 'deg)';
      }
    }
    if (pin) {
      // Counter-rotate the vehicle icon by +heading so it points straight UP on the phone screen
      if (tiltDeg > 0) {
        pin.style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
      } else {
        pin.style.transform = 'rotate(' + heading + 'deg)';
      }
    }
    var mks = document.querySelectorAll('.mk');
    for (var i = 0; i < mks.length; i++) {
      if (tiltDeg > 0) {
        mks[i].style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
      } else {
        mks[i].style.transform = 'rotate(' + heading + 'deg)';
      }
    }
  } else {
    if (mapEl) {
      if (tiltDeg > 0) {
        mapEl.style.transform = 'rotateX(' + tiltDeg + 'deg)';
      } else {
        mapEl.style.transform = 'none';
      }
    }
    if (pin) {
      if (tiltDeg > 0) {
        pin.style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
      } else {
        pin.style.transform = 'rotate(' + heading + 'deg)';
      }
    }
    var mks2 = document.querySelectorAll('.mk');
    for (var j = 0; j < mks2.length; j++) {
      if (tiltDeg > 0) {
        mks2[j].style.transform = 'rotateX(-' + tiltDeg + 'deg)';
      } else {
        mks2[j].style.transform = 'none';
      }
    }
  }
}

if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', function(e) {
    var compass = null;
    if (typeof e.webkitCompassHeading !== 'undefined' && e.webkitCompassHeading !== null) {
      compass = e.webkitCompassHeading;
    } else if (e.alpha !== null && typeof e.alpha !== 'undefined') {
      compass = (360 - e.alpha) % 360;
    }
    if (compass !== null && !isNaN(compass)) {
      if (!isTrackingDriver) {
        targetHeading = compass;
        updateNavigationOrientation(compass);
      }
    }
  }, true);
}

function startSmoothLoop() {
  if (isAnimating) return;
  isAnimating = true;

  function frame() {
    var dLat = targetLat - curLat;
    var dLon = targetLon - curLon;
    var dHeading = (targetHeading - curHeading + 540) % 360 - 180;

    var moved = Math.abs(dLat) > 0.00000005 || Math.abs(dLon) > 0.00000005;
    var turned = Math.abs(dHeading) > 0.05;

    if (moved) {
      curLat += dLat * 0.22;
      curLon += dLon * 0.22;

      if (markerDriver) {
        markerDriver.setLatLng([curLat, curLon]);
      }

      if (map) {
        map.panTo([curLat, curLon], { animate: false });
      }

      if (isTrackingDriver) {
        updateActiveRouteLine();
      }
    }

    if (turned) {
      curHeading = (curHeading + dHeading * 0.22 + 360) % 360;
    }

    if (moved || turned) {
      updateNavigationOrientation(curHeading);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

map.on('moveend', () => {
  const c = map.getCenter();
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center', lat: c.lat, lon: c.lng }));
});

window.setState = function (s) {
  if (s.userGps) { markerUserGps.setLatLng([s.userGps[1], s.userGps[0]]).addTo(map); } else { map.removeLayer(markerUserGps); }
  if (s.pickup) { markerA.setLatLng([s.pickup[1], s.pickup[0]]).addTo(map); } else { map.removeLayer(markerA); }
  if (s.dest) { markerB.setLatLng([s.dest[1], s.dest[0]]).addTo(map); } else { map.removeLayer(markerB); }
  if (s.driver) {
    isTrackingDriver = true;
    var prevLat = targetLat;
    var prevLon = targetLon;
    targetLat = s.driver[1];
    targetLon = s.driver[0];

    var dLat = targetLat - prevLat;
    var dLon = targetLon - prevLon;
    if (Math.abs(dLat) > 0.00001 || Math.abs(dLon) > 0.00001) {
      var rad = Math.atan2(dLon, dLat);
      targetHeading = (rad * 180 / Math.PI + 360) % 360;
    }

    startSmoothLoop();
    document.body.classList.add('tilted');
    if (map.getZoom() < 18.8) {
      map.setZoom(19);
    }
    updateNavigationOrientation(curHeading);
  } else {
    isTrackingDriver = false;
    document.body.classList.remove('tilted');
  }
  if (s.route && s.route.length > 2) {
    var roadLatLngs = s.route.map(function(c) { return [c[1], c[0]]; });
    setNavigationRoad(roadLatLngs);
  } else if (s.route && s.route.length === 2) {
    var p0 = s.route[0];
    var p1 = s.route[1];
    fetchRoadRoute(p0[0], p0[1], p1[0], p1[1]);
  } else {
    currentRoadPoints = [];
    lastRouteKey = '';
    routeLine.setLatLngs([]);
  }
};

window.focusDriver = function (lng, lat) {
  isTrackingDriver = true;
  targetLat = lat;
  targetLon = lng;
  startSmoothLoop();
  document.body.classList.add('tilted');
  if (map.getZoom() < 16.5 || map.getZoom() > 17.5) {
    map.setZoom(17);
  }
  updateNavigationOrientation(curHeading);
};

window.focusOn = function (lng, lat) {
  isTrackingDriver = false;
  document.body.classList.remove('tilted');
  var zoomLvl = map.getZoom() < 16 ? 17 : map.getZoom();
  map.setView([lat, lng], zoomLvl, { animate: false });
  const c = map.getCenter();
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center', lat: c.lat, lon: c.lng }));
};

window.fitAll = function (coords) {
  if (!coords || coords.length === 0) return;
  const latlngs = coords.map(function(c) { return [c[1], c[0]]; });
  map.fitBounds(latlngs, { padding: [60, 60], maxZoom: 16 });
};

window.onMapResize = function () {
  map.invalidateSize({ pan: false });
};
window.addEventListener('resize', window.onMapResize);
if (typeof ResizeObserver !== 'undefined') {
  var vpEl = document.getElementById('map-viewport');
  if (vpEl) {
    new ResizeObserver(function () {
      window.onMapResize();
    }).observe(vpEl);
  }
}

setTimeout(function() {
  window.onMapResize();
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
}, 100);
setTimeout(window.onMapResize, 350);
setTimeout(window.onMapResize, 800);
setTimeout(window.onMapResize, 1600);
</script>
</body></html>`,
    [initial, driverVehicleType]
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
    const effectiveRoute = customRouteCoords ?? coords ?? null;
    const state = {
      userGps: userGps ? [userGps.lon, userGps.lat] : null,
      pickup: pLat != null && pLon != null ? [pLon, pLat] : null,
      dest: dLat != null && dLon != null ? [dLon, dLat] : null,
      driver: driverCoords ? [driverCoords.lon, driverCoords.lat] : null,
      route: effectiveRoute,
    };
    inject(`window.setState(${JSON.stringify(state)})`);
  }, [ready, userGps, pLat, pLon, dLat, dLon, coords, customRouteCoords, driverCoords, inject]);

  // Pemicu fokus kamera langsung saat pengguna menekan tombol "Lokasi Saya"
  useEffect(() => {
    if (!ready || !cameraTarget) return;
    center.current = { lat: cameraTarget.lat, lon: cameraTarget.lon };
    inject(`window.focusOn(${cameraTarget.lon}, ${cameraTarget.lat})`);
  }, [ready, cameraTarget, inject]);

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

  // Peta non-interaktif (searching/trip):
  // Jika sedang perjalanan (ada driverCoords), kamera selalu pass tepat di atas motor lokasi driver!
  useEffect(() => {
    if (!ready || interactive) return;

    if (driverCoords) {
      inject(`window.focusDriver(${driverCoords.lon}, ${driverCoords.lat})`);
      return;
    }

    const effectiveRoute = customRouteCoords ?? coords;
    if (effectiveRoute && effectiveRoute.length > 1) {
      inject(`window.fitAll(${JSON.stringify(effectiveRoute)})`);
      return;
    }
    const points: [number, number][] = [];
    if (pLon != null && pLat != null) points.push([pLon, pLat]);
    if (dLon != null && dLat != null) points.push([dLon, dLat]);
    if (points.length > 0) {
      inject(`window.fitAll(${JSON.stringify(points)})`);
    }
  }, [ready, interactive, coords, customRouteCoords, pLat, pLon, dLat, dLon, driverCoords, inject]);

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
        source={{ html, baseUrl: 'https://umfa-core.fazalabs.sbs' }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        onLayout={() => {
          webViewRef.current?.injectJavaScript('window.onMapResize && window.onMapResize(); true;');
        }}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript('window.onMapResize && window.onMapResize(); true;');
        }}
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
