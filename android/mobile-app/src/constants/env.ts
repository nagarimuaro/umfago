import { Platform } from 'react-native';

/**
 * Global Environment Configuration for UmfaGo Mobile App.
 *
 * Seluruh URL API, WebSocket, nama aplikasi, dan konfigurasi lingkungan
 * diambil dari file .env (dengan prefiks EXPO_PUBLIC_).
 */

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const rawWsUrl = process.env.EXPO_PUBLIC_WS_URL?.trim();

function resolveApiUrl(): string {
  if (rawApiUrl) {
    // Pada emulator Android, localhost mengarah ke perangkat emulator itu sendiri,
    // sedangkan host mesin pengembangan diakses lewat 10.0.2.2.
    if (
      Platform.OS === 'android' &&
      (rawApiUrl.includes('localhost') || rawApiUrl.includes('127.0.0.1'))
    ) {
      return rawApiUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return rawApiUrl;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

function resolveWsUrl(apiUrl: string): string {
  if (rawWsUrl) {
    if (
      Platform.OS === 'android' &&
      (rawWsUrl.includes('localhost') || rawWsUrl.includes('127.0.0.1'))
    ) {
      return rawWsUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return rawWsUrl;
  }
  const wsProto = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `${wsProto}//${host}/ws`;
}

const API_URL = resolveApiUrl();
const WS_URL = resolveWsUrl(API_URL);
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'UmfaGo';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';

export const ENV = {
  API_URL,
  WS_URL,
  APP_NAME,
  APP_ENV,
  IS_DEV: APP_ENV === 'development',
  IS_PROD: APP_ENV === 'production',
} as const;

export default ENV;

