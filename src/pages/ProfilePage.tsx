import { useAuthStore } from '../store/authStore';
import { User, Star, Zap, Award, BookOpen } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, user } = useAuthStore();
  const navigate = useNavigate();

  if (!profile) return null;

  const handleChangeCourse = async () => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', profile.uid), {
      currentCourseId: null
    });
    navigate('/app');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-6 mb-8 border-b-2 border-slate-200 pb-8">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-200" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
            <User className="w-12 h-12" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-700">{profile.displayName || 'Learner'}</h1>
          <p className="text-slate-500">{profile.email}</p>
          <p className="text-sm text-slate-400 mt-1">Joined {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'recently'}</p>
        </div>
        <button 
          onClick={handleChangeCourse}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          Change Course
        </button>
      </div>

      <h2 className="text-2xl font-bold text-slate-700 mb-6">Statistics</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border-2 border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <Star className="w-10 h-10 text-orange-500 fill-current" />
          <div>
            <div className="text-2xl font-bold text-slate-700">{profile.streak}</div>
            <div className="text-slate-500 font-medium">Day Streak</div>
          </div>
        </div>
        <div className="border-2 border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <Zap className="w-10 h-10 text-yellow-400 fill-current" />
          <div>
            <div className="text-2xl font-bold text-slate-700">{profile.xp}</div>
            <div className="text-slate-500 font-medium">Total XP</div>
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
