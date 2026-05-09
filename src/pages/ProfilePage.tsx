import { useAuthStore } from '../store/authStore';
import { User, Star, Zap, Award, BookOpen, Heart, Diamond } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore();
  const navigate = useNavigate();

  if (!profile) return null;

  const handleChangeCourse = async () => {
    if (!profile) return;
    try {
      await fetch('/api/user/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: null })
      });
      setProfile({ ...profile, currentCourseId: undefined });
      navigate('/app');
    } catch (e) {
      console.error(e);
    }
  };

  const level = Math.floor(profile.xp / 100) + 1;
  const xpForNextLevel = level * 100;
  const progressPercent = ((profile.xp % 100) / 100) * 100;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-3xl">
              {profile.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10" title="Current Level">
            {level}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{profile.displayName || 'Learner'}</h1>
          <p className="text-slate-500 font-medium">{profile.email}</p>
          <div className="mt-3 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 w-full max-w-xs">
            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-semibold">{profile.xp} / {xpForNextLevel} XP to Level {level + 1}</p>
        </div>
        <button 
          onClick={handleChangeCourse}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          Change Program
        </button>
      </div>

      <button 
        onClick={handleChangeCourse}
        className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 mb-8 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
      >
        <BookOpen className="w-5 h-5" />
        Change Program
      </button>

      <h2 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">Statistics</h2>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
          <Star className="w-10 h-10 text-orange-500 fill-current" />
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{profile.streak}</div>
            <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Day Streak</div>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
          <Zap className="w-10 h-10 text-blue-500 fill-current" />
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{profile.xp}</div>
            <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Total XP</div>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
          <Heart className="w-10 h-10 text-rose-500 fill-current" />
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{profile.hearts ?? 5} <span className="text-sm text-slate-400">/ 5</span></div>
            <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Hearts</div>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-5 flex items-center gap-4">
          <Diamond className="w-10 h-10 text-sky-400 fill-current" />
          <div>
            <div className="text-2xl font-extrabold text-slate-800">{profile.gems ?? 500}</div>
            <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Gems</div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-700 mb-6">Achievements</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`border-2 rounded-2xl p-4 flex flex-col items-center text-center ${profile.xp >= 100 ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 opacity-50'}`}>
          <Award className={`w-12 h-12 mb-2 ${profile.xp >= 100 ? 'text-yellow-500' : 'text-slate-400'}`} />
          <div className="font-bold text-slate-700">Beginner</div>
          <div className="text-sm text-slate-500">Earn 100 XP</div>
        </div>
        <div className={`border-2 rounded-2xl p-4 flex flex-col items-center text-center ${profile.xp >= 500 ? 'border-blue-400 bg-blue-50' : 'border-slate-200 opacity-50'}`}>
          <Award className={`w-12 h-12 mb-2 ${profile.xp >= 500 ? 'text-blue-500' : 'text-slate-400'}`} />
          <div className="font-bold text-slate-700">Scholar</div>
          <div className="text-sm text-slate-500">Earn 500 XP</div>
        </div>
        <div className={`border-2 rounded-2xl p-4 flex flex-col items-center text-center ${profile.streak >= 7 ? 'border-orange-400 bg-orange-50' : 'border-slate-200 opacity-50'}`}>
          <Award className={`w-12 h-12 mb-2 ${profile.streak >= 7 ? 'text-orange-500' : 'text-slate-400'}`} />
          <div className="font-bold text-slate-700">Committed</div>
          <div className="text-sm text-slate-500">7 Day Streak</div>
        </div>
      </div>
    </div>
  );
}
