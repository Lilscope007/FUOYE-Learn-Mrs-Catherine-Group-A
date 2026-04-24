import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Trophy, Medal, Flame } from 'lucide-react';

export default function LeaderboardPage() {
  const { profile } = useAuthStore();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setLeaders(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-8 text-center bg-gradient-to-b from-yellow-50 to-white p-8 rounded-3xl border border-yellow-100 shadow-sm">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Leaderboard</h1>
        <p className="text-slate-500 mt-2 font-medium">Top students in FUOYE by XP</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {leaders.map((student, index) => {
          const isCurrentUser = profile?.id === student.id;
          return (
            <div 
              key={student.id} 
              className={`flex items-center gap-4 p-5 md:p-6 border-b border-slate-100 last:border-0 transition-colors ${
                isCurrentUser ? 'bg-yellow-50/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-slate-400 w-8 text-center text-lg">
                {index === 0 ? <Medal className="w-8 h-8 text-yellow-400 block mx-auto" /> : 
                 index === 1 ? <Medal className="w-8 h-8 text-slate-300 block mx-auto" /> : 
                 index === 2 ? <Medal className="w-8 h-8 text-amber-600 block mx-auto" /> : 
                 index + 1}
              </div>
              
              <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                {student.photoURL ? (
                  <img src={student.photoURL} alt={student.displayName} className="w-full h-full object-cover" />
                ) : (
                  student.displayName?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-lg truncate">
                  {student.displayName || 'Unknown Student'}
                </div>
                {isCurrentUser && <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">You</div>}
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="font-bold text-slate-800 text-lg">{student.xp} XP</div>
                {student.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500 font-semibold text-sm">
                    <Flame className="w-4 h-4 fill-current" />
                    {student.streak}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {leaders.length === 0 && (
          <div className="p-8 text-center text-slate-500 font-medium">No students on the leaderboard yet.</div>
        )}
      </div>
    </div>
  );
}
