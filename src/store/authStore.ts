import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  // Set during OTP verify — token + user available for onboarding API calls
  // but root navigator stays on AuthStack until completeOnboarding() is called
  setPendingAuth: (token: string, user: User) => void;
  // Called at the very end of onboarding (BotCapabilities "Done" or BotChoice own-bot "Continue")
  // Flips isAuthenticated → true, causing RootNavigator to swap to MainTabs
  completeOnboarding: () => void;
  // Used by RootNavigator bootstrap (token already validated, onboarding already done)
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setPendingAuth: (token, user) =>
    set({ token, user, isAuthenticated: false }),

  completeOnboarding: () =>
    set({ isAuthenticated: true }),

  setAuth: (token, user) =>
    set({ token, user, isAuthenticated: true }),

  setUser: (user) =>
    set({ user }),

  logout: () =>
    set({ token: null, user: null, isAuthenticated: false }),
}));
