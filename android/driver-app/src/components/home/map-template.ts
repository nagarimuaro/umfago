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
    html, body { width: 100%; height: 100%; overflow: hidden; background: #e5e7eb; }
    body.night-mode { background: #4e5446; }

    #map-viewport {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: #e5e7eb;
      perspective: 1000px;
    }
    body.night-mode #map-viewport {
      background: #4e5446;
    }

    #map {
      position: absolute;
      width: 460%;
      height: 460%;
      left: -180%;
      top: -165%;
      background: #e5e7eb;
      transform-origin: 50% 50%;
      will-change: transform;
    }

    /* Stand markers upright on tilted map */
    body.tilted .order-pin {
      transform-origin: bottom center;
    }

    /* Night Mode Filter for ArcGIS World Street Map */
    body.night-mode #map { background: #4e5446; }
    body.night-mode .leaflet-tile-pane {
      filter: brightness(0.68) invert(1) contrast(1.3) hue-rotate(200deg) saturate(0.35);
    }
    .leaflet-marker-pane .driver-marker {
      z-index: 999999 !important;
    }
    .driver-marker {
      width: 78px;
      height: 78px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 999999 !important;
      pointer-events: none;
    }
    .driver-pulse {
      position: absolute;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: rgba(200, 255, 0, 0.28);
      border: 2.5px solid #C8FF00;
      animation: pulse 2.2s infinite ease-out;
      pointer-events: none;
    }
    @keyframes pulse {
      0% { transform: scale(0.65); opacity: 0.95; }
      100% { transform: scale(1.75); opacity: 0; }
    }
    .driver-pin {
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 999999 !important;
      filter: drop-shadow(0 6px 14px rgba(0,0,0,0.9));
      transition: transform 0.08s linear;
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
      top: -9px;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 12px solid #C8FF00;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.85));
    }

    /* Surge Demand Heatmap Zones */
    .surge-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .surge-ring {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(255, 59, 48, 0.55) 0%,
        rgba(255, 149, 0, 0.36) 36%,
        rgba(200, 255, 0, 0.18) 68%,
        rgba(200, 255, 0, 0) 100%
      );
      filter: blur(6px);
      pointer-events: none;
      animation: surgePulse 3s infinite ease-in-out;
    }
    @keyframes surgePulse {
      0%, 100% { transform: scale(0.92); opacity: 0.75; }
      50% { transform: scale(1.12); opacity: 1; }
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
  var isNavigating = false;
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
    if (!leafletRouteLine || currentRoadPoints.length === 0) return;

    // Prune road points that are behind the vehicle or within 10 meters
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
    leafletRouteLine.setLatLngs(displayPts);
    if (leafletGlowLine) {
      leafletGlowLine.setLatLngs(displayPts);
    }
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
    var driverPin = document.querySelector('.driver-pin');
    var isTilted = document.body.classList.contains('tilted');
    var tiltDeg = isTilted ? 22 : 0;

    if (isNavigating) {
      // 1. Heading-Up Mode: Map rotates by -heading so the route and road always go straight UP
      if (mapEl) {
        if (tiltDeg > 0) {
          mapEl.style.transform = 'rotateX(' + tiltDeg + 'deg) rotate(' + (-heading) + 'deg)';
        } else {
          mapEl.style.transform = 'rotate(' + (-heading) + 'deg)';
        }
      }

      // 2. Driver Icon: Points STRAIGHT UP (0deg relative to user's phone screen)
      // Since mapEl has rotate(-heading), driverPin must rotate +heading so net screen angle is 0deg (UP)
      if (driverPin) {
        if (tiltDeg > 0) {
          driverPin.style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
        } else {
          driverPin.style.transform = 'rotate(' + heading + 'deg)';
        }
      }

      // 3. Counter-rotate pins so their labels stay horizontal and readable
      var orderPins = document.querySelectorAll('.order-pin');
      for (var i = 0; i < orderPins.length; i++) {
        if (tiltDeg > 0) {
          orderPins[i].style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
        } else {
          orderPins[i].style.transform = 'rotate(' + heading + 'deg)';
        }
      }
    } else {
      // Mode: Idle / Compass Mode
      // 1. Map is North-Up
      if (mapEl) {
        if (tiltDeg > 0) {
          mapEl.style.transform = 'rotateX(' + tiltDeg + 'deg)';
        } else {
          mapEl.style.transform = 'none';
        }
      }

      // 2. Driver Icon rotates like a physical compass needle (points to heading)
      if (driverPin) {
        if (tiltDeg > 0) {
          driverPin.style.transform = 'rotateX(-' + tiltDeg + 'deg) rotateZ(' + heading + 'deg)';
        } else {
          driverPin.style.transform = 'rotate(' + heading + 'deg)';
        }
      }

      // 3. Upright badges
      var pins = document.querySelectorAll('.order-pin');
      for (var j = 0; j < pins.length; j++) {
        if (tiltDeg > 0) {
          pins[j].style.transform = 'rotateX(-' + tiltDeg + 'deg)';
        } else {
          pins[j].style.transform = 'none';
        }
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
        if (!isNavigating) {
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
        // Snap immediately if position jumped more than ~500m (e.g. GPS fix or order location)
        if (Math.hypot(dLat, dLon) > 0.005) {
          curLat = targetLat;
          curLon = targetLon;
        } else {
          // Continuous 60 FPS interpolation (~16 ms per frame)
          curLat += dLat * 0.22;
          curLon += dLon * 0.22;
        }

        if (driverMarker) {
          driverMarker.setLatLng([curLat, curLon]);
        }
        if (leafletMap) {
          // Instantaneous 60 FPS pan with NO CSS transition overhead or interruption
          leafletMap.panTo([curLat, curLon], { animate: false });
        }

        // Keep route line snapped forward along the road
        if (isNavigating) {
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
    leafletMap = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      maxZoom: 20
    }).setView([currentLat, currentLon], 17.5);
    
    tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 18,
      maxZoom: 20,
      keepBuffer: 16,
      updateInterval: 50,
      updateWhenIdle: false,
      updateWhenZooming: false
    }).addTo(leafletMap);

    var driverIcon = L.divIcon({
      className: 'driver-marker',
      html: buildDriverHtml(),
      iconSize: [78, 78],
      iconAnchor: [39, 39]
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

    leafletGlowLine = L.polyline([], { color: '#C8FF00', weight: 18, opacity: 0.35 }).addTo(leafletMap);
    leafletRouteLine = L.polyline([], { color: '#C8FF00', weight: 9, opacity: 0.95 }).addTo(leafletMap);

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

      var pulse = document.querySelector('.driver-pulse');
      if (pulse) pulse.style.display = state.isOnline ? 'block' : 'none';

      // Heading-up navigation mode saat perjalanan jemput atau antar
      if (state.order && (state.order.step === 'heading_to_pickup' || state.order.step === 'in_trip')) {
        isNavigating = true;
        document.body.classList.add('tilted');
        document.body.classList.add('navigating');
        if (leafletMap && leafletMap.getZoom() < 18.8) {
          leafletMap.setZoom(19);
        }
      } else {
        isNavigating = false;
        document.body.classList.remove('navigating');
        if (!state.order) {
          document.body.classList.remove('tilted');
        }
      }

      startSmoothLoop();
      updateNavigationOrientation(curHeading);
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
              zoom: 18.5,
              pitch: 55,
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
        if (state.order.route && state.order.route.length > 2) {
          // Rute jalan raya riil lengkap (> 2 titik koordinat jalan)
          var roadLatLngs = state.order.route.map(function(c) { return [c[1], c[0]]; });
          setNavigationRoad(roadLatLngs);
        } else if (state.order.route && state.order.route.length === 2) {
          // Hanya 2 titik ujung penjemputan & tujuan: langsung kalkulasi rute jalan raya via OSRM
          var p0 = state.order.route[0];
          var p1 = state.order.route[1];
          fetchRoadRoute(p0[0], p0[1], p1[0], p1[1]);
        }

        if (isHeading || isInTrip) {
          document.body.classList.add('tilted');
          if (leafletMap && leafletMap.getZoom() < 18.8) {
            leafletMap.setZoom(19);
          }
        }
      }
    } else {
      currentRoadPoints = [];
      lastRouteKey = '';
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

    // 3. Update Surge Hotspots (Pure Heatmap Glow from Backend Merchants & Hotspots)
    if (state.surges && state.surges.length !== surgeMarkers.length) {
      surgeMarkers.forEach(function(oldM) {
        if (engine === 'maplibre' && oldM.remove) oldM.remove();
        else if (engine === 'leaflet' && leafletMap) leafletMap.removeLayer(oldM);
      });
      surgeMarkers = [];
      state.surges.forEach(function(s) {
        var surgeHtml = '<div class="surge-ring"></div>';

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
            iconSize: [160, 160],
            iconAnchor: [80, 80]
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
    targetLat = lat;
    targetLon = lon;
    if (engine === 'maplibre' && maplibreMap) {
      maplibreMap.easeTo({ center: [lon, lat], zoom: 16 });
    } else if (engine === 'leaflet' && leafletMap) {
      leafletMap.panTo([lat, lon], { animate: false });
      updateNavigationOrientation(curHeading);
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
      } else {
        document.body.classList.add('tilted');
      }
      updateNavigationOrientation(curHeading);
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
