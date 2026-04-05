import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthReady } = useAuthStore();

  if (!isAuthReady) return null;
  if (user) return <Navigate to="/app" replace />;

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col">
      <header className="flex items-center justify-between p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 text-green-600 font-bold text-2xl tracking-tight">
          <GraduationCap className="w-8 h-8" />
          FUOYE Learn
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto">
        <GraduationCap className="w-48 h-48 text-green-600 mb-8 animate-bounce" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-700 mb-6 tracking-tight">
          Master your FUOYE courses the fun and effective way!
        </h1>
        <button
          onClick={handleLogin}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-2xl text-xl w-full md:w-auto shadow-[0_4px_0_rgb(22,163,74)] hover:shadow-[0_2px_0_rgb(22,163,74)] hover:translate-y-[2px] transition-all"
        >
          Get Started
        </button>
        <button
          onClick={handleLogin}
          className="mt-4 bg-white hover:bg-slate-50 text-blue-500 font-bold py-4 px-12 rounded-2xl text-xl w-full md:w-auto border-2 border-slate-200 shadow-[0_4px_0_rgb(226,232,240)] hover:shadow-[0_2px_0_rgb(226,232,240)] hover:translate-y-[2px] transition-all uppercase tracking-wider"
        >
          I already have an account
        </button>
      </main>
    </div>
  );
}
