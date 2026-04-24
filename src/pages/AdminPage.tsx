import { useState, useEffect } from 'react';
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
    const cRes = await fetch('/api/courses');
    if (cRes.ok) setCourses(await cRes.json());
    
    const uRes = await fetch('/api/units');
    if (uRes.ok) setUnits(await uRes.json());
  };

  if (profile?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });
    setNewCourse({ title: '', language: '', icon: '', description: '' });
    fetchData();
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUnit)
    });
    setNewUnit({ courseId: '', title: '', description: '', order: newUnit.order + 1 });
    fetchData();
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLesson)
    });
    setNewLesson({ ...newLesson, title: '', topic: '', order: newLesson.order + 1 });
    alert('Lesson added!');
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will add all FUOYE courses. Continue?')) return;
    
    try {
      await fetch('/api/seed', { method: 'POST' });
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

