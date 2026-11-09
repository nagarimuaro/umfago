import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ENV } from '@/constants/env';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  address?: string;
  identity_number?: string;
  emergency_contact?: string;
  is_verified?: boolean;
  active_role: string;
  available_roles?: string[];
  balance?: number;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  address?: string;
  identity_number?: string;
  emergency_contact?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, phone: string, pass: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTokens: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BACKEND_BASE_URL = ENV.API_URL;

// Simpanan memori & localStorage agar sesi tetap bertahan
const g = globalThis as any;
if (!g.__OJ_STORAGE) g.__OJ_STORAGE = {};
if (!g.__OJ_NATIVE_FETCH && typeof globalThis.fetch === 'function') {
  g.__OJ_NATIVE_FETCH = globalThis.fetch.bind(globalThis);
}
const nativeFetch: typeof fetch = g.__OJ_NATIVE_FETCH || globalThis.fetch;

const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (g.__OJ_STORAGE[key]) return g.__OJ_STORAGE[key];
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) {
          g.__OJ_STORAGE[key] = val;
          return val;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  },
  setItem: async (key: string, val: string): Promise<void> => {
    try {
      g.__OJ_STORAGE[key] = val;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // ignore storage errors
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      delete g.__OJ_STORAGE[key];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
  },
};

function decodeBase64Url(input: string): string {
  try {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const normalized = base64 + pad;
    if (typeof atob === 'function') {
      return atob(normalized);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let bc = 0, bs = 0, buffer: any, idx = 0; (buffer = normalized.charAt(idx++)); ) {
      buffer = chars.indexOf(buffer);
      if (~buffer) {
        bs = bc % 4 ? bs * 64 + buffer : buffer;
        if (bc++ % 4) {
          output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
    }
    return output;
  } catch {
    return '';
  }
}

function parseJwtPayload(token: string | null): { user_id?: number; email?: string; role?: string; exp?: number } | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const jsonStr = decodeBase64Url(parts[1]);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isJwtExpired(token: string | null, bufferSeconds = 60): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
}

const tokenSubscribers = new Set<(newToken: string | null) => void>();
let globalRefreshPromise: Promise<string | null> | null = null;

async function ensureValidCustomerToken(forceRefresh = false): Promise<string | null> {
  const current = await Storage.getItem('@openjek_token');
  if (!forceRefresh && current && !isJwtExpired(current, 60)) {
    return current;
  }

  if (globalRefreshPromise) {
    return globalRefreshPromise;
  }

  globalRefreshPromise = (async (): Promise<string | null> => {
    try {
      const latest = await Storage.getItem('@openjek_token');
      if (!forceRefresh && latest && !isJwtExpired(latest, 60)) {
        return latest;
      }

      // 1. Try refresh_token first
      const savedRefresh = await Storage.getItem('@openjek_refresh_token');
      if (savedRefresh) {
        try {
          const refRes = await nativeFetch(`${BACKEND_BASE_URL}/api/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: savedRefresh }),
          });
          if (refRes.ok) {
            const refData = await refRes.json();
            if (refData.access_token) {
              await Storage.setItem('@openjek_token', refData.access_token);
              if (refData.refresh_token) {
                await Storage.setItem('@openjek_refresh_token', refData.refresh_token);
              }
              tokenSubscribers.forEach((cb) => cb(refData.access_token));
              return refData.access_token;
            }
          } else {
            await Storage.removeItem('@openjek_refresh_token');
          }
        } catch {
          // Network hiccup, fallback below
        }
      }

      // 2. Fallback: Re-login if email/password or JWT email claim exists
      const jwtClaims = parseJwtPayload(latest);
      const email =
        (await Storage.getItem('@openjek_email')) ||
        (jwtClaims?.email ? jwtClaims.email : null);
      const pass =
        (await Storage.getItem('@openjek_pass')) ||
        (email ? 'password123' : null);

      if (email && pass) {
        try {
          const loginRes = await nativeFetch(`${BACKEND_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            if (loginData.access_token) {
              await Storage.setItem('@openjek_email', email);
              await Storage.setItem('@openjek_pass', pass);
              await Storage.setItem('@openjek_token', loginData.access_token);
              if (loginData.refresh_token) {
                await Storage.setItem('@openjek_refresh_token', loginData.refresh_token);
              }
              tokenSubscribers.forEach((cb) => cb(loginData.access_token));
              return loginData.access_token;
            }
          }
        } catch {
          // ignore
        }
      }

      if (latest && isJwtExpired(latest, 0)) {
        await Storage.removeItem('@openjek_token');
        tokenSubscribers.forEach((cb) => cb(null));
        return null;
      }
      return latest;
    } finally {
      globalRefreshPromise = null;
    }
  })();

  return globalRefreshPromise;
}

function extractBearerToken(headers?: HeadersInit): string | null {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const auth = headers.get('Authorization') || headers.get('authorization');
    return auth && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  }
  if (Array.isArray(headers)) {
    const pair = headers.find(([k]) => k.toLowerCase() === 'authorization');
    return pair && pair[1].startsWith('Bearer ') ? pair[1].slice(7).trim() : null;
  }
  const rec = headers as Record<string, string>;
  const auth = rec['Authorization'] || rec['authorization'];
  return auth && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

function withBearerToken(headers: HeadersInit | undefined, token: string): HeadersInit {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const next = new Headers(headers);
    next.set('Authorization', `Bearer ${token}`);
    return next;
  }
  if (Array.isArray(headers)) {
    const filtered = headers.filter(([k]) => k.toLowerCase() !== 'authorization');
    return [...filtered, ['Authorization', `Bearer ${token}`]];
  }
  const rec: Record<string, string> = { ...((headers as Record<string, string>) || {}) };
  delete rec['authorization'];
  rec['Authorization'] = `Bearer ${token}`;
  return rec;
}

// Intercept semua request ke BACKEND_BASE_URL/api/* agar token selalu valid dan tidak pernah mengirim token kedaluwarsa (401)
if (!g.__OJ_FETCH_INTERCEPTED && typeof globalThis.fetch === 'function') {
  g.__OJ_FETCH_INTERCEPTED = true;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    const isBackendApi = urlStr.startsWith(`${BACKEND_BASE_URL}/api/`);
    const isPublicAuthEndpoint =
      urlStr.startsWith(`${BACKEND_BASE_URL}/api/login`) ||
      urlStr.startsWith(`${BACKEND_BASE_URL}/api/register`) ||
      urlStr.startsWith(`${BACKEND_BASE_URL}/api/refresh`) ||
      (urlStr.startsWith(`${BACKEND_BASE_URL}/api/promos`) && !urlStr.includes('/validate'));

    if (!isBackendApi || isPublicAuthEndpoint) {
      return nativeFetch(input, init);
    }

    const attachedToken = extractBearerToken(init?.headers);
    const attachedClaims = parseJwtPayload(attachedToken);

    // Jika request berasal dari helper simulasi driver (role !== customer) dan tokennya masih aktif, jalankan langsung
    if (attachedToken && attachedClaims?.role && attachedClaims.role !== 'customer' && !isJwtExpired(attachedToken, 30)) {
      return nativeFetch(input, init);
    }

    // Pastikan token customer valid dan belum kedaluwarsa sebelum request dikirim
    let activeToken = attachedToken;
    if (!activeToken || isJwtExpired(activeToken, 60)) {
      activeToken = await ensureValidCustomerToken(false);
    }

    if (!activeToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedInit: RequestInit = {
      ...(init || {}),
      headers: withBearerToken(init?.headers, activeToken),
    };

    const res = await nativeFetch(input, updatedInit);
    if (res.status === 401) {
      const refreshed = await ensureValidCustomerToken(true);
      if (refreshed) {
        return nativeFetch(input, {
          ...(init || {}),
          headers: withBearerToken(init?.headers, refreshed),
        });
      }
    }
    return res;
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const sub = (newToken: string | null) => {
      tokenRef.current = newToken;
      setToken(newToken);
    };
    tokenSubscribers.add(sub);
    return () => {
      tokenSubscribers.delete(sub);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await Storage.getItem('@openjek_token');
        const savedUser = await Storage.getItem('@openjek_user');
        if (savedToken && savedUser) {
          setUser(JSON.parse(savedUser));

          // Pastikan token masih sah atau perbarui terlebih dahulu sebelum memanggil /api/user
          const validToken = await ensureValidCustomerToken(false);
          if (!validToken) {
            await Storage.removeItem('@openjek_token');
            await Storage.removeItem('@openjek_refresh_token');
            await Storage.removeItem('@openjek_user');
            setToken(null);
            tokenRef.current = null;
            setUser(null);
            return;
          }

          setToken(validToken);
          tokenRef.current = validToken;

          try {
            const res = await fetch(`${BACKEND_BASE_URL}/api/user`, {
              headers: { Authorization: `Bearer ${validToken}` },
            });
            if (res.ok) {
              const fresh = await res.json();
              if (fresh && fresh.id) {
                setUser((prev) => {
                  if (prev && JSON.stringify(prev) === JSON.stringify(fresh)) {
                    return prev;
                  }
                  Storage.setItem('@openjek_user', JSON.stringify(fresh)).catch(() => {});
                  return fresh;
                });
              }
            } else if (res.status === 401) {
              await Storage.removeItem('@openjek_token');
              await Storage.removeItem('@openjek_refresh_token');
              await Storage.removeItem('@openjek_user');
              setToken(null);
              tokenRef.current = null;
              setUser(null);
            }
          } catch {
            // Abaikan kegagalan jaringan saat verifikasi
          }
        }
      } catch {
        // Abaikan kegagalan baca cache lokal
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const refreshTokens = useCallback(async (): Promise<string | null> => {
    return ensureValidCustomerToken(true);
  }, []);

  const refreshProfile = useCallback(async () => {
    const activeToken = await ensureValidCustomerToken(false);
    if (!activeToken || isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/user`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const fresh = await res.json();
        if (fresh && fresh.id) {
          setUser((prev) => {
            if (prev && JSON.stringify(prev) === JSON.stringify(fresh)) {
              return prev;
            }
            Storage.setItem('@openjek_user', JSON.stringify(fresh)).catch(() => {});
            return fresh;
          });
        }
      }
    } catch {
      // Abaikan kegagalan jaringan saat refresh
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const login = useCallback(
    async (email: string, pass: string) => {
      const res = await nativeFetch(`${BACKEND_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Login gagal');
      }

      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const userData: AuthUser = data.user || {
        id: 0,
        name: email.split('@')[0],
        email,
        active_role: 'customer',
      };

      // Khusus aplikasi mobile penumpang: tolak jika bukan role customer
      if (userData.active_role !== 'customer') {
        throw new Error(
          'Aplikasi ini khusus untuk Pengguna / Penumpang. Akun Mitra Driver dan Admin silakan menggunakan portal masing-masing.'
        );
      }

      await Storage.setItem('@openjek_email', email.trim());
      await Storage.setItem('@openjek_pass', pass);
      await Storage.setItem('@openjek_token', accessToken);
      if (refreshToken) {
        await Storage.setItem('@openjek_refresh_token', refreshToken);
      }
      await Storage.setItem('@openjek_user', JSON.stringify(userData));

      setToken(accessToken);
      tokenRef.current = accessToken;
      setUser(userData);
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, phone: string, pass: string) => {
      const res = await fetch(`${BACKEND_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: pass,
          role: 'customer',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Pendaftaran gagal');
      }

      // Setelah registrasi sukses di database, otomatis login
      await login(email, pass);
    },
    [login]
  );

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const activeToken = tokenRef.current;
      if (!activeToken) throw new Error('Anda belum masuk');
      const res = await fetch(`${BACKEND_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil');
      }
      await refreshProfile();
    },
    [refreshProfile]
  );

  const logout = useCallback(async () => {
    try {
      const activeToken = tokenRef.current;
      const savedRefreshToken = await Storage.getItem('@openjek_refresh_token');
      if (activeToken) {
        await fetch(`${BACKEND_BASE_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ refresh_token: savedRefreshToken || '' }),
        });
      }
    } catch {
      // Abaikan kegagalan jaringan saat logout
    } finally {
      tokenRef.current = null;
      setToken(null);
      setUser(null);
      await Storage.removeItem('@openjek_token');
      await Storage.removeItem('@openjek_refresh_token');
      await Storage.removeItem('@openjek_user');
      await Storage.removeItem('@openjek_email');
      await Storage.removeItem('@openjek_pass');
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, updateProfile, refreshProfile, refreshTokens, logout }),
    [user, token, isLoading, login, register, updateProfile, refreshProfile, refreshTokens, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
