import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const { profile, isAuthReady, setProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  if (!isAuthReady) return null;
  if (profile) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // on success, fetch profile
      const res = await fetch('/api/user/me');
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err: any) {
      setError(err.message);
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
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-10 max-w-3xl mx-auto w-full">
        <div className="text-center flex flex-col items-center">
          <GraduationCap className="w-24 h-24 text-green-600 mb-6" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight max-w-2xl px-4">
            Master your courses the fun and effective way!
          </h1>
          <p className="text-slate-500 text-lg max-w-xl">
            Join FUOYE's premier interactive learning platform designed specifically for your academic success.
          </p>
        </div>
        
        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            {isLogin ? 'Student Login' : 'Student Registration'}
          </h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm font-medium mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Student Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@stu.fuoye.edu.ng"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-green-600 focus:ring-1 focus:ring-green-600 focus:outline-none transition-colors bg-slate-50 focus:bg-white"
                required
              />
            </div>
            
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg w-full transition-colors mt-2"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-green-600 text-sm font-semibold hover:text-green-800 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
