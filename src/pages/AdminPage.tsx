import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { profile } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  
  const [newCourse, setNewCourse] = useState({ title: '', language: '', icon: '', description: '' });
  const [newUnit, setNewUnit] = useState({ courseId: '', title: '', description: '', order: 1 });
  const [newLesson, setNewLesson] = useState({ unitId: '', title: '', topic: '', order: 1, xpReward: 10 });

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    const cSnap = await getDocs(collection(db, 'courses'));
    setCourses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    
    const uSnap = await getDocs(query(collection(db, 'units'), orderBy('order')));
    setUnits(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  if (profile?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'courses'), newCourse);
    setNewCourse({ title: '', language: '', icon: '', description: '' });
    fetchData();
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'units'), newUnit);
    setNewUnit({ courseId: '', title: '', description: '', order: newUnit.order + 1 });
    fetchData();
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'lessons'), newLesson);
    setNewLesson({ ...newLesson, title: '', topic: '', order: newLesson.order + 1 });
    alert('Lesson added!');
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will add all FUOYE courses. Continue?')) return;
    
    try {
      const batch = writeBatch(db);
      
      const fuoyePrograms = [
        { title: 'Computer Science', language: 'Faculty of Science', icon: '💻', description: 'Study of computation, algorithms, and software.' },
        { title: 'Mechanical Engineering', language: 'Faculty of Engineering', icon: '⚙️', description: 'Design, analyze, and manufacture mechanical systems.' },
        { title: 'Accounting', language: 'Faculty of Management Sciences', icon: '📊', description: 'Principles of finance, auditing, and financial reporting.' },
        { title: 'Mass Communication', language: 'Faculty of Social Sciences', icon: '📻', description: 'Journalism, broadcasting, and public relations.' },
        { title: 'Law', language: 'Faculty of Law', icon: '⚖️', description: 'Study of legal systems, rights, and jurisprudence.' },
        { title: 'Medicine and Surgery', language: 'Faculty of Clinical Sciences', icon: '🩺', description: 'Medical practice, diagnosis, and treatment.' },
        { title: 'Nursing Science', language: 'Faculty of Basic Medical Sciences', icon: '⚕️', description: 'Patient care and clinical nursing.' },
        { title: 'Architecture', language: 'Faculty of Environmental Design', icon: '🏛️', description: 'Design and planning of buildings and spaces.' },
        { title: 'Agriculture', language: 'Faculty of Agriculture', icon: '🌾', description: 'Crop production, animal husbandry, and soil science.' },
        { title: 'English and Literary Studies', language: 'Faculty of Arts', icon: '📚', description: 'Study of literature, linguistics, and English language.' },
        { title: 'Theatre Arts', language: 'Faculty of Arts', icon: '🎭', description: 'Performing arts, drama, and stage production.' },
        { title: 'Civil Engineering', language: 'Faculty of Engineering', icon: '🏗️', description: 'Infrastructure design and construction.' },
        { title: 'Electrical/Electronics Engineering', language: 'Faculty of Engineering', icon: '🔌', description: 'Study of electrical systems and electronics.' },
        { title: 'Mechatronics Engineering', language: 'Faculty of Engineering', icon: '🤖', description: 'Integration of mechanical and electronic systems.' },
        { title: 'Business Administration', language: 'Faculty of Management Sciences', icon: '💼', description: 'Business management and organizational strategy.' },
        { title: 'Public Administration', language: 'Faculty of Management Sciences', icon: '🏢', description: 'Government policy and public sector management.' },
        { title: 'Economics', language: 'Faculty of Social Sciences', icon: '📈', description: 'Study of production, consumption, and wealth transfer.' },
        { title: 'Political Science', language: 'Faculty of Social Sciences', icon: '🗳️', description: 'Systems of governance and political behavior.' },
        { title: 'Sociology', language: 'Faculty of Social Sciences', icon: '👥', description: 'Study of society, social institutions, and relationships.' },
        { title: 'Psychology', language: 'Faculty of Social Sciences', icon: '🧠', description: 'Scientific study of the mind and behavior.' },
        { title: 'Microbiology', language: 'Faculty of Science', icon: '🔬', description: 'Study of microscopic organisms.' },
        { title: 'Biochemistry', language: 'Faculty of Science', icon: '🧬', description: 'Chemical processes within living organisms.' },
        { title: 'Geophysics', language: 'Faculty of Science', icon: '🌍', description: 'Physics of the Earth and its environment.' },
        { title: 'Pharmacy', language: 'Faculty of Pharmacy', icon: '💊', description: 'Preparation and dispensing of medicinal drugs.' },
        { title: 'Library and Information Science', language: 'Faculty of Education', icon: '📖', description: 'Information management and library operations.' }
      ];

      let cscCourseRef = null;

      for (const prog of fuoyePrograms) {
        const courseRef = doc(collection(db, 'courses'));
        batch.set(courseRef, prog);
        if (prog.title === 'Computer Science') {
          cscCourseRef = courseRef;
        }
      }

      // Add sample units and lessons for Computer Science
      if (cscCourseRef) {
        const unit1Ref = doc(collection(db, 'units'));
        batch.set(unit1Ref, {
          courseId: cscCourseRef.id,
          title: '100 Level - First Semester',
          description: 'Foundation courses for Computer Science.',
          order: 1
        });

        const l1Ref = doc(collection(db, 'lessons'));
        batch.set(l1Ref, {
          unitId: unit1Ref.id,
          title: 'CSC 101 - Intro to Computing',
          topic: 'History of computers, hardware vs software, basic binary',
          order: 1,
          xpReward: 15
        });

        const l2Ref = doc(collection(db, 'lessons'));
        batch.set(l2Ref, {
          unitId: unit1Ref.id,
          title: 'MTH 101 - Elementary Mathematics I',
          topic: 'Set theory, functions, quadratic equations',
          order: 2,
          xpReward: 15
        });

        const l3Ref = doc(collection(db, 'lessons'));
        batch.set(l3Ref, {
          unitId: unit1Ref.id,
          title: 'GST 101 - Use of English',
          topic: 'Grammar, comprehension, and academic writing',
          order: 3,
          xpReward: 10
        });
      }

      await batch.commit();
      alert('FUOYE courses seeded successfully!');
      fetchData();
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-700">Admin Panel</h1>
        <button onClick={handleSeedData} className="bg-green-500 text-white font-bold py-2 px-4 rounded-xl">
          Seed Sample Data
        </button>
      </div>
      
      <section className="bg-white p-6 rounded-2xl border-2 border-slate-200">
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Add Course</h2>
        <form onSubmit={handleAddCourse} className="space-y-4">
          <input type="text" placeholder="Title (e.g. Computer Science)" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="text" placeholder="Faculty (e.g. Faculty of Science)" value={newCourse.language} onChange={e => setNewCourse({...newCourse, language: e.target.value})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="text" placeholder="Icon (emoji)" value={newCourse.icon} onChange={e => setNewCourse({...newCourse, icon: e.target.value})} className="w-full p-3 border-2 rounded-xl" />
          <textarea placeholder="Description" value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} className="w-full p-3 border-2 rounded-xl" />
          <button type="submit" className="bg-blue-500 text-white font-bold py-3 px-6 rounded-xl">Add Course</button>
        </form>
      </section>

      <section className="bg-white p-6 rounded-2xl border-2 border-slate-200">
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Add Unit</h2>
        <form onSubmit={handleAddUnit} className="space-y-4">
          <select value={newUnit.courseId} onChange={e => setNewUnit({...newUnit, courseId: e.target.value})} className="w-full p-3 border-2 rounded-xl" required>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <input type="text" placeholder="Unit Title" value={newUnit.title} onChange={e => setNewUnit({...newUnit, title: e.target.value})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="number" placeholder="Order" value={newUnit.order} onChange={e => setNewUnit({...newUnit, order: parseInt(e.target.value)})} className="w-full p-3 border-2 rounded-xl" required />
          <textarea placeholder="Description" value={newUnit.description} onChange={e => setNewUnit({...newUnit, description: e.target.value})} className="w-full p-3 border-2 rounded-xl" />
          <button type="submit" className="bg-blue-500 text-white font-bold py-3 px-6 rounded-xl">Add Unit</button>
        </form>
      </section>

      <section className="bg-white p-6 rounded-2xl border-2 border-slate-200">
        <h2 className="text-2xl font-bold text-slate-700 mb-4">Add Lesson</h2>
        <form onSubmit={handleAddLesson} className="space-y-4">
          <select value={newLesson.unitId} onChange={e => setNewLesson({...newLesson, unitId: e.target.value})} className="w-full p-3 border-2 rounded-xl" required>
            <option value="">Select Unit</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.title} (Course: {courses.find(c => c.id === u.courseId)?.title})</option>)}
          </select>
          <input type="text" placeholder="Lesson Title (e.g. Basic Greetings)" value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="text" placeholder="Topic (used for AI generation)" value={newLesson.topic} onChange={e => setNewLesson({...newLesson, topic: e.target.value})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="number" placeholder="Order" value={newLesson.order} onChange={e => setNewLesson({...newLesson, order: parseInt(e.target.value)})} className="w-full p-3 border-2 rounded-xl" required />
          <input type="number" placeholder="XP Reward" value={newLesson.xpReward} onChange={e => setNewLesson({...newLesson, xpReward: parseInt(e.target.value)})} className="w-full p-3 border-2 rounded-xl" required />
          <button type="submit" className="bg-blue-500 text-white font-bold py-3 px-6 rounded-xl">Add Lesson</button>
        </form>
      </section>
    </div>
  );
}

