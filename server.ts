import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from './server-db';
import path from 'path';

// Load env vars if using dotenv
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(express.json());
app.use(cookieParser());

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
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    // Auto-assign admin if email matched
    const role = email === 'lilscope01@gmail.com' ? 'admin' : 'user';
    
    db.prepare(`
      INSERT INTO users (id, email, password, displayName, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, hashedPassword, email.split('@')[0], role);
    
    db.prepare('INSERT INTO userProgress (userId, completedLessons) VALUES (?, ?)')
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
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
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

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// User routes
app.get('/api/user/me', authenticateToken, (req: any, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  const progress = db.prepare('SELECT * FROM userProgress WHERE userId = ?').get(user.id) as any;
  user.completedLessons = JSON.parse(progress.completedLessons);
  res.json(user);
});

app.post('/api/user/course', authenticateToken, (req: any, res) => {
  const { courseId } = req.body;
  db.prepare('UPDATE users SET currentCourseId = ? WHERE id = ?').run(courseId, req.user.id);
  res.json({ success: true });
});

app.post('/api/user/progress', authenticateToken, (req: any, res) => {
  const { lessonId, xpReward, isNewDay } = req.body;
  
  const progress = db.prepare('SELECT * FROM userProgress WHERE userId = ?').get(req.user.id) as any;
  const completed = JSON.parse(progress.completedLessons);
  if (!completed.includes(lessonId)) {
    completed.push(lessonId);
  }
  
  db.prepare('UPDATE userProgress SET completedLessons = ? WHERE userId = ?')
    .run(JSON.stringify(completed), req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  let newXp = user.xp + (xpReward || 10);
  let newStreak = user.streak;
  
  const today = new Date().toISOString().split('T')[0];
  const lastPractice = user.lastPracticeDate ? user.lastPracticeDate.split('T')[0] : null;

  if (lastPractice !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastPractice === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  db.prepare('UPDATE users SET xp = ?, streak = ?, lastPracticeDate = ? WHERE id = ?')
    .run(newXp, newStreak, new Date().toISOString(), req.user.id);

  res.json({ success: true });
});

// Data routes
app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  res.json(courses);
});

app.post('/api/courses', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { title, description, language, icon } = req.body;
  db.prepare('INSERT INTO courses (id, title, description, language, icon) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, description, language, icon);
  res.json({ id });
});

app.get('/api/units', (req, res) => {
  const units = db.prepare('SELECT * FROM units ORDER BY "order" ASC').all();
  res.json(units);
});

app.post('/api/units', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { courseId, title, description, order } = req.body;
  db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
    .run(id, courseId, title, description, order);
  res.json({ id });
});

app.get('/api/lessons', (req, res) => {
  const lessons = db.prepare('SELECT * FROM lessons ORDER BY "order" ASC').all();
  res.json(lessons);
});

app.get('/api/lessons/:id', (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  res.json(lesson || null);
});

app.post('/api/lessons', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const id = crypto.randomUUID();
  const { unitId, title, topic, order, xpReward } = req.body;
  db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, unitId, title, topic, order, xpReward);
  res.json({ id });
});

app.get('/api/leaderboard', (req, res) => {
  const leaders = db.prepare('SELECT id, displayName, photoURL, xp, streak FROM users ORDER BY xp DESC LIMIT 50').all();
  res.json(leaders);
});

app.post('/api/seed', authenticateToken, (req: any, res) => {
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
  const transactionalSeed = db.transaction(() => {
    for (const prog of fuoyePrograms) {
      const id = crypto.randomUUID();
      stmt.run(id, prog.title, prog.description, prog.language, prog.icon);
      if (prog.title === 'Computer Science') {
        cscCourseId = id;
      }
    }
  });
  
  transactionalSeed();

  if (cscCourseId) {
    // 100 LEVEL
    const unit100Id = crypto.randomUUID();
    db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
      .run(unit100Id, cscCourseId, '100 Level (Freshman Year)', 'Foundational courses in Computer Science', 1);

    db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), unit100Id, 'CSC 101 - Intro to Computer Science', 'History of computing, hardware/software, basic algorithms', 1, 15);
      
    db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), unit100Id, 'CSC 102 - Intro to Computer Science II', 'Number systems, logic, secondary storage', 2, 15);

    // 200 LEVEL
    const unit200Id = crypto.randomUUID();
    db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
      .run(unit200Id, cscCourseId, '200 Level (Sophomore Year)', 'Intermediate computer programming and architecture', 2);

    const csc200courses = [
      { t: 'CSC 201 - Computer Programming I', top: 'Introduction to programming, variables, control structures' },
      { t: 'CSC 202 - Computer Programming II', top: 'Object-oriented programming, classes, polymorphism' },
      { t: 'CSC 203 - Discrete Structures', top: 'Set theory, graphs, combinatorics, logic' },
      { t: 'CSC 204 - Data Structures', top: 'Arrays, linked lists, stacks, queues, trees' },
      { t: 'CSC 205 - Computer Organization', top: 'CPU architecture, registers, instruction sets' },
      { t: 'CSC 206 - Operating Systems I', top: 'OS principles, processes, threads, scheduling' },
    ];
    csc200courses.forEach((c, i) => {
      db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), unit200Id, c.t, c.top, i+1, 20);
    });

    // 300 LEVEL
    const unit300Id = crypto.randomUUID();
    db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
      .run(unit300Id, cscCourseId, '300 Level (Junior Year)', 'Advanced computing principles and architecture', 3);

    const csc300courses = [
      { t: 'CSC 301 - Algorithms', top: 'Time complexity, sorting, graph algorithms, dynamic programming' },
      { t: 'CSC 302 - Theory of Computation', top: 'Automata, Turing machines, computability, complexity classes' },
      { t: 'CSC 303 - Operating Systems II', top: 'Memory management, virtual memory, file systems, security' },
      { t: 'CSC 305 - Database Systems', top: 'Relational algebra, SQL, normalization, concurrency control' },
      { t: 'CSC 307 - Software Engineering', top: 'SDLC, Agile, requirements, design patterns, testing' },
    ];
    csc300courses.forEach((c, i) => {
      db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), unit300Id, c.t, c.top, i+1, 25);
    });

    // 400 LEVEL
    const unit400Id = crypto.randomUUID();
    db.prepare('INSERT INTO units (id, courseId, title, description, "order") VALUES (?, ?, ?, ?, ?)')
      .run(unit400Id, cscCourseId, '400 Level (Senior Year)', 'Specialized computing topics and major projects', 4);

    const csc400courses = [
      { t: 'CSC 401 - Computer Graphics', top: 'Rasterization, 3D transformations, shading, Ray tracing' },
      { t: 'CSC 403 - Distributed Systems', top: 'Consensus algorithms, RPC, distributed file systems, cloud' },
      { t: 'CSC 405 - Cyber Security', top: 'Cryptography, network security, ethical hacking, malware' },
      { t: 'CSC 407 - Machine Learning', top: 'Supervised vs unsupervised learning, neural networks, SVMs' },
      { t: 'CSC 402 - Final Year Project', top: 'Research methodology, implementation, thesis defense preparation' }
    ];
    csc400courses.forEach((c, i) => {
      db.prepare('INSERT INTO lessons (id, unitId, title, topic, "order", xpReward) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), unit400Id, c.t, c.top, i+1, 30);
    });
  }

  res.json({ success: true });
});

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
