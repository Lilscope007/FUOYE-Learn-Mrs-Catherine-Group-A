import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  xp: number;
  streak: number;
  lastPracticeDate?: string;
  currentCourseId?: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAuthReady: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setAuthReady: (isReady: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthReady: (isReady) => set({ isAuthReady: isReady }),
}));
