/**
 * Layanan Geocoding & Autocomplete berbasis Photon (Komoot / OpenStreetMap).
 * Digunakan untuk pencarian nama jalan, gedung, dan tempat secara open-source.
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

/**
 * Cari alamat / autocomplete tempat menggunakan Photon OSM.
 * Prioritas geografis diarahkan ke Indonesia (default pusat Sumatera Barat / Padang).
 */
export async function searchPhotonPlaces(
  query: string,
  lat = -0.9471,
  lon = 100.4172,
  limit = 6
): Promise<PhotonSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

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
      const addressParts = [p.street, p.housenumber, p.city, p.state, p.country].filter(Boolean);
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
 * Reverse Geocoding: Konversi koordinat [lat, lon] menjadi nama alamat manusiawi
 * Format: Nama Jalan/Tempat, Kecamatan/Kelurahan, Kabupaten/Kota (tanpa mencantumkan angka koordinat).
 */
export async function reversePhotonGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (!res.ok) return 'Lokasi Terpilih di Peta';

    const data = await res.json();
    const first: PhotonFeature | undefined = data.features?.[0];
    if (!first) return 'Lokasi Terpilih di Peta';

    const p = first.properties;
    const namePart = p.name || p.street || '';
    const districtPart = p.district || p.suburb || '';
    const cityPart = p.city || p.county || p.state || '';

    const parts = [namePart, districtPart, cityPart].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
    return p.state || p.country || 'Lokasi Terpilih di Peta';
  } catch {
    return 'Lokasi Terpilih di Peta';
  }
}
