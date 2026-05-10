import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db, { initDb } from './server-db';
import path from 'path';

// Load env vars if using dotenv
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let dbInitialized = false;
async function ensureDbInitialized() {
  if (dbInitialized) return;
  await initDb();
  await seedDatabaseIfNeeded();
  dbInitialized = true;
}

app.use(express.json());
app.use(cookieParser());

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await ensureDbInitialized();
      next();
    } catch (err) {
      console.error("DB Init Error:", err);
      res.status(500).json({ error: "Database Initialization Error", details: String(err) });
    }
  } else {
    next();
  }
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    // Auto-assign admin if email matched
    const role = email === 'lilscope01@gmail.com' ? 'admin' : 'user';
    
    await db.prepare(`
      INSERT INTO users (id, email, password, displayName, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, hashedPassword, email.split('@')[0], role);
    
    await db.prepare('INSERT INTO userProgress (userId, completedLessons) VALUES (?, ?)')
      .run(id, '[]');

    const authToken = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// User routes
app.get('/api/user/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    const progress = await db.prepare('SELECT * FROM userProgress WHERE userId = ?').get(user.id) as any;
    
    if (progress) {
      user.completedLessons = JSON.parse(progress.completedLessons || '[]');
      user.xp = progress.xp || 0;
      user.courseId = progress.courseId;
    } else {
      user.completedLessons = [];
      user.xp = 0;
    }
    
    res.json(user);
  } catch (err: any) {
    console.error("GET /api/user/me error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/user/course', authenticateToken, async (req: any, res) => {
  const { courseId } = req.body;
  await db.prepare('UPDATE users SET currentCourseId = ? WHERE id = ?').run(courseId, req.user.id);
  res.json({ success: true });
});

app.post('/api/user/progress', authenticateToken, async (req: any, res) => {
  try {
    const { lessonId, xpReward, isNewDay, gemsReward, heartsCost } = req.body;
    
    const progress = await db.prepare('SELECT * FROM userProgress WHERE userId = ?').get(req.user.id) as any;
    const completed = progress && progress.completedLessons ? JSON.parse(progress.completedLessons) : [];
    if (lessonId && !completed.includes(lessonId)) {
      completed.push(lessonId);
    }
    
    await db.prepare('UPDATE userProgress SET completedLessons = ? WHERE userId = ?')
      .run(JSON.stringify(completed), req.user.id);

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    let newXp = (user.xp || 0) + (xpReward || 0);
    let newStreak = user.streak || 0;
    let newGems = (user.gems || 0) + (gemsReward || 0);
    let newHearts = Math.max(0, (user.hearts || 5) - (heartsCost || 0));
    
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = user.lastPracticeDate ? user.lastPracticeDate.split('T')[0] : null;

    if (lastPractice !== today && xpReward > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastPractice === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    try {
      await db.prepare('UPDATE users SET xp = ?, streak = ?, lastPracticeDate = ?, gems = ?, hearts = ? WHERE id = ?')
        .run(newXp, newStreak, req.body.xpReward > 0 ? new Date().toISOString() : user.lastPracticeDate, newGems, newHearts, req.user.id);
    } catch (e) {
      await db.prepare('UPDATE users SET xp = ?, streak = ?, lastPracticeDate = ? WHERE id = ?')
        .run(newXp, newStreak, req.body.xpReward > 0 ? new Date().toISOString() : user.lastPracticeDate, req.user.id);
    }

    res.json({ success: true, newHearts });
  } catch (err: any) {
    console.error("POST /api/user/progress error:", err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Data routes
app.get('/api/courses', async (req, res) => {
  const courses = await db.prepare('SELECT * FROM courses').all();
  res.json(courses);
});

app.post('/api/courses', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { title, description, language, icon } = req.body;
  await db.prepare('INSERT INTO courses (id, title, description, language, icon) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, description, language, icon);
  res.json({ id });
});

app.get('/api/units', async (req, res) => {
  const units = await db.prepare('SELECT * FROM units ORDER BY "order" ASC').all();
  res.json(units);
});

app.post('/api/units', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { courseId, title, description, order } = req.body;
  await db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
    .run(id, courseId, title, description, order);
  res.json({ id });
});

app.get('/api/lessons', async (req, res) => {
  const lessons = await db.prepare('SELECT * FROM lessons ORDER BY "order" ASC').all();
  res.json(lessons);
});

app.get('/api/lessons/:id', async (req, res) => {
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  res.json(lesson || null);
});

app.post('/api/lessons', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { unitId, title, topic, order, xpReward } = req.body;
  await db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, unitId, title, topic, order, xpReward);
  res.json({ id });
});

app.get('/api/leaderboard', async (req, res) => {
  const leaders = await db.prepare('SELECT id, displayName, photoURL, xp, streak FROM users ORDER BY xp DESC LIMIT 50').all();
  res.json(leaders);
});

app.post('/api/seed', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const fuoyePrograms = [
    { title: 'Computer Science', language: 'Faculty of Computing', icon: '💻', description: 'Study of computation, algorithms, and software.' },
    { title: 'Mechanical Engineering', language: 'Faculty of Engineering', icon: '⚙️', description: 'Design, analyze, and manufacture mechanical systems.' },
    { title: 'Accounting', language: 'Faculty of Management Sciences', icon: '📊', description: 'Principles of finance, auditing, and financial reporting.' },
    { title: 'Law', language: 'Faculty of Law', icon: '⚖️', description: 'Study of legal systems, rights, and jurisprudence.' },
    { title: 'Medicine and Surgery', language: 'Faculty of Clinical Sciences', icon: '🩺', description: 'Medical practice, diagnosis, and treatment.' },
  ];

  let cscCourseId = '';
  
  const stmt = db.prepare('INSERT INTO courses (id, title, description, language, icon) VALUES (?, ?, ?, ?, ?)');
  const transactionalSeed = db.transaction(async () => {
    await db.prepare('DELETE FROM lessons').run();
    await db.prepare('DELETE FROM units').run();
    await db.prepare('DELETE FROM courses').run();

    for (const prog of fuoyePrograms) {
      const id = crypto.randomUUID();
      await stmt.run(id, prog.title, prog.description, prog.language, prog.icon);
      if (prog.title === 'Computer Science') {
        cscCourseId = id;
      }
    }
  });
  
  await transactionalSeed();

  if (cscCourseId) {
    const curriculum = [
      {
        unit: '100 Level - First Semester',
        desc: 'Foundational computer science, mathematics, and general studies',
        order: 1,
        courses: [
          { code: 'CSC 101', title: 'Introduction to Computer Science I', topics: 'History of computers, computer generations, data representation, computer hardware, software systems, programming basics, applications of computers.' },
          { code: 'MTH 101', title: 'Elementary Mathematics I', topics: 'Algebra, indices, logarithms, quadratic equations, trigonometry, sets and functions.' },
          { code: 'PHY 101', title: 'General Physics I', topics: 'Mechanics, motion, force, energy, heat, waves, gravitation.' },
          { code: 'PHY 107', title: 'Physics Laboratory I', topics: 'Practical experiments in mechanics, measurements, optics and heat.' },
          { code: 'CHM 101', title: 'General Chemistry I', topics: 'Atomic structure, chemical bonding, periodic table, acids and bases, reactions.' },
          { code: 'CHM 107', title: 'Practical Chemistry I', topics: 'Basic laboratory techniques, titration, chemical experiments.' },
          { code: 'GST 101', title: 'Communication in English I', topics: 'Grammar, comprehension, sentence construction, essay writing, oral English.' },
          { code: 'GST 103', title: 'Use of Library and ICT', topics: 'Library usage, referencing, digital literacy, internet and ICT tools.' },
          { code: 'GST 105', title: 'Introduction to Entrepreneurship', topics: 'Entrepreneurship concepts, business ideas, innovation, self employment.' }
        ]
      },
      {
        unit: '100 Level - Second Semester',
        desc: 'Introductory programming, mathematics and sciences',
        order: 2,
        courses: [
          { code: 'CSC 102', title: 'Introduction to Computer Science II', topics: 'Computer problem solving, algorithms, flowcharts, programming logic, operating systems.' },
          { code: 'MTH 102', title: 'Elementary Mathematics II', topics: 'Calculus, differentiation, integration, coordinate geometry, matrices.' },
          { code: 'PHY 102', title: 'General Physics II', topics: 'Electricity, magnetism, optics, electronics and modern physics.' },
          { code: 'PHY 108', title: 'Physics Laboratory II', topics: 'Practical experiments in electricity, optics and electronics.' },
          { code: 'CHM 102', title: 'General Chemistry II', topics: 'Organic chemistry, hydrocarbons, reaction mechanisms, electrochemistry.' },
          { code: 'CHM 108', title: 'Practical Chemistry II', topics: 'Organic chemistry practicals and laboratory analysis.' },
          { code: 'GST 102', title: 'Communication in English II', topics: 'Advanced grammar, report writing, technical writing and presentation skills.' },
          { code: 'GST 106', title: 'Entrepreneurial Skills and Business Concepts', topics: 'Business planning, marketing, financial management and enterprise development.' },
          { code: 'GST 108', title: 'Nigerian Government and Culture', topics: 'Nigerian history, government structure, economy and cultural heritage.' }
        ]
      },
      {
        unit: '200 Level - First Semester',
        desc: 'Core computer science principles and programming',
        order: 3,
        courses: [
          { code: 'CSC 201', title: 'Computer Programming I', topics: 'Structured programming, variables, loops, arrays, functions, C/C++ programming.' },
          { code: 'CSC 203', title: 'Discrete Structures', topics: 'Logic, Boolean algebra, graph theory, relations, sets and combinatorics.' },
          { code: 'CSC 205', title: 'Computer Organization and Architecture I', topics: 'CPU structure, memory systems, instruction sets, machine language concepts.' },
          { code: 'CSC 207', title: 'Introduction to Information Systems', topics: 'Information systems concepts, databases, data processing and MIS.' },
          { code: 'MTH 201', title: 'Mathematical Methods I', topics: 'Differential equations, matrices, vectors and mathematical modeling.' },
          { code: 'STA 201', title: 'Probability and Statistics', topics: 'Probability theory, distributions, statistical methods and hypothesis testing.' },
          { code: 'GST 201', title: 'Nigerian Peoples and Culture', topics: 'Nigerian cultural diversity, traditions, values and national integration.' }
        ]
      },
      {
        unit: '200 Level - Second Semester',
        desc: 'Advanced programming and data structures',
        order: 4,
        courses: [
          { code: 'CSC 202', title: 'Computer Programming II', topics: 'Advanced programming, pointers, files, structures and object-oriented concepts.' },
          { code: 'CSC 204', title: 'Data Structures', topics: 'Arrays, stacks, queues, linked lists, trees, graphs and searching algorithms.' },
          { code: 'CSC 206', title: 'Computer Organization and Architecture II', topics: 'Input/output systems, assembly language, processors and computer performance.' },
          { code: 'CSC 208', title: 'Numerical Analysis', topics: 'Numerical methods, interpolation, approximation and error analysis.' },
          { code: 'CSC 210', title: 'Logic Design', topics: 'Digital logic, gates, combinational circuits, sequential circuits and flip-flops.' },
          { code: 'MTH 202', title: 'Mathematical Methods II', topics: 'Complex numbers, transforms and advanced calculus.' },
          { code: 'GST 202', title: 'Philosophy and Logic', topics: 'Critical thinking, reasoning, symbolic logic and philosophical concepts.' }
        ]
      },
      {
        unit: '300 Level - First Semester',
        desc: 'Systems software, databases and networks',
        order: 5,
        courses: [
          { code: 'CSC 301', title: 'Operating Systems I', topics: 'Process management, memory management, scheduling and file systems.' },
          { code: 'CSC 303', title: 'Database Management Systems', topics: 'Database design, SQL, normalization, relational databases and DBMS concepts.' },
          { code: 'CSC 305', title: 'Systems Analysis and Design', topics: 'SDLC, feasibility studies, requirement analysis and system modeling.' },
          { code: 'CSC 307', title: 'Algorithms and Complexity Analysis', topics: 'Algorithm design, sorting, searching, recursion and complexity analysis.' },
          { code: 'CSC 309', title: 'Computer Networks I', topics: 'Network fundamentals, OSI model, TCP/IP, routing and switching.' },
          { code: 'CSC 311', title: 'Web Technology', topics: 'HTML, CSS, JavaScript, web hosting and web application development.' },
          { code: 'CSC 313', title: 'Human Computer Interaction', topics: 'User interface design, usability principles and interaction models.' }
        ]
      },
      {
        unit: '300 Level - Second Semester',
        desc: 'Advanced software systems and research preparation',
        order: 6,
        courses: [
          { code: 'CSC 302', title: 'Operating Systems II', topics: 'Deadlocks, virtualization, distributed systems and security management.' },
          { code: 'CSC 304', title: 'Software Engineering', topics: 'Software development methodologies, testing, maintenance and project management.' },
          { code: 'CSC 306', title: 'Artificial Intelligence', topics: 'Intelligent systems, search algorithms, expert systems and machine learning basics.' },
          { code: 'CSC 308', title: 'Compiler Construction', topics: 'Lexical analysis, parsing, syntax trees and code generation.' },
          { code: 'CSC 310', title: 'Computer Networks II', topics: 'Wireless networks, network security, protocols and network administration.' },
          { code: 'CSC 312', title: 'Research Methods', topics: 'Academic research, report writing, referencing and proposal development.' },
          { code: 'CSC 314', title: 'SIWES Preparation / Industrial Training Seminar', topics: 'Industrial training orientation and professional ethics.' }
        ]
      },
      {
        unit: '400 Level - First Semester',
        desc: 'Specialization, project management and networks',
        order: 7,
        courses: [
          { code: 'CSC 401', title: 'Software Engineering Project Management', topics: 'Project planning, scheduling, risk analysis and software quality assurance.' },
          { code: 'CSC 403', title: 'Computer Graphics', topics: 'Graphics systems, image processing, rendering and animation basics.' },
          { code: 'CSC 405', title: 'Network Security and Cryptography', topics: 'Encryption, authentication, cyber security, digital signatures and firewalls.' },
          { code: 'CSC 407', title: 'Distributed Systems', topics: 'Distributed computing, synchronization, cloud systems and middleware.' },
          { code: 'CSC 409', title: 'Data Communication', topics: 'Communication models, transmission systems and network protocols.' },
          { code: 'CSC 411', title: 'Seminar', topics: 'Technical paper presentation and research discussion.' },
          { code: 'CSC 499', title: 'Final Year Project I', topics: 'Project topic selection, literature review and system design.' }
        ]
      },
      {
        unit: '400 Level - Second Semester',
        desc: 'Advanced modern computing, modeling and final project',
        order: 8,
        courses: [
          { code: 'CSC 402', title: 'Computer Simulation and Modeling', topics: 'Simulation techniques, stochastic models and system modeling.' },
          { code: 'CSC 404', title: 'Machine Learning / Intelligent Systems', topics: 'Supervised learning, classification, regression and neural networks.' },
          { code: 'CSC 406', title: 'Internet Programming', topics: 'Dynamic web applications, APIs, backend programming and deployment.' },
          { code: 'CSC 408', title: 'Parallel Computing', topics: 'Parallel architectures, multiprocessing and concurrent programming.' },
          { code: 'CSC 410', title: 'Information Security', topics: 'Information assurance, cyber threats, risk management and security policies.' },
          { code: 'CSC 412', title: 'Entrepreneurship in ICT', topics: 'ICT startups, innovation management and technology business development.' },
          { code: 'CSC 499', title: 'Final Year Project II', topics: 'Project implementation, testing, documentation and defense' }
        ]
      }
    ];

    for (const sem of curriculum) {
      const unitId = crypto.randomUUID();
      await db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
        .run(unitId, cscCourseId, sem.unit, sem.desc, sem.order);

      for (let index = 0; index < sem.courses.length; index++) { const c = sem.courses[index];
        await db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), unitId, `${c.code} - ${c.title}`, c.topics, index + 1, 20);
      }
    }
  }

  res.json({ success: true });
});

async function seedDatabaseIfNeeded() {
  const result = await db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: string | number };
  const count = Number(result?.count || 0);
  if (count === 0) {
    console.log('Seeding initial programs...');
    
    const fuoyePrograms = [
      { title: 'Computer Science', language: 'Faculty of Computing', icon: '💻', description: 'Study of computation, algorithms, and software.' },
      { title: 'Mechanical Engineering', language: 'Faculty of Engineering', icon: '⚙️', description: 'Design, analyze, and manufacture mechanical systems.' },
      { title: 'Accounting', language: 'Faculty of Management Sciences', icon: '📊', description: 'Principles of finance, auditing, and financial reporting.' },
      { title: 'Law', language: 'Faculty of Law', icon: '⚖️', description: 'Study of legal systems, rights, and jurisprudence.' },
      { title: 'Medicine and Surgery', language: 'Faculty of Clinical Sciences', icon: '🩺', description: 'Medical practice, diagnosis, and treatment.' },
    ];

    let cscCourseId = '';
    const stmt = db.prepare('INSERT INTO courses (id, title, description, language, icon) VALUES (?, ?, ?, ?, ?)');
    
    await db.transaction(async () => {
      for (const prog of fuoyePrograms) {
        const id = crypto.randomUUID();
        await stmt.run(id, prog.title, prog.description, prog.language, prog.icon);
        if (prog.title === 'Computer Science') {
          cscCourseId = id;
        }
      }
    })();

    if (cscCourseId) {
      const curriculum = [
        {
          unit: '100 Level - First Semester',
          desc: 'Foundational computer science, mathematics, and general studies',
          order: 1,
          courses: [
            { code: 'CSC 101', title: 'Introduction to Computer Science I', topics: 'History of computers, computer generations, data representation, computer hardware, software systems, programming basics, applications of computers.' },
            { code: 'MTH 101', title: 'Elementary Mathematics I', topics: 'Algebra, indices, logarithms, quadratic equations, trigonometry, sets and functions.' },
            { code: 'PHY 101', title: 'General Physics I', topics: 'Mechanics, motion, force, energy, heat, waves, gravitation.' },
            { code: 'PHY 107', title: 'Physics Laboratory I', topics: 'Practical experiments in mechanics, measurements, optics and heat.' },
            { code: 'CHM 101', title: 'General Chemistry I', topics: 'Atomic structure, chemical bonding, periodic table, acids and bases, reactions.' },
            { code: 'CHM 107', title: 'Practical Chemistry I', topics: 'Basic laboratory techniques, titration, chemical experiments.' },
            { code: 'GST 101', title: 'Communication in English I', topics: 'Grammar, comprehension, sentence construction, essay writing, oral English.' },
            { code: 'GST 103', title: 'Use of Library and ICT', topics: 'Library usage, referencing, digital literacy, internet and ICT tools.' },
            { code: 'GST 105', title: 'Introduction to Entrepreneurship', topics: 'Entrepreneurship concepts, business ideas, innovation, self employment.' }
          ]
        },
        {
          unit: '100 Level - Second Semester',
          desc: 'Introductory programming, mathematics and sciences',
          order: 2,
          courses: [
            { code: 'CSC 102', title: 'Introduction to Computer Science II', topics: 'Computer problem solving, algorithms, flowcharts, programming logic, operating systems.' },
            { code: 'MTH 102', title: 'Elementary Mathematics II', topics: 'Calculus, differentiation, integration, coordinate geometry, matrices.' },
            { code: 'PHY 102', title: 'General Physics II', topics: 'Electricity, magnetism, optics, electronics and modern physics.' },
            { code: 'PHY 108', title: 'Physics Laboratory II', topics: 'Practical experiments in electricity, optics and electronics.' },
            { code: 'CHM 102', title: 'General Chemistry II', topics: 'Organic chemistry, hydrocarbons, reaction mechanisms, electrochemistry.' },
            { code: 'CHM 108', title: 'Practical Chemistry II', topics: 'Organic chemistry practicals and laboratory analysis.' },
            { code: 'GST 102', title: 'Communication in English II', topics: 'Advanced grammar, report writing, technical writing and presentation skills.' },
            { code: 'GST 106', title: 'Entrepreneurial Skills and Business Concepts', topics: 'Business planning, marketing, financial management and enterprise development.' },
            { code: 'GST 108', title: 'Nigerian Government and Culture', topics: 'Nigerian history, government structure, economy and cultural heritage.' }
          ]
        },
        {
          unit: '200 Level - First Semester',
          desc: 'Core computer science principles and programming',
          order: 3,
          courses: [
            { code: 'CSC 201', title: 'Computer Programming I', topics: 'Structured programming, variables, loops, arrays, functions, C/C++ programming.' },
            { code: 'CSC 203', title: 'Discrete Structures', topics: 'Logic, Boolean algebra, graph theory, relations, sets and combinatorics.' },
            { code: 'CSC 205', title: 'Computer Organization and Architecture I', topics: 'CPU structure, memory systems, instruction sets, machine language concepts.' },
            { code: 'CSC 207', title: 'Introduction to Information Systems', topics: 'Information systems concepts, databases, data processing and MIS.' },
            { code: 'MTH 201', title: 'Mathematical Methods I', topics: 'Differential equations, matrices, vectors and mathematical modeling.' },
            { code: 'STA 201', title: 'Probability and Statistics', topics: 'Probability theory, distributions, statistical methods and hypothesis testing.' },
            { code: 'GST 201', title: 'Nigerian Peoples and Culture', topics: 'Nigerian cultural diversity, traditions, values and national integration.' }
          ]
        },
        {
          unit: '200 Level - Second Semester',
          desc: 'Advanced programming and data structures',
          order: 4,
          courses: [
            { code: 'CSC 202', title: 'Computer Programming II', topics: 'Advanced programming, pointers, files, structures and object-oriented concepts.' },
            { code: 'CSC 204', title: 'Data Structures', topics: 'Arrays, stacks, queues, linked lists, trees, graphs and searching algorithms.' },
            { code: 'CSC 206', title: 'Computer Organization and Architecture II', topics: 'Input/output systems, assembly language, processors and computer performance.' },
            { code: 'CSC 208', title: 'Numerical Analysis', topics: 'Numerical methods, interpolation, approximation and error analysis.' },
            { code: 'CSC 210', title: 'Logic Design', topics: 'Digital logic, gates, combinational circuits, sequential circuits and flip-flops.' },
            { code: 'MTH 202', title: 'Mathematical Methods II', topics: 'Complex numbers, transforms and advanced calculus.' },
            { code: 'GST 202', title: 'Philosophy and Logic', topics: 'Critical thinking, reasoning, symbolic logic and philosophical concepts.' }
          ]
        },
        {
          unit: '300 Level - First Semester',
          desc: 'Systems software, databases and networks',
          order: 5,
          courses: [
            { code: 'CSC 301', title: 'Operating Systems I', topics: 'Process management, memory management, scheduling and file systems.' },
            { code: 'CSC 303', title: 'Database Management Systems', topics: 'Database design, SQL, normalization, relational databases and DBMS concepts.' },
            { code: 'CSC 305', title: 'Systems Analysis and Design', topics: 'SDLC, feasibility studies, requirement analysis and system modeling.' },
            { code: 'CSC 307', title: 'Algorithms and Complexity Analysis', topics: 'Algorithm design, sorting, searching, recursion and complexity analysis.' },
            { code: 'CSC 309', title: 'Computer Networks I', topics: 'Network fundamentals, OSI model, TCP/IP, routing and switching.' },
            { code: 'CSC 311', title: 'Web Technology', topics: 'HTML, CSS, JavaScript, web hosting and web application development.' },
            { code: 'CSC 313', title: 'Human Computer Interaction', topics: 'User interface design, usability principles and interaction models.' }
          ]
        },
        {
          unit: '300 Level - Second Semester',
          desc: 'Advanced software systems and research preparation',
          order: 6,
          courses: [
            { code: 'CSC 302', title: 'Operating Systems II', topics: 'Deadlocks, virtualization, distributed systems and security management.' },
            { code: 'CSC 304', title: 'Software Engineering', topics: 'Software development methodologies, testing, maintenance and project management.' },
            { code: 'CSC 306', title: 'Artificial Intelligence', topics: 'Intelligent systems, search algorithms, expert systems and machine learning basics.' },
            { code: 'CSC 308', title: 'Compiler Construction', topics: 'Lexical analysis, parsing, syntax trees and code generation.' },
            { code: 'CSC 310', title: 'Computer Networks II', topics: 'Wireless networks, network security, protocols and network administration.' },
            { code: 'CSC 312', title: 'Research Methods', topics: 'Academic research, report writing, referencing and proposal development.' },
            { code: 'CSC 314', title: 'SIWES Preparation / Industrial Training Seminar', topics: 'Industrial training orientation and professional ethics.' }
          ]
        },
        {
          unit: '400 Level - First Semester',
          desc: 'Specialization, project management and networks',
          order: 7,
          courses: [
            { code: 'CSC 401', title: 'Software Engineering Project Management', topics: 'Project planning, scheduling, risk analysis and software quality assurance.' },
            { code: 'CSC 403', title: 'Computer Graphics', topics: 'Graphics systems, image processing, rendering and animation basics.' },
            { code: 'CSC 405', title: 'Network Security and Cryptography', topics: 'Encryption, authentication, cyber security, digital signatures and firewalls.' },
            { code: 'CSC 407', title: 'Distributed Systems', topics: 'Distributed computing, synchronization, cloud systems and middleware.' },
            { code: 'CSC 409', title: 'Data Communication', topics: 'Communication models, transmission systems and network protocols.' },
            { code: 'CSC 411', title: 'Seminar', topics: 'Technical paper presentation and research discussion.' },
            { code: 'CSC 499', title: 'Final Year Project I', topics: 'Project topic selection, literature review and system design.' }
          ]
        },
        {
          unit: '400 Level - Second Semester',
          desc: 'Advanced modern computing, modeling and final project',
          order: 8,
          courses: [
            { code: 'CSC 402', title: 'Computer Simulation and Modeling', topics: 'Simulation techniques, stochastic models and system modeling.' },
            { code: 'CSC 404', title: 'Machine Learning / Intelligent Systems', topics: 'Supervised learning, classification, regression and neural networks.' },
            { code: 'CSC 406', title: 'Internet Programming', topics: 'Dynamic web applications, APIs, backend programming and deployment.' },
            { code: 'CSC 408', title: 'Parallel Computing', topics: 'Parallel architectures, multiprocessing and concurrent programming.' },
            { code: 'CSC 410', title: 'Information Security', topics: 'Information assurance, cyber threats, risk management and security policies.' },
            { code: 'CSC 412', title: 'Entrepreneurship in ICT', topics: 'ICT startups, innovation management and technology business development.' },
            { code: 'CSC 499', title: 'Final Year Project II', topics: 'Project implementation, testing, documentation and defense.' }
          ]
        }
      ];

      await db.transaction(async () => {
        for (const sem of curriculum) {
          const unitId = crypto.randomUUID();
          await db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
            .run(unitId, cscCourseId, sem.unit, sem.desc, sem.order);
    
          for (let index = 0; index < sem.courses.length; index++) { const c = sem.courses[index];
            await db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
              .run(crypto.randomUUID(), unitId, `${c.code} - ${c.title}`, c.topics, index + 1, 20);
          }
        }
      })();
    }
  }
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
