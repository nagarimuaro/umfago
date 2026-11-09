import * as Location from 'expo-location';

/**
 * Layanan Geocoding & Autocomplete berbasis OpenStreetMap (Nominatim & Photon).
 * Digunakan untuk pencarian nama jalan, gedung, dan tempat secara real-time di seluruh Indonesia.
 */

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    suburb?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface PhotonSearchResult {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
}

const PHOTON_API_URL = 'https://photon.komoot.io/api';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org';

/**
 * Cari alamat / autocomplete tempat menggunakan OpenStreetMap (Photon + Nominatim fallback).
 */
export async function searchPhotonPlaces(
  query: string,
  lat = -0.9471,
  lon = 100.4172,
  limit = 6
): Promise<PhotonSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1. Coba Nominatim Indonesia terlebih dahulu untuk akurasi nama tempat/jalan lokal
  try {
    const nomUrl = `${NOMINATIM_API_URL}/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=id&limit=${limit}&addressdetails=1&accept-language=id`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'UmfagoApp/1.0' },
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        return nomData.map((item: any, idx: number) => {
          const addr = item.address || {};
          const primaryName =
            item.name ||
            addr.amenity ||
            addr.building ||
            addr.shop ||
            addr.road ||
            addr.village ||
            addr.suburb ||
            (item.display_name ? item.display_name.split(',')[0] : 'Lokasi Peta');
          const subParts = [
            addr.road,
            addr.suburb || addr.village || addr.neighbourhood,
            addr.city_district || addr.municipality || addr.town || addr.city || addr.county,
            addr.state,
          ].filter((part) => Boolean(part) && part !== primaryName);
          const fullAddress =
            subParts.length > 0
              ? subParts.join(', ')
              : item.display_name || primaryName;

          return {
            id: `nom-${item.place_id || idx}-${Date.now()}`,
            label: primaryName,
            address: fullAddress,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        });
      }
    }
  } catch {
    // Lanjut ke Photon fallback
  }

  // 2. Fallback ke Photon Komoot
  try {
    const url = `${PHOTON_API_URL}/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lon}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const features: PhotonFeature[] = data.features || [];

    return features.map((feat, idx) => {
      const p = feat.properties;
      const coords = feat.geometry.coordinates;
      const primaryName = p.name || p.street || 'Lokasi Peta';
      const addressParts = [p.street, p.housenumber, p.district || p.suburb, p.city || p.county, p.state].filter(Boolean);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : primaryName;

      return {
        id: `photon-${p.osm_id || idx}-${Date.now()}`,
        label: primaryName,
        address: fullAddress,
        lat: coords[1],
        lon: coords[0],
      };
    });
  } catch {
    return [];
  }
}

/**
 * Reverse Geocoding: Konversi koordinat [lat, lon] menjadi nama jalan & kota yang akurat di Indonesia.
 */
export async function reversePhotonGeocode(lat: number, lon: number): Promise<string> {
  // 1. Gunakan OpenStreetMap Nominatim (data jalan/kelurahan/kecamatan/kota terlengkap di Indonesia)
  try {
    const nomUrl = `${NOMINATIM_API_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`;
    const res = await fetch(nomUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'UmfagoApp/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data?.address;
      if (addr) {
        const primary =
          data.name ||
          addr.road ||
          addr.pedestrian ||
          addr.amenity ||
          addr.building ||
          addr.shop ||
          addr.Office ||
          '';
        const area =
          addr.suburb ||
          addr.village ||
          addr.neighbourhood ||
          addr.hamlet ||
          addr.city_district ||
          addr.municipality ||
          '';
        const city =
          addr.city ||
          addr.town ||
          addr.county ||
          addr.state_district ||
          addr.state ||
          '';

        const parts = [primary, area, city].filter(
          (val, idx, self) => Boolean(val) && self.indexOf(val) === idx
        );
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      if (data?.display_name) {
        return data.display_name.split(',').slice(0, 3).map((s: string) => s.trim()).join(', ');
      }
    }
  } catch {
    // Lanjut ke fallback Photon
  }

  // 2. Fallback Photon Komoot
  try {
    const url = `${PHOTON_API_URL}/reverse?lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const first: PhotonFeature | undefined = data.features?.[0];
      if (first) {
        const p = first.properties;
        const namePart = p.street || (p.name && !/^\d+$/.test(p.name) ? p.name : '');
        const districtPart = p.district || p.suburb || '';
        const cityPart = p.city || p.county || p.state || '';

        const parts = [namePart, districtPart, cityPart].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch {
    // Lanjut ke native geocoder fallback
  }

  // 3. Fallback Native Geocoder perangkat
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (geo && geo.length > 0) {
      const g = geo[0];
      const parts = [g.street || g.name, g.district || g.subregion, g.city || g.region].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // Ignore
  }

  return `Lokasi GPS (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}
