import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Lock, BellRing } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;

      try {
        if (!profile.currentCourseId) {
          const coursesSnap = await getDocs(collection(db, 'courses'));
          setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Fetch units for current course
          const unitsQ = query(collection(db, 'units'), orderBy('order'));
          const unitsSnap = await getDocs(unitsQ);
          const courseUnits = unitsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((u: any) => u.courseId === profile.currentCourseId);
          setUnits(courseUnits);

          // Fetch lessons
          const lessonsQ = query(collection(db, 'lessons'), orderBy('order'));
          const lessonsSnap = await getDocs(lessonsQ);
          setLessons(lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch progress
          const progSnap = await getDocs(collection(db, 'userProgress'));
          const userProg = progSnap.docs.find(d => d.id === profile.uid || d.data().userId === profile.uid);
          if (userProg) {
            setProgress(userProg.data());
          } else {
            setProgress({ completedLessons: [] });
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
    await updateDoc(doc(db, 'users', profile.uid), {
      currentCourseId: courseId
    });
  };

  if (loading) return <div>Loading...</div>;

  if (!profile?.currentCourseId) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-slate-700 mb-8">Select your FUOYE Program</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => selectCourse(course.id)}
              className="flex items-center gap-4 p-6 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-blue-400 transition-all text-left shadow-[0_4px_0_rgb(226,232,240)] hover:shadow-[0_2px_0_rgb(226,232,240)] hover:translate-y-[2px]"
            >
              <div className="text-4xl">{course.icon || '🌍'}</div>
              <div>
                <h2 className="font-bold text-xl text-slate-700">{course.title}</h2>
                <p className="text-slate-500">{course.language}</p>
              </div>
            </button>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full text-slate-500">No courses available yet.</div>
          )}
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const practicedToday = profile.lastPracticeDate?.startsWith(today);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border-2 border-slate-200">
        <div className="flex items-center gap-2 text-orange-500 font-bold">
          <Star className="w-6 h-6 fill-current" />
          <span>{profile.streak} Day Streak</span>
        </div>
        <div className="flex items-center gap-2 text-blue-500 font-bold">
          <span>{profile.xp} XP</span>
        </div>
      </div>

      {!practicedToday && (
        <div className="mb-8 bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex items-center gap-4 text-blue-700">
          <BellRing className="w-8 h-8 text-blue-500 animate-bounce" />
          <div>
            <h3 className="font-bold text-lg">Time to practice!</h3>
            <p className="opacity-90">Complete a lesson today to keep your streak alive.</p>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {units.map((unit, i) => {
          const unitLessons = lessons.filter(l => l.unitId === unit.id);
          return (
            <div key={unit.id} className="relative">
              <div className="bg-green-500 text-white p-6 rounded-2xl mb-8 shadow-[0_4px_0_rgb(21,128,61)]">
                <h2 className="text-2xl font-bold mb-2">Unit {i + 1}: {unit.title}</h2>
                <p className="opacity-90">{unit.description}</p>
              </div>
              
              <div className="flex flex-col items-center gap-8 py-4">
                {unitLessons.map((lesson, index) => {
                  const isCompleted = progress?.completedLessons?.includes(lesson.id);
                  // Determine if unlocked (first lesson or previous is completed)
                  const prevLesson = index > 0 ? unitLessons[index - 1] : null;
                  const isUnlocked = isCompleted || !prevLesson || progress?.completedLessons?.includes(prevLesson.id);
                  
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
                        className={`w-20 h-20 rounded-full flex items-center justify-center border-b-8 transition-all ${
                          isCompleted 
                            ? 'bg-yellow-400 border-yellow-500 text-white' 
                            : isUnlocked 
                              ? 'bg-green-500 border-green-600 text-white hover:bg-green-400 hover:translate-y-1 hover:border-b-4' 
                              : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-10 h-10" /> : isUnlocked ? <Star className="w-10 h-10" /> : <Lock className="w-8 h-8" />}
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap font-bold text-slate-500 text-sm">
                        {lesson.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {units.length === 0 && (
          <div className="text-center text-slate-500">No units available for this course yet.</div>
        )}
      </div>
    </div>
  );
}
