import { DRIVER_ICON_DATA_URI } from '../../constants/driver-asset';

/**
 * Shared HTML Generator for MapLibre GL JS OpenStreetMap view.
 * Aligned with mobile-app's MapLibreOSMView and tailored for Driver Cockpit needs.
 */
export function getDriverMapHtml(initialLat: number, initialLon: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #e5e7eb; }

    /* Optional Driver Night Mode Filter for OSM Raster Tiles */
    body.night-mode #map { background: #121517; }
    body.night-mode .maplibregl-canvas-container canvas {
      filter: brightness(0.68) invert(1) contrast(1.3) hue-rotate(200deg) saturate(0.35);
    }
    
    /* Driver Vehicle Marker */
    .driver-marker {
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .driver-pulse {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(200, 255, 0, 0.25);
      border: 1.5px solid #C8FF00;
      animation: pulse 2.2s infinite ease-out;
      pointer-events: none;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.9); opacity: 0; }
    }
    .driver-pin {
      width: 46px;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
      transition: transform 0.25s ease-out;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
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
      top: -6px;
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 8px solid #C8FF00;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.6));
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

    .maplibregl-canvas { outline: none; }
  </style>
</head>
<body class="night-mode">
<div id="map"></div>
<script>
  function sendApp(msg) {
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(data);
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  }

  // MapLibre GL with OpenStreetMap raster tiles (identical to mobile-app, no API key required)
  const map = new maplibregl.Map({
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
    center: [${initialLon}, ${initialLat}],
    zoom: 16,
    pitch: 0,
    attributionControl: false
  });

  // Driver Marker Element with custom motorcycle vehicle icon
  const driverEl = document.createElement('div');
  driverEl.className = 'driver-marker';
  driverEl.innerHTML = '<div class="driver-pulse"></div><div class="driver-pin"><div class="driver-arrow"></div><img src="' + ${JSON.stringify(DRIVER_ICON_DATA_URI)} + '" class="driver-img" alt="Driver" /></div>';
  const driverMarker = new maplibregl.Marker({ element: driverEl, rotationAlignment: 'map' })
    .setLngLat([${initialLon}, ${initialLat}])
    .addTo(map);

  // Markers A & B for Order
  const pickupEl = document.createElement('div');
  pickupEl.className = 'order-pin order-pin-pickup';
  pickupEl.innerText = '📍 Jemput';
  const pickupMarker = new maplibregl.Marker({ element: pickupEl });

  const destEl = document.createElement('div');
  destEl.className = 'order-pin order-pin-dest';
  destEl.innerText = '🏁 Tujuan';
  const destMarker = new maplibregl.Marker({ element: destEl });

  let surgeMarkers = [];
  const emptyGeoJSON = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };

  map.on('load', () => {
    map.addSource('route', { type: 'geojson', data: emptyGeoJSON });
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#C8FF00', 'line-width': 10, 'line-opacity': 0.35 }
    });
    map.addLayer({
      id: 'route-main',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#C8FF00', 'line-width': 5, 'line-opacity': 0.95 }
    });

    sendApp({ type: 'ready' });
  });

  window.updateState = function(state) {
    if (!state) return;
    
    // Update Driver Position & Orientation
    if (state.driver) {
      driverMarker.setLngLat([state.driver.lon, state.driver.lat]);
      const pulse = driverEl.querySelector('.driver-pulse');
      if (pulse) pulse.style.display = state.isOnline ? 'block' : 'none';
      if (typeof state.driver.heading === 'number') {
        const pin = driverEl.querySelector('.driver-pin');
        if (pin) pin.style.transform = 'rotate(' + state.driver.heading + 'deg)';
      }
    }

    // Update Active Order Markers & Route
    if (state.order) {
      if (state.order.pickup) {
        pickupMarker.setLngLat([state.order.pickup.lon, state.order.pickup.lat]).addTo(map);
      } else {
        pickupMarker.remove();
      }
      if (state.order.dest) {
        destMarker.setLngLat([state.order.dest.lon, state.order.dest.lat]).addTo(map);
      } else {
        destMarker.remove();
      }
      if (state.order.route && state.order.route.length > 1) {
        const src = map.getSource('route');
        if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: state.order.route } });
        if (state.order.step === 'in_trip' || state.order.step === 'heading_to_pickup') {
          // Cockpit 3D navigation view: ikuti posisi driver secara real-time saat jemput maupun antar
          map.easeTo({
            center: [state.driver.lon, state.driver.lat],
            zoom: 16.5,
            pitch: 45,
            bearing: state.driver.heading || 0,
            duration: 800
          });
        } else {
          const b = new maplibregl.LngLatBounds();
          state.order.route.forEach(c => b.extend(c));
          map.fitBounds(b, { padding: 60, maxZoom: 16 });
        }
      }
    } else {
      pickupMarker.remove();
      destMarker.remove();
      const src = map.getSource('route');
      if (src) src.setData(emptyGeoJSON);
    }

    // Update Surge Hotspots
    if (state.surges && surgeMarkers.length === 0) {
      state.surges.forEach(function(s) {
        const el = document.createElement('div');
        el.className = 'surge-marker';
        el.innerHTML = '<div class="surge-badge"><span>🔥 ' + s.name.split('&')[0] + '</span><div class="surge-pill">' + s.multiplier + 'x</div></div><div class="surge-ring"></div>';
        el.addEventListener('click', function(e) {
          e.stopPropagation();
          sendApp({ type: 'SURGE_SELECT', id: s.id });
        });
        const m = new maplibregl.Marker({ element: el }).setLngLat([s.longitude, s.latitude]).addTo(map);
        surgeMarkers.push(m);
      });
    }
  };

  window.recenter = function(lon, lat) {
    map.easeTo({ center: [lon, lat], zoom: 16 });
  };

  window.togglePerspective = function(lon, lat, heading) {
    const is3D = map.getPitch() > 20;
    if (is3D) {
      map.easeTo({ pitch: 0, bearing: 0, zoom: 15.5 });
    } else {
      map.easeTo({ pitch: 55, bearing: heading || 45, center: [lon, lat], zoom: 17 });
    }
  };

  window.zoomIn = function() { map.zoomIn(); };
  window.zoomOut = function() { map.zoomOut(); };

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
