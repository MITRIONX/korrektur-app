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
        set({ token, user: JSON.parse(userJson) });
      } else if (token) {
        // Token without user data - clear it
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // SecureStore not available or key not found - stay logged out
    }
  },
}));
