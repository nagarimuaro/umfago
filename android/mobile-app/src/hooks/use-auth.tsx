import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/*
  Android Emulator menggunakan loopback 10.0.2.2 untuk mengakses localhost mesin host.
  Untuk perangkat fisik/iOS simulator, gunakan IP jaringan lokal.
*/
const BACKEND_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

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

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await Storage.getItem('@openjek_token');
        const savedUser = await Storage.getItem('@openjek_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          // Verifikasi ke database backend apakah token masih sah
          fetch(`${BACKEND_BASE_URL}/api/user`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((fresh) => {
              if (fresh && fresh.id) {
                setUser(fresh);
                Storage.setItem('@openjek_user', JSON.stringify(fresh));
              }
            })
            .catch(() => {});
        }
      } catch {
        // Abaikan kegagalan baca cache lokal
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, pass: string) => {
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
    setUser(userData);
    await Storage.setItem('@openjek_token', accessToken);
    await Storage.setItem('@openjek_user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, phone: string, pass: string) => {
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
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fresh = await res.json();
        setUser(fresh);
        await Storage.setItem('@openjek_user', JSON.stringify(fresh));
      }
    } catch {
      // Abaikan kegagalan jaringan saat refresh
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    if (!token) throw new Error('Anda belum masuk');
    const res = await fetch(`${BACKEND_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui profil');
    }
    await refreshProfile();
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${BACKEND_BASE_URL}/api/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Abaikan kegagalan jaringan saat logout
    } finally {
      setToken(null);
      setUser(null);
      await Storage.removeItem('@openjek_token');
      await Storage.removeItem('@openjek_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, updateProfile, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
