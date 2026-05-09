import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Lock, BellRing, ChevronDown, Heart, Diamond } from 'lucide-react';

export default function Dashboard() {
  const { profile, setProfile } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;

      try {
        const cRes = await fetch('/api/courses');
        if (cRes.ok) {
          setCourses(await cRes.json());
        }

        if (profile.currentCourseId) {
          const [uRes, lRes] = await Promise.all([
            fetch('/api/units'),
            fetch('/api/lessons')
          ]);
          
          if (uRes.ok && lRes.ok) {
            const allUnits = await uRes.json();
            const courseUnits = allUnits.filter((u: any) => u.courseId === profile.currentCourseId);
            setUnits(courseUnits);
            setLessons(await lRes.json());
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [profile]);

  const selectCourse = async (courseId: string) => {
    if (!profile) return;
    try {
      await fetch('/api/user/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      setProfile({ ...profile, currentCourseId: courseId });
    } catch (error) {
      console.error('Failed to select course:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile?.currentCourseId) {
    return (
      <div className="max-w-3xl mx-auto text-center pb-20 pt-8">
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <span className="text-5xl">🎓</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">Welcome to FUOYE Learn!</h1>
          <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto">
            Choose your program to start your gamified learning journey. Earn XP, keep up your streak, and top the leaderboard!
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => selectCourse(course.id)}
              className="flex flex-col items-center gap-4 p-8 bg-white border-4 border-slate-200 rounded-3xl hover:bg-green-50 hover:border-green-400 transition-all text-center shadow-[0_8px_0_rgb(226,232,240)] hover:shadow-[0_4px_0_rgb(74,222,128)] hover:translate-y-[4px] group"
            >
              <div className="text-6xl group-hover:scale-110 transition-transform duration-300">{course.icon || '🌍'}</div>
              <div>
                <h2 className="font-extrabold text-2xl text-slate-800 mb-2">{course.title}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">{course.language}</p>
              </div>
              <div className="mt-4 px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-full group-hover:bg-green-500 group-hover:text-white transition-colors">
                Start Learning
              </div>
            </button>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full p-12 text-slate-500 font-medium bg-slate-50 rounded-3xl border-4 border-dashed border-slate-200">
              <span className="text-4xl block mb-4">🚧</span>
              <p className="text-xl font-bold">No programs available yet.</p>
              <p className="mt-2 text-slate-400">Please check back later.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const practicedToday = profile.lastPracticeDate?.startsWith(today);
  const currentCourse = courses.find(c => c.id === profile.currentCourseId);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
        <button 
          onClick={() => setProfile({ ...profile, currentCourseId: null })}
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-colors text-left"
        >
          <span className="text-2xl">{currentCourse?.icon || '🎓'}</span>
          <div className="hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Program</div>
            <div className="font-extrabold text-slate-700 leading-tight">{currentCourse?.title || 'Unknown Program'}</div>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400 ml-1" />
        </button>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-1.5 text-rose-500 font-bold group cursor-pointer" title="Hearts">
            <Heart className="w-5 h-5 md:w-6 md:h-6 fill-current group-hover:animate-pulse" />
            <span className="text-sm md:text-lg">{profile.hearts ?? 5}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400 font-bold group cursor-pointer" title="Gems">
            <Diamond className="w-5 h-5 md:w-6 md:h-6 fill-current group-hover:animate-pulse" />
            <span className="text-sm md:text-lg">{profile.gems ?? 500}</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-500 font-bold group cursor-pointer" title="Day Streak">
            <Star className="w-5 h-5 md:w-6 md:h-6 fill-current group-hover:animate-pulse" />
            <span className="text-sm md:text-lg">{profile.streak}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-blue-500 font-bold group cursor-pointer" title="Total XP">
            <span className="px-3 py-1 bg-blue-50 rounded-lg text-lg">
              {profile.xp} <span className="text-blue-400 text-sm">XP</span>
            </span>
          </div>
        </div>
      </div>

      {!practicedToday && (
        <div className="mb-8 bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl flex items-center gap-4 text-blue-700 shadow-sm">
          <BellRing className="w-8 h-8 text-blue-500 animate-bounce flex-shrink-0" />
          <div>
            <h3 className="font-extrabold text-lg">Time to practice!</h3>
            <p className="font-medium opacity-90 text-sm mt-0.5">Complete a lesson today to keep your streak alive.</p>
          </div>
        </div>
      )}

      <div className="mb-10 bg-white border-2 border-slate-200 shadow-sm rounded-2xl p-6">
        <h2 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
          Daily Quests
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Diamond className="w-10 h-10 text-slate-300" />
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <span className="font-bold text-slate-700">Earn 50 XP</span>
                <span className="text-sm font-bold text-slate-500">
                  {Math.min(profile.xp % 50, 50)} / 50
                </span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full w-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-sky-400 rounded-full transition-all" 
                  style={{ width: `${(Math.min(profile.xp % 50, 50) / 50) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-slate-300" />
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1">
                <span className="font-bold text-slate-700">Complete 3 lessons</span>
                <span className="text-sm font-bold text-slate-500">
                  {Math.min(profile.completedLessons?.length % 3, 3)} / 3
                </span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full w-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all" 
                  style={{ width: `${(Math.min(profile.completedLessons?.length % 3, 3) / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {units.map((unit, i) => {
          const unitLessons = lessons.filter(l => l.unitId === unit.id);
          return (
            <div key={unit.id} className="relative">
              <div className="bg-green-500 text-white p-6 rounded-2xl mb-8 shadow-[0_4px_0_rgb(21,128,61)] border-2 border-green-600">
                <h2 className="text-2xl font-extrabold mb-2 tracking-tight">{unit.title}</h2>
                <p className="font-medium opacity-90">{unit.description}</p>
              </div>
              
              <div className="flex flex-col items-center gap-8 py-4">
                {unitLessons.map((lesson, index) => {
                  const isCompleted = profile?.completedLessons?.includes(lesson.id);
                  // Determine if unlocked (first lesson or previous is completed)
                  const prevLesson = index > 0 ? unitLessons[index - 1] : null;
                  const isUnlocked = isCompleted || !prevLesson || profile?.completedLessons?.includes(prevLesson.id);
                  
                  // Calculate offset for zig-zag pattern
                  const offset = Math.sin(index * 1.5) * 40;

                  return (
                    <div 
                      key={lesson.id} 
                      className="relative"
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      <button
                        onClick={() => isUnlocked && navigate(`/app/lesson/${lesson.id}`)}
                        disabled={!isUnlocked}
                        className={`w-20 h-20 rounded-full flex items-center justify-center border-b-8 transition-all relative ${
                          isCompleted 
                            ? 'bg-yellow-400 border-yellow-500 text-white' 
                            : isUnlocked 
                              ? 'bg-green-500 border-green-600 text-white hover:bg-green-400 hover:translate-y-1 hover:border-b-4' 
                              : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-10 h-10" /> : isUnlocked ? <Star className="w-10 h-10" /> : <Lock className="w-8 h-8" />}
                      </button>
                      
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap">
                        <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                          isCompleted ? 'bg-yellow-100 text-yellow-700' : 
                          isUnlocked ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                        }`}>
                          {lesson.title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {units.length === 0 && (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-medium">
            No units available for this course yet.<br/>
            <span className="text-sm mt-2 block">Check back later or ask an admin to add some.</span>
          </div>
        )}
      </div>
    </div>
  );
}
