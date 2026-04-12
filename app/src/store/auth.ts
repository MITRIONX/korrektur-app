import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: async (token: string, user: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null });
  },

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        // Validate token against API
        const res = await fetch('http://46.225.218.211:3100/api/klassen', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          set({ token, user: JSON.parse(userJson) });
        } else {
          // Token invalid - clear everything
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
        }
      } else {
        // Clean up partial data
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch {
      // Network error or SecureStore issue - clear and start fresh
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch {}
    }
  },
}));
