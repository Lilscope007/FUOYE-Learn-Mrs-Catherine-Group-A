import Database from 'better-sqlite3';

const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

// Define schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    displayName TEXT,
    photoURL TEXT,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    lastPracticeDate TEXT,
    currentCourseId TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL,
    FOREIGN KEY(courseId) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    unitId TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    xpReward INTEGER DEFAULT 10,
    FOREIGN KEY(unitId) REFERENCES units(id)
  );

  CREATE TABLE IF NOT EXISTS userProgress (
    userId TEXT PRIMARY KEY,
    completedLessons TEXT DEFAULT '[]',
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

export default db;
