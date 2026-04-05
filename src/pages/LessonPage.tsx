import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { GoogleGenAI, Type } from '@google/genai';
import confetti from 'canvas-confetti';
import { X, Heart, Check, ArrowRight } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Exercise {
  type: 'multiple_choice' | 'translate' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [lives, setLives] = useState(3);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    async function loadLesson() {
      if (!lessonId || !profile?.currentCourseId) return;
      try {
        const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
        if (lessonDoc.exists()) {
          setLesson({ id: lessonDoc.id, ...lessonDoc.data() });
        }
        
        const courseDoc = await getDoc(doc(db, 'courses', profile.currentCourseId));
        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        }
      } catch (error) {
        console.error("Error loading lesson:", error);
      }
    }
    loadLesson();
  }, [lessonId, profile]);

  useEffect(() => {
    async function generateExercises() {
      if (!lesson || !course) return;
      
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Generate 5 academic exercises for a university student studying "${course.title}" at Federal University Oye-Ekiti (FUOYE). 
          The lesson is titled "${lesson.title}" and covers "${lesson.topic}". 
          Include a mix of 'multiple_choice' and 'fill_blank' questions. 
          Do not use 'translate' unless it is specifically a language course. 
          Make the questions rigorous, accurate, and suitable for a university-level learning app.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['multiple_choice', 'translate', 'fill_blank'] },
                  question: { type: Type.STRING, description: "The question or sentence to translate/fill" },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Provide 4 options for multiple_choice and fill_blank. Leave empty for translate." },
                  correctAnswer: { type: Type.STRING, description: "The exact correct answer" },
                  explanation: { type: Type.STRING, description: "Brief explanation of why this is correct" }
                },
                required: ['type', 'question', 'correctAnswer', 'explanation']
              }
            }
          }
        });
        
        const generated = JSON.parse(response.text || '[]');
        setExercises(generated);
      } catch (error) {
        console.error("Error generating exercises:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (lesson && course) {
      generateExercises();
    }
  }, [lesson, course]);

  const handleCheck = () => {
    if (!selectedAnswer) return;
    
    const currentEx = exercises[currentIndex];
    const correct = selectedAnswer.trim().toLowerCase() === currentEx.correctAnswer.toLowerCase();
    
    setIsCorrect(correct);
    setShowExplanation(true);
    
    if (!correct) {
      setLives(prev => prev - 1);
    }
  };

  const handleNext = async () => {
    if (lives <= 0) {
      navigate('/app');
      return;
    }

    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer('');
      setIsCorrect(null);
      setShowExplanation(false);
    } else {
      // Finished lesson
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      if (profile && lessonId) {
        // Update progress
        const progRef = doc(db, 'userProgress', profile.uid);
        const progDoc = await getDoc(progRef);
        if (progDoc.exists()) {
          await updateDoc(progRef, {
            completedLessons: arrayUnion(lessonId)
          });
        } else {
          await setDoc(progRef, {
            userId: profile.uid,
            completedLessons: [lessonId]
          });
        }
        
        // Update XP, streak, and lastPracticeDate
        const today = new Date().toISOString().split('T')[0];
        const lastPractice = profile.lastPracticeDate?.split('T')[0];
        
        let newStreak = profile.streak;
        if (lastPractice !== today) {
          // Check if yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastPractice === yesterdayStr) {
            newStreak += 1;
          } else if (!lastPractice) {
            newStreak = 1;
          } else {
            newStreak = 1; // Reset streak if missed a day
          }
        }

        await updateDoc(doc(db, 'users', profile.uid), {
          xp: profile.xp + (lesson.xpReward || 10),
          streak: newStreak,
          lastPracticeDate: new Date().toISOString()
        });
      }
      
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">AI is crafting your lesson...</p>
      </div>
    );
  }

  if (exercises.length === 0) {
    return <div>Failed to load exercises. Please try again.</div>;
  }

  if (lives <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <Heart className="w-24 h-24 text-slate-300 mb-6" />
        <h1 className="text-3xl font-bold text-slate-700 mb-4">Out of Hearts!</h1>
        <p className="text-slate-500 mb-8">Don't worry, mistakes help you learn. Try again!</p>
        <button 
          onClick={() => navigate('/app')}
          className="bg-green-500 text-white font-bold py-4 px-8 rounded-2xl w-full max-w-sm shadow-[0_4px_0_rgb(34,197,94)]"
        >
          Continue
        </button>
      </div>
    );
  }

  const currentEx = exercises[currentIndex];
  const progressPercent = (currentIndex / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 p-4">
        <button onClick={() => navigate('/app')} className="text-slate-400 hover:text-slate-600">
          <X className="w-8 h-8" />
        </button>
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden">
          <div 
            className="bg-green-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-red-500 font-bold">
          <Heart className="w-6 h-6 fill-current" />
          <span>{lives}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-slate-700 mb-8">
          {currentEx.type === 'translate' ? 'Translate this sentence' : 
           currentEx.type === 'fill_blank' ? 'Fill in the blank' : 
           'Select the correct meaning'}
        </h2>
        
        <div className="text-xl mb-8 font-medium text-slate-800">
          {currentEx.question}
        </div>

        {currentEx.type === 'translate' ? (
          <textarea
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            placeholder="Type in English"
            className="w-full p-4 border-2 border-slate-200 rounded-2xl text-lg focus:border-blue-400 focus:outline-none resize-none h-32"
            disabled={showExplanation}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentEx.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => !showExplanation && setSelectedAnswer(opt)}
                disabled={showExplanation}
                className={`p-4 rounded-2xl border-2 text-lg font-medium transition-all text-left ${
                  selectedAnswer === opt 
                    ? 'border-blue-400 bg-blue-50 text-blue-500' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`p-4 md:p-8 border-t-2 ${
        isCorrect === true ? 'bg-green-100 border-green-200' : 
        isCorrect === false ? 'bg-red-100 border-red-200' : 
        'bg-white border-slate-200'
      }`}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {showExplanation ? (
            <div className="flex-1">
              <div className={`flex items-center gap-2 font-bold text-2xl mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
                {isCorrect ? 'Excellent!' : 'Correct solution:'}
              </div>
              {!isCorrect && <div className="text-red-600 font-medium text-lg mb-2">{currentEx.correctAnswer}</div>}
              <div className={isCorrect ? 'text-green-700' : 'text-red-700'}>{currentEx.explanation}</div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          
          <button
            onClick={showExplanation ? handleNext : handleCheck}
            disabled={!selectedAnswer && !showExplanation}
            className={`w-full sm:w-auto py-4 px-12 rounded-2xl font-bold text-xl transition-all ${
              !selectedAnswer && !showExplanation
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : isCorrect === true
                  ? 'bg-green-500 text-white shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(21,128,61)]'
                  : isCorrect === false
                    ? 'bg-red-500 text-white shadow-[0_4px_0_rgb(185,28,28)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(185,28,28)]'
                    : 'bg-green-500 text-white shadow-[0_4px_0_rgb(34,197,94)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(34,197,94)]'
            }`}
          >
            {showExplanation ? 'Continue' : 'Check'}
          </button>
        </div>
      </footer>
    </div>
  );
}
