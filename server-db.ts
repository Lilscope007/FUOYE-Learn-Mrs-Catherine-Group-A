import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Temporary mock of better-sqlite3 for Vercel using Postgres
const connectionString = (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').split('?')[0];

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

function replaceQuestionMarks(sql: string) {
  let count = 0;
  return sql.replace(/\?/g, () => {
    count++;
    return "$" + count;
  });
}

class PreparedStatement {
  sql: string;
  constructor(sql: string) {
    this.sql = replaceQuestionMarks(sql);
  }
  
  async get(...params: any[]) {
    const res = await pool.query(this.sql, params);
    return res.rows[0];
  }
  
  async all(...params: any[]) {
    const res = await pool.query(this.sql, params);
    return res.rows;
  }
  
  async run(...params: any[]) {
    const res = await pool.query(this.sql, params);
    return { changes: res.rowCount, lastInsertRowid: null };
  }
}

export const dbExec = async (sql: string) => {
  await pool.query(sql);
};

export const dbPrepare = (sql: string) => {
  return new PreparedStatement(sql);
};

export const dbTransaction = (fn: (...args: any[]) => any) => {
  return async (...args: any[]) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await fn(...args); // The operations inside fn need to be async but wait...
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };
};

export async function initDb() {
  await pool.query(`
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
      role TEXT DEFAULT 'user',
      gems INTEGER DEFAULT 500,
      hearts INTEGER DEFAULT 5,
      maxHearts INTEGER DEFAULT 5,
      nextHeartRefill TEXT
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
}

const db = {
  prepare: dbPrepare,
  transaction: dbTransaction,
  exec: dbExec,
};

export default db;
