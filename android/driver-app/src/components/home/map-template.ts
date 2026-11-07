import { DRIVER_ICON_DATA_URI } from '../../constants/driver-asset';
import { LEAFLET_CSS, LEAFLET_JS } from '../../constants/leaflet-bundle';

/**
 * Shared HTML Generator for OpenStreetMap navigation view.
 * Powered by local bundled Leaflet library (zero 3rd-party CDN network dependency).
 * 100% reliable DOM-based rendering, custom driver marker with heading rotation,
 * dark mode raster OSM tiles, and neon route polylines.
 */
export function getDriverMapHtml(initialLat: number, initialLon: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <!-- Local Bundled Leaflet Styles (Zero CDN) -->
  <style>
    ${LEAFLET_CSS}
  </style>

  <!-- Local Bundled Leaflet Script (Zero CDN) -->
  <script>
    ${LEAFLET_JS}
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #121517; }

    #map-viewport {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      background: #121517;
      transition: transform 0.4s ease-out;
    }

    /* 3D Tilted Perspective Mode: Oversized so the perspective keystone NEVER exposes black edges */
    body.tilted #map-viewport {
      perspective: 800px;
    }
    body.tilted #map {
      width: 160%;
      height: 160%;
      left: -30%;
      top: -30%;
      transform: rotateX(22deg);
      transform-origin: 50% 60%;
    }

    /* Stand markers upright on tilted map */
    body.tilted .order-pin,
    body.tilted .surge-badge {
      transform: rotateX(-22deg);
      transform-origin: bottom center;
    }

    // Dark Mode Filter for OpenStreetMap Raster Tiles
    body.night-mode #map { background: #1a1e22; }
    body.night-mode .maplibregl-canvas-container canvas,
    body.night-mode .leaflet-tile-pane {
      filter: brightness(0.68) invert(1) contrast(1.3) hue-rotate(200deg) saturate(0.35);
    }
    .leaflet-marker-pane .driver-marker {
      z-index: 999999 !important;
    }
    .driver-marker {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 999999 !important;
      pointer-events: none;
    }
    .driver-pulse {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(200, 255, 0, 0.28);
      border: 2px solid #C8FF00;
      animation: pulse 2.2s infinite ease-out;
      pointer-events: none;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.95; }
      100% { transform: scale(1.85); opacity: 0; }
    }
    .driver-pin {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 999999 !important;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.85));
      transition: transform 0.12s linear;
      transform-origin: 50% 50%;
    }
    .driver-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }
    .driver-arrow {
      position: absolute;
      top: -7px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 9px solid #C8FF00;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));
    }

    /* Surge Hotspot Area Markers */
    .surge-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    .surge-badge {
      background: rgba(27, 28, 28, 0.95);
      border: 1.5px solid #C8FF00;
      padding: 4px 8px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      white-space: nowrap;
    }
    .surge-badge span {
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .surge-pill {
      background: #C8FF00;
      color: #121212;
      font-size: 10px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 6px;
    }
    .surge-ring {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 2px dashed rgba(200, 255, 0, 0.65);
      background: rgba(200, 255, 0, 0.1);
      margin-top: -18px;
      pointer-events: none;
      animation: surgePulse 2.8s infinite ease-in-out;
    }
    @keyframes surgePulse {
      0%, 100% { transform: scale(0.95); opacity: 0.6; }
      50% { transform: scale(1.15); opacity: 0.95; }
    }

    /* Active Order Markers */
    .order-pin {
      padding: 5px 10px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 11px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      white-space: nowrap;
    }
    .order-pin-pickup { background: #10B981; border: 2px solid #ffffff; }
    .order-pin-dest { background: #EF4444; border: 2px solid #ffffff; }

    /* Leaflet overrides */
    .leaflet-div-icon { background: transparent !important; border: none !important; }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    .maplibregl-canvas { outline: none; }
  </style>
</head>
<body class="night-mode">
<div id="map-viewport">
  <div id="map"></div>
</div>
<script>
  function sendApp(msg) {
    var data = typeof msg === 'string' ? msg : JSON.stringify(msg);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(data);
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  }

  window.onerror = function(msg, url, line) {
    sendApp({ type: 'LOG_ERROR', message: msg + ' at ' + line });
  };

  // Helper check WebGL support
  function checkWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
      return false;
    }
  }

  var DRIVER_IMG = ${JSON.stringify(DRIVER_ICON_DATA_URI)};
  var currentLat = ${initialLat};
  var currentLon = ${initialLon};
  var engine = 'leaflet';
  var maplibreMap = null;
  var leafletMap = null;

  // Markers & Elements
  var driverMarker = null;
  var pickupMarker = null;
  var destMarker = null;
  var surgeMarkers = [];
  var leafletRouteLine = null;
  var leafletGlowLine = null;

  // Real-time smooth 60 FPS animation loop state
  var curLat = ${initialLat};
  var curLon = ${initialLon};
  var curHeading = 0;
  var targetLat = ${initialLat};
  var targetLon = ${initialLon};
  var targetHeading = 0;
  var isAnimating = false;

  function updateDriverHeading(heading) {
    var pin = document.querySelector('.driver-pin');
    if (pin) {
      var isTilted = document.body.classList.contains('tilted');
      if (isTilted) {
        pin.style.transform = 'rotateX(-22deg) rotateZ(' + heading + 'deg)';
      } else {
        pin.style.transform = 'rotate(' + heading + 'deg)';
      }
    }
  }

  // Physical Device Compass Orientation Listener
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function(e) {
      var compass = null;
      if (typeof e.webkitCompassHeading !== 'undefined' && e.webkitCompassHeading !== null) {
        compass = e.webkitCompassHeading;
      } else if (e.alpha !== null && typeof e.alpha !== 'undefined') {
        compass = (360 - e.alpha) % 360;
      }
      if (compass !== null && !isNaN(compass)) {
        targetHeading = compass;
        updateDriverHeading(compass);
      }
    }, true);
  }

  var lastCameraPan = 0;
  function startSmoothLoop() {
    if (isAnimating) return;
    isAnimating = true;

    function frame() {
      var step = 0.15;
      var dLat = targetLat - curLat;
      var dLon = targetLon - curLon;
      var dHeading = (targetHeading - curHeading + 540) % 360 - 180;

      if (Math.abs(dLat) > 0.0000001 || Math.abs(dLon) > 0.0000001) {
        curLat += dLat * step;
        curLon += dLon * step;

        // 60 FPS silky smooth marker glide
        if (driverMarker) {
          driverMarker.setLatLng([curLat, curLon]);
        }

        // Smooth camera follow without thrashing tile network requests
        var now = Date.now();
        if (leafletMap && now - lastCameraPan > 250) {
          lastCameraPan = now;
          leafletMap.panTo([curLat, curLon], { animate: true, duration: 0.35, easeLinearity: 0.25 });
        }
      }

      if (Math.abs(dHeading) > 0.05) {
        curHeading = (curHeading + dHeading * 0.2 + 360) % 360;
        updateDriverHeading(curHeading);
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function buildDriverHtml() {
    return '<div class="driver-pulse"></div>' +
      '<div class="driver-pin">' +
        '<div class="driver-arrow"></div>' +
        '<img src="' + DRIVER_IMG + '" class="driver-img" alt="Motor" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'block\\';" />' +
        '<span style="display:none;font-size:28px;">🏍️</span>' +
      '</div>';
  }

  // Attempt MapLibre GL initialization if WebGL supported, else fallback to Leaflet
  var webglOk = checkWebGL();
  if (webglOk && typeof maplibregl !== 'undefined') {
    try {
      initMapLibre();
      engine = 'maplibre';
    } catch(err) {
      console.warn('MapLibre WebGL failed, falling back to Leaflet:', err);
      initLeaflet();
      engine = 'leaflet';
    }
  } else {
    initLeaflet();
    engine = 'leaflet';
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MapLibre GL Engine
  // ─────────────────────────────────────────────────────────────
  function initMapLibre() {
    maplibreMap = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ]
          }
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }
        ]
      },
      center: [currentLon, currentLat],
      zoom: 16,
      pitch: 0,
      attributionControl: false
    });

    var driverEl = document.createElement('div');
    driverEl.className = 'driver-marker';
    driverEl.innerHTML = buildDriverHtml();
    driverMarker = new maplibregl.Marker({ element: driverEl, rotationAlignment: 'map' })
      .setLngLat([currentLon, currentLat])
      .addTo(maplibreMap);

    var pickupEl = document.createElement('div');
    pickupEl.className = 'order-pin order-pin-pickup';
    pickupEl.innerText = '📍 Jemput';
    pickupMarker = new maplibregl.Marker({ element: pickupEl });

    var destEl = document.createElement('div');
    destEl.className = 'order-pin order-pin-dest';
    destEl.innerText = '🏁 Tujuan';
    destMarker = new maplibregl.Marker({ element: destEl });

    maplibreMap.on('load', function() {
      maplibreMap.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
      maplibreMap.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#C8FF00', 'line-width': 10, 'line-opacity': 0.35 }
      });
      maplibreMap.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#C8FF00', 'line-width': 5, 'line-opacity': 0.95 }
      });

      sendApp({ type: 'ready', engine: 'maplibre' });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Leaflet DOM Engine (WebGL Fallback - 100% Reliable)
  // ─────────────────────────────────────────────────────────────
  var tileLayer = null;

  function initLeaflet() {
    leafletMap = L.map('map', { zoomControl: false, attributionControl: false }).setView([currentLat, currentLon], 16.5);
    
    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      keepBuffer: 16,
      updateInterval: 100,
      updateWhenIdle: false,
      updateWhenZooming: false
    }).addTo(leafletMap);

    var driverIcon = L.divIcon({
      className: 'driver-marker',
      html: buildDriverHtml(),
      iconSize: [56, 56],
      iconAnchor: [28, 28]
    });
    driverMarker = L.marker([currentLat, currentLon], { icon: driverIcon, zIndexOffset: 999999 }).addTo(leafletMap);

    var pickupIcon = L.divIcon({
      className: 'leaflet-order-pickup',
      html: '<div class="order-pin order-pin-pickup">📍 Jemput</div>',
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    });
    pickupMarker = L.marker([currentLat, currentLon], { icon: pickupIcon });

    var destIcon = L.divIcon({
      className: 'leaflet-order-dest',
      html: '<div class="order-pin order-pin-dest">🏁 Tujuan</div>',
      iconSize: [80, 30],
      iconAnchor: [40, 15]
    });
    destMarker = L.marker([currentLat, currentLon], { icon: destIcon });

    leafletGlowLine = L.polyline([], { color: '#C8FF00', weight: 10, opacity: 0.35 }).addTo(leafletMap);
    leafletRouteLine = L.polyline([], { color: '#C8FF00', weight: 5, opacity: 0.95 }).addTo(leafletMap);

    setTimeout(function() {
      sendApp({ type: 'ready', engine: 'leaflet' });
    }, 100);
  }

  // ─────────────────────────────────────────────────────────────
  // Unified State & Action Handlers
  // ─────────────────────────────────────────────────────────────
  window.updateState = function(state) {
    if (!state) return;

    // 1. Update Driver Position & Realtime Smooth Glide
    if (state.driver) {
      targetLat = state.driver.lat;
      targetLon = state.driver.lon;
      if (typeof state.driver.heading === 'number') {
        targetHeading = state.driver.heading;
      }

      startSmoothLoop();

      var pulse = document.querySelector('.driver-pulse');
      if (pulse) pulse.style.display = state.isOnline ? 'block' : 'none';

      // Saat perjalanan (jemput atau antar), kamera selalu miring 3D dan pass dekat di atas motor
      if (state.order && (state.order.step === 'heading_to_pickup' || state.order.step === 'in_trip')) {
        document.body.classList.add('tilted');
        if (leafletMap && leafletMap.getZoom() < 17) {
          leafletMap.setZoom(17.5);
        }
      } else if (!state.order) {
        document.body.classList.remove('tilted');
      }
      updateDriverHeading(curHeading);
    }

    // 2. Update Active Order Markers & Route
    if (state.order) {
      var isHeading = state.order.step === 'heading_to_pickup';
      var isInTrip = state.order.step === 'in_trip';

      if (engine === 'maplibre' && maplibreMap) {
        if (state.order.pickup) {
          pickupMarker.setLngLat([state.order.pickup.lon, state.order.pickup.lat]).addTo(maplibreMap);
        } else {
          pickupMarker.remove();
        }
        if (state.order.dest) {
          destMarker.setLngLat([state.order.dest.lon, state.order.dest.lat]).addTo(maplibreMap);
        } else {
          destMarker.remove();
        }
        if (state.order.route && state.order.route.length > 1) {
          var src = maplibreMap.getSource('route');
          if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: state.order.route } });

          if (isHeading || isInTrip) {
            // Smooth Cockpit 3D navigation follow
            maplibreMap.easeTo({
              center: [state.driver.lon, state.driver.lat],
              zoom: 16.5,
              pitch: 45,
              bearing: state.driver.heading || 0,
              duration: 800
            });
          } else {
            var b = new maplibregl.LngLatBounds();
            state.order.route.forEach(function(c) { b.extend(c); });
            maplibreMap.fitBounds(b, { padding: 60, maxZoom: 16 });
          }
        }
      } else if (engine === 'leaflet' && leafletMap) {
        if (state.order.pickup) {
          pickupMarker.setLatLng([state.order.pickup.lat, state.order.pickup.lon]).addTo(leafletMap);
        } else {
          leafletMap.removeLayer(pickupMarker);
        }
        if (state.order.dest) {
          destMarker.setLatLng([state.order.dest.lat, state.order.dest.lon]).addTo(leafletMap);
        } else {
          leafletMap.removeLayer(destMarker);
        }
        if (state.order.route && state.order.route.length > 1) {
          var latlngs = state.order.route.map(function(c) { return [c[1], c[0]]; });
          leafletGlowLine.setLatLngs(latlngs);
          leafletRouteLine.setLatLngs(latlngs);

          if (isHeading || isInTrip) {
            document.body.classList.add('tilted');
            leafletMap.setView([state.driver.lat, state.driver.lon], 18.5, { animate: true, duration: 0.8 });
          } else {
            document.body.classList.remove('tilted');
            leafletMap.fitBounds(latlngs, { padding: [50, 50] });
          }
        }
      }
    } else {
      if (engine === 'maplibre' && maplibreMap) {
        pickupMarker.remove();
        destMarker.remove();
        var src2 = maplibreMap.getSource('route');
        if (src2) src2.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
      } else if (engine === 'leaflet' && leafletMap) {
        leafletMap.removeLayer(pickupMarker);
        leafletMap.removeLayer(destMarker);
        leafletGlowLine.setLatLngs([]);
        leafletRouteLine.setLatLngs([]);
      }
    }

    // 3. Update Surge Hotspots
    if (state.surges && surgeMarkers.length === 0) {
      state.surges.forEach(function(s) {
        var surgeHtml = '<div class="surge-badge"><span>🔥 ' + s.name.split('&')[0] + '</span><div class="surge-pill">' + s.multiplier + 'x</div></div><div class="surge-ring"></div>';

        if (engine === 'maplibre' && maplibreMap) {
          var el2 = document.createElement('div');
          el2.className = 'surge-marker';
          el2.innerHTML = surgeHtml;
          el2.addEventListener('click', function(e) {
            e.stopPropagation();
            sendApp({ type: 'SURGE_SELECT', id: s.id });
          });
          var m = new maplibregl.Marker({ element: el2 }).setLngLat([s.longitude, s.latitude]).addTo(maplibreMap);
          surgeMarkers.push(m);
        } else if (engine === 'leaflet' && leafletMap) {
          var sIcon = L.divIcon({
            className: 'surge-marker',
            html: surgeHtml,
            iconSize: [120, 40],
            iconAnchor: [60, 56]
          });
          var lm = L.marker([s.latitude, s.longitude], { icon: sIcon, zIndexOffset: 100 }).addTo(leafletMap);
          lm.on('click', function() {
            sendApp({ type: 'SURGE_SELECT', id: s.id });
          });
          surgeMarkers.push(lm);
        }
      });
    }
  };

  window.recenter = function(lon, lat) {
    if (engine === 'maplibre' && maplibreMap) {
      maplibreMap.easeTo({ center: [lon, lat], zoom: 16 });
    } else if (engine === 'leaflet' && leafletMap) {
      leafletMap.setView([lat, lon], 16.5, { animate: true });
    }
  };

  window.togglePerspective = function(lon, lat, heading) {
    if (engine === 'maplibre' && maplibreMap) {
      var is3D = maplibreMap.getPitch() > 20;
      if (is3D) {
        maplibreMap.easeTo({ pitch: 0, bearing: 0, zoom: 15.5 });
      } else {
        maplibreMap.easeTo({ pitch: 55, bearing: heading || 45, center: [lon, lat], zoom: 18.5 });
      }
    } else if (engine === 'leaflet' && leafletMap) {
      var isTilted = document.body.classList.contains('tilted');
      if (isTilted) {
        document.body.classList.remove('tilted');
        setTimeout(function() { leafletMap.invalidateSize(); }, 250);
        leafletMap.setView([lat, lon], 16, { animate: true });
      } else {
        document.body.classList.add('tilted');
        setTimeout(function() { leafletMap.invalidateSize(); }, 250);
        leafletMap.setView([lat, lon], 17.5, { animate: true });
      }
      updateDriverHeading(curHeading);
    }
  };

  window.zoomIn = function() {
    if (engine === 'maplibre' && maplibreMap) maplibreMap.zoomIn();
    else if (engine === 'leaflet' && leafletMap) leafletMap.zoomIn();
  };

  window.zoomOut = function() {
    if (engine === 'maplibre' && maplibreMap) maplibreMap.zoomOut();
    else if (engine === 'leaflet' && leafletMap) leafletMap.zoomOut();
  };

  window.toggleNightMode = function(enabled) {
    if (enabled) {
      document.body.classList.add('night-mode');
    } else {
      document.body.classList.remove('night-mode');
    }
  };

  window.addEventListener('message', function(e) {
    try {
      var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data && data.type === 'UPDATE_STATE') {
        window.updateState(data.state);
      } else if (data && data.type === 'RECENTER') {
        window.recenter(data.lon, data.lat);
      } else if (data && data.type === 'PERSPECTIVE') {
        window.togglePerspective(data.lon, data.lat, data.heading);
      } else if (data && data.type === 'TOGGLE_NIGHT') {
        window.toggleNightMode(data.enabled);
      } else if (data && data.type === 'ZOOM_IN') {
        window.zoomIn();
      } else if (data && data.type === 'ZOOM_OUT') {
        window.zoomOut();
      }
    } catch(err) {}
  });
</script>
</body>
</html>`;
}
