import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setAuthReady } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const user = await res.json();
          if (mounted) setProfile(user);
        } else {
          if (mounted) setProfile(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [setProfile, setAuthReady]);

  return <>{children}</>;
}

