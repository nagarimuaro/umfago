/**
 * Auth session state.
 *
 * The access token lives in memory only; the refresh token lives in the
 * Keychain/Keystore. Putting the refresh token in AsyncStorage would leave a
 * 30-day credential in plain text on disk, and it is the credential that can
 * mint access tokens.
 */

import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';

import type { CurrentUser, LoginResponse, RoleCode } from '../api/types';

const KEYCHAIN_SERVICE = 'openjek.refresh_token';

interface AuthState {
  /** In memory only — never persisted. */
  accessToken: string | null;
  user: CurrentUser | null;
  activeRole: RoleCode | null;
  /** True until the stored session has been checked at startup. */
  restoring: boolean;

  setSessionFromLogin: (response: LoginResponse) => Promise<void>;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  setUser: (user: CurrentUser) => void;
  /** Called after PUT /api/users/active-role: new access token, same refresh token. */
  setActiveRole: (role: RoleCode, accessToken: string) => void;
  getRefreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  finishRestoring: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  activeRole: null,
  restoring: true,

  async setSessionFromLogin(response) {
    await storeRefreshToken(response.refresh_token);
    set({
      accessToken: response.access_token,
      activeRole: response.user.active_role,
    });
  },

  async setTokens({ accessToken, refreshToken }) {
    // The refresh token is written before the access token is published, so a
    // request replayed on the new access token can never outrun the store.
    await storeRefreshToken(refreshToken);
    set({ accessToken });
  },

  setUser(user) {
    set({ user, activeRole: user.active_role });
  },

  setActiveRole(role, accessToken) {
    // The role claim sits inside the access token; keeping the old one would
    // mean the server sees a mode different from the one on screen.
    set({ activeRole: role, accessToken });
  },

  async getRefreshToken() {
    try {
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  async logout() {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(() => undefined);
    set({ accessToken: null, user: null, activeRole: null });
  },

  finishRestoring() {
    if (get().restoring) {
      set({ restoring: false });
    }
  },
}));

async function storeRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh_token', token, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Convenience selectors — these keep components from subscribing to the whole store. */
export const selectIsAuthenticated = (state: AuthState): boolean => state.accessToken !== null;
export const selectActiveRole = (state: AuthState): RoleCode | null => state.activeRole;
