import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  xp: number;
  streak: number;
  lastPracticeDate?: string;
  currentCourseId?: string;
  role: 'user' | 'admin';
  completedLessons: string[];
}

interface AuthState {
  profile: UserProfile | null;
  isAuthReady: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setAuthReady: (isReady: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isAuthReady: false,
  setProfile: (profile) => set({ profile }),
  setAuthReady: (isReady) => set({ isAuthReady: isReady }),
}));
