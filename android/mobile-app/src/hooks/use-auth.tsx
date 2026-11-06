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

// Simpanan memori sementara agar sesi tetap bertahan saat Fast Refresh
const g = globalThis as any;
if (!g.__OJ_STORAGE) g.__OJ_STORAGE = {};

const Storage = {
  getItem: async (key: string): Promise<string | null> => {
    return g.__OJ_STORAGE[key] || null;
  },
  setItem: async (key: string, val: string): Promise<void> => {
    g.__OJ_STORAGE[key] = val;
  },
  removeItem: async (key: string): Promise<void> => {
    delete g.__OJ_STORAGE[key];
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await Storage.getItem('@openjek_token');
        const savedRefreshToken = await Storage.getItem('@openjek_refresh_token');
        const savedUser = await Storage.getItem('@openjek_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          tokenRef.current = savedToken;
          setUser(JSON.parse(savedUser));

          // Verifikasi ke database backend apakah token masih sah
          try {
            const res = await fetch(`${BACKEND_BASE_URL}/api/user`, {
              headers: { Authorization: `Bearer ${savedToken}` },
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
              // Access token kedaluwarsa, coba segarkan secara otomatis via refresh_token
              if (savedRefreshToken) {
                const refRes = await fetch(`${BACKEND_BASE_URL}/api/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refresh_token: savedRefreshToken }),
                });
                if (refRes.ok) {
                  const refData = await refRes.json();
                  const newAccess = refData.access_token;
                  const newRefresh = refData.refresh_token;
                  setToken(newAccess);
                  tokenRef.current = newAccess;
                  await Storage.setItem('@openjek_token', newAccess);
                  if (newRefresh) {
                    await Storage.setItem('@openjek_refresh_token', newRefresh);
                  }
                  return;
                }
              }
              // Jika refresh token juga hangus/tidak ada, bersihkan sesi
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
    try {
      const savedRefreshToken = await Storage.getItem('@openjek_refresh_token');
      if (!savedRefreshToken) return null;
      const res = await fetch(`${BACKEND_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: savedRefreshToken }),
      });
      if (res.ok) {
        const refData = await res.json();
        const newAccess = refData.access_token;
        const newRefresh = refData.refresh_token;
        setToken(newAccess);
        tokenRef.current = newAccess;
        await Storage.setItem('@openjek_token', newAccess);
        if (newRefresh) {
          await Storage.setItem('@openjek_refresh_token', newRefresh);
        }
        return newAccess;
      }
    } catch {
      // Abaikan error jaringan
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const activeToken = tokenRef.current;
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
      const res = await fetch(`${BACKEND_BASE_URL}/api/login`, {
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

      setToken(accessToken);
      tokenRef.current = accessToken;
      setUser(userData);
      await Storage.setItem('@openjek_token', accessToken);
      if (refreshToken) {
        await Storage.setItem('@openjek_refresh_token', refreshToken);
      }
      await Storage.setItem('@openjek_user', JSON.stringify(userData));
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
