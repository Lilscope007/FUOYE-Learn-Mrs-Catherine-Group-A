import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setAuthReady } = useAuthStore();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check if user profile exists, if not create it
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            xp: 0,
            streak: 0,
            role: 'user' as const,
          };
          await setDoc(userRef, newProfile);
        }

        // Listen to profile changes
        const unsubscribeProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as any);
          }
        });

        setAuthReady(true);
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, [setUser, setProfile, setAuthReady]);

  return <>{children}</>;
}
