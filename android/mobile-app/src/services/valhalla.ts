/**
 * Mesin Navigasi & Routing Valhalla (Open-Source OSM Routing Engine).
 * Menghitung rute, jarak riil (kilometer), dan durasi (menit) untuk moda ojek motor dan mobil.
 */

export interface ValhallaRouteResult {
  distanceKm: number;
  durationMinutes: number;
  encodedPolyline?: string;
  coordinates: Array<[number, number]>; // Array koordinat [lon, lat] mengikuti kontur jalan raya
  maneuvers: Array<{
    instruction: string;
    distanceKm: number;
    timeSeconds: number;
  }>;
}

/**
 * Valhalla public demo / self-hosted routing endpoint.
 * Di produksi self-hosted, arahkan ke URL server Valhalla OpenJek sendiri.
 */
const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

/**
 * Hitung rute navigasi dari titik penjemputan ke tujuan.
 * Mengambil rute dengan JARAK TERDEKAT (shortest distance) di jalan raya riil.
 * @param start [lat, lon]
 * @param end [lat, lon]
 * @param costing 'motorcycle' | 'auto' (mobil)
 */
export async function getValhallaRoute(
  start: [number, number],
  end: [number, number],
  costing: 'motorcycle' | 'auto' = 'motorcycle'
): Promise<ValhallaRouteResult> {
  // 1. Prioritas Utama: OSRM Routing Engine (Cari alternatif rute jarak terdekat)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true&continue_straight=true`;
    const oRes = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (oRes.ok) {
      const oData = await oRes.json();
      if (oData.code === 'Ok' && Array.isArray(oData.routes) && oData.routes.length > 0) {
        // Pilih rute dengan jarak TERDEKAT (shortest distance)
        const sorted = oData.routes.sort((a: any, b: any) => a.distance - b.distance);
        const shortest = sorted[0];

        return {
          distanceKm: Math.max(0.2, Math.round((shortest.distance / 1000) * 10) / 10),
          durationMinutes: Math.max(1, Math.round(shortest.duration / 60)),
          coordinates: shortest.geometry.coordinates as Array<[number, number]>,
          maneuvers: [
            {
              instruction: shortest.legs?.[0]?.summary || 'Ikuti jalur terdekat menuju titik tujuan',
              distanceKm: Math.round((shortest.distance / 1000) * 10) / 10,
              timeSeconds: Math.round(shortest.duration),
            },
          ],
        };
      }
    }
  } catch {
    // Lanjut fallback ke Valhalla
  }

  const payload = {
    locations: [
      { lat: start[0], lon: start[1], type: 'break' },
      { lat: end[0], lon: end[1], type: 'break' },
    ],
    costing: costing,
    costing_options: {
      motorcycle: {
        use_highways: 0.2, // Hindari jalan tol untuk motor
      },
      auto: {
        use_tolls: 0.5,
      },
    },
    directions_options: {
      units: 'kilometers',
      language: 'id-ID',
    },
  };

  try {
    const res = await fetch(VALHALLA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Valhalla routing error status ${res.status}`);
    }

    const data = await res.json();
    const trip = data.trip;
    if (!trip || !trip.legs || trip.legs.length === 0) {
      throw new Error('No route found');
    }

    const summary = trip.summary;
    const leg = trip.legs[0];

    const maneuvers = (leg.maneuvers || []).map((m: any) => ({
      instruction: m.instruction || '',
      distanceKm: m.length || 0,
      timeSeconds: m.time || 0,
    }));

    const defaultCoords: Array<[number, number]> = [
      [start[1], start[0]],
      [end[1], end[0]],
    ];
    const roadCoordinates: Array<[number, number]> = leg.shape
      ? decodePolyline6(leg.shape)
      : defaultCoords;

    return {
      distanceKm: Math.round(summary.length * 10) / 10,
      durationMinutes: Math.max(1, Math.round(summary.time / 60)),
      encodedPolyline: leg.shape,
      coordinates: roadCoordinates,
      maneuvers,
    };
  } catch {
    // Fallback Geometris Haversine bila layanan routing offline
    const fallbackDist = haversineDistance(start[0], start[1], end[0], end[1]);
    const estTime = Math.max(2, Math.round((fallbackDist / 30) * 60)); // asumsi rata-rata 30 km/jam
    return {
      distanceKm: Math.max(0.5, Math.round(fallbackDist * 10) / 10),
      durationMinutes: estTime,
      coordinates: [
        [start[1], start[0]],
        [end[1], end[0]],
      ],
      maneuvers: [
        {
          instruction: 'Ikuti jalan menuju titik tujuan penjemputan',
          distanceKm: fallbackDist,
          timeSeconds: estTime * 60,
        },
      ],
    };
  }
}

/**
 * Decode encoded polyline Valhalla/OSRM (precision 6) menjadi array titik koordinat [lon, lat]
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

/** Rumus Haversine fallback untuk jarak lengkung bumi */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // radius bumi dalam km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.25 * 10) / 10; // faktor jalanan darat 1.25x
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
