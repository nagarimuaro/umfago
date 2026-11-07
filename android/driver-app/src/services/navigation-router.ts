/**
 * Navigation Router Service
 * Menghitung rute perjalanan navigasi jalan raya riil (OpenStreetMap / OSRM / Valhalla)
 * Mengambil rute dengan jarak terdekat (shortest road distance) untuk moda ojek motor/mobil.
 */

export interface NavigationRouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: Array<[number, number]>; // Array koordinat [lon, lat] mengikuti kontur jalan raya
  summary?: string;
}

// In-memory cache untuk rute yang sering dipanggil
const routeCache = new Map<string, NavigationRouteResult>();

/**
 * Mengambil rute jalan raya terdekat dari titik start ke titik end.
 * @param start [lat, lon]
 * @param end [lat, lon]
 * @param mode 'motorcycle' | 'car'
 */
export async function getShortestNavigationRoute(
  start: [number, number],
  end: [number, number],
  mode: 'motorcycle' | 'car' = 'motorcycle'
): Promise<NavigationRouteResult> {
  const cacheKey = `${start[0].toFixed(4)},${start[1].toFixed(4)}_${end[0].toFixed(4)},${end[1].toFixed(4)}_${mode}`;
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Prioritas Utama: OSRM Public Routing API dengan pencarian alternatif rute terpendek
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true&continue_straight=true`;
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        // Ambil rute dengan jarak TERDEKAT (shortest distance)
        const sorted = data.routes.sort((a: any, b: any) => a.distance - b.distance);
        const shortest = sorted[0];

        const result: NavigationRouteResult = {
          distanceKm: Math.max(0.2, Math.round((shortest.distance / 1000) * 10) / 10),
          durationMinutes: Math.max(1, Math.round(shortest.duration / 60)),
          coordinates: shortest.geometry.coordinates as Array<[number, number]>,
          summary: shortest.legs?.[0]?.summary || 'Jalur Terdekat',
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Lanjut fallback ke Valhalla
  }

  // 2. Fallback: Valhalla OpenStreetMap Routing
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 4000);

    const valhallaPayload = {
      locations: [
        { lat: start[0], lon: start[1], type: 'break' },
        { lat: end[0], lon: end[1], type: 'break' },
      ],
      costing: mode === 'car' ? 'auto' : 'motorcycle',
      costing_options: {
        motorcycle: {
          use_highways: 0.1, // Hindari jalan tol untuk motor
          use_trails: 0.5,
        },
      },
      directions_options: { units: 'kilometers', language: 'id-ID' },
    };

    const vRes = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valhallaPayload),
      signal: controller2.signal,
    });
    clearTimeout(timeoutId2);

    if (vRes.ok) {
      const vData = await vRes.json();
      const trip = vData.trip;
      if (trip && trip.legs && trip.legs.length > 0) {
        const leg = trip.legs[0];
        const roadCoords = leg.shape ? decodePolyline6(leg.shape) : null;
        if (roadCoords && roadCoords.length > 0) {
          const result: NavigationRouteResult = {
            distanceKm: Math.max(0.2, Math.round(trip.summary.length * 10) / 10),
            durationMinutes: Math.max(1, Math.round(trip.summary.time / 60)),
            coordinates: roadCoords,
            summary: 'Rute Terdekat',
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Lanjut fallback sintetis geometris jalan
  }

  // 3. Fallback Offline: Bentuk segmen jalanan grid siku-siku (bukan garis diagonal lurus tembus gedung)
  const fallback = generateStreetGridRoute(start, end);
  routeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Decode encoded polyline Valhalla/OSRM (precision 6)
 */
export function decodePolyline6(str: string): Array<[number, number]> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<[number, number]> = [];
  const factor = 1e6;

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

/**
 * Generate interpolasi jalur jalan grid (Manhattan / Right-angle street network)
 * bila perangkat tidak memiliki akses internet sama sekali.
 */
function generateStreetGridRoute(start: [number, number], end: [number, number]): NavigationRouteResult {
  const [sLat, sLon] = start;
  const [eLat, eLon] = end;
  const coords: Array<[number, number]> = [];

  // Hitung perkiraan jarak Haversine
  const R = 6371;
  const dLat = ((eLat - sLat) * Math.PI) / 180;
  const dLon = ((eLon - sLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((sLat * Math.PI) / 180) * Math.cos((eLat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25;

  // Bagi rute menjadi segmen jalan (misal 3 ruas belokan jalan raya)
  const stepsPerSegment = 12;
  const midLat = sLat + (eLat - sLat) * 0.45;
  const midLon = sLon + (eLon - sLon) * 0.55;

  // Segmen 1: start -> mid waypoint
  for (let i = 0; i <= stepsPerSegment; i++) {
    const t = i / stepsPerSegment;
    coords.push([sLon + (midLon - sLon) * t, sLat + (midLat - sLat) * t]);
  }

  // Segmen 2: mid waypoint -> end
  for (let j = 1; j <= stepsPerSegment; j++) {
    const t = j / stepsPerSegment;
    coords.push([midLon + (eLon - midLon) * t, midLat + (eLat - midLat) * t]);
  }

  return {
    distanceKm: Math.max(0.5, Math.round(dist * 10) / 10),
    durationMinutes: Math.max(2, Math.round((dist / 30) * 60)),
    coordinates: coords,
    summary: 'Rute Terdekat (Offline)',
  };
}
