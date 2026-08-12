import path from 'path';
import fs from 'fs';

export interface DbSession {
  id: string;
  title: string;
  world_id: string;
  character_id: string;
  system_instruction?: string;
  created_at: number;
  updated_at: number;
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  timestamp: number;
}

// Ensure data directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'app.db');

interface DbAdapter {
  exec(sql: string): Promise<void> | void;
  getSessions(): Promise<DbSession[]>;
  saveSession(session: DbSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getMessages(sessionId: string): Promise<DbMessage[]>;
  saveMessage(message: DbMessage): Promise<void>;
  deleteMessage(id: string): Promise<void>;
}

class BetterSqliteAdapter implements DbAdapter {
  private db: any;

  constructor(file: string) {
    const Database = require('better-sqlite3');
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  async getSessions(): Promise<DbSession[]> {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC');
    return stmt.all();
  }

  async saveSession(session: DbSession): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, title, world_id, character_id, system_instruction, created_at, updated_at)
      VALUES (@id, @title, @world_id, @character_id, @system_instruction, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at
    `);
    stmt.run(session);
  }

  async deleteSession(id: string): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  async getMessages(sessionId: string): Promise<DbMessage[]> {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC');
    return stmt.all();
  }

  async saveMessage(message: DbMessage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, type, timestamp)
      VALUES (@id, @session_id, @role, @content, @type, @timestamp)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        timestamp = excluded.timestamp
    `);
    stmt.run(message);

    // Update parent session updated_at
    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(message.timestamp, message.session_id);
  }

  async deleteMessage(id: string): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }
}

class LibSqlAdapter implements DbAdapter {
  private client: any;

  constructor(file: string) {
    const { createClient } = require('@libsql/client');
    this.client = createClient({
      url: `file:${file}`,
    });
  }

  async exec(sql: string): Promise<void> {
    await this.client.executeMultiple(sql);
  }

  async getSessions(): Promise<DbSession[]> {
    const res = await this.client.execute('SELECT * FROM sessions ORDER BY updated_at DESC');
    return res.rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title),
      world_id: String(row.world_id),
      character_id: String(row.character_id),
      system_instruction: row.system_instruction ? String(row.system_instruction) : undefined,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    }));
  }

  async saveSession(session: DbSession): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO sessions (id, title, world_id, character_id, system_instruction, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`,
      args: [
        session.id,
        session.title,
        session.world_id,
        session.character_id,
        session.system_instruction || null,
        session.created_at,
        session.updated_at,
      ],
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.client.execute({ sql: 'DELETE FROM messages WHERE session_id = ?', args: [id] });
    await this.client.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [id] });
  }

  async getMessages(sessionId: string): Promise<DbMessage[]> {
    const res = await this.client.execute({
      sql: 'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      args: [sessionId],
    });
    return res.rows.map((row: any) => ({
      id: String(row.id),
      session_id: String(row.session_id),
      role: row.role as any,
      content: String(row.content),
      type: row.type ? (row.type as any) : undefined,
      timestamp: Number(row.timestamp),
    }));
  }

  async saveMessage(message: DbMessage): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO messages (id, session_id, role, content, type, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET content = excluded.content, timestamp = excluded.timestamp`,
      args: [
        message.id,
        message.session_id,
        message.role,
        message.content,
        message.type || null,
        message.timestamp,
      ],
    });
    await this.client.execute({
      sql: 'UPDATE sessions SET updated_at = ? WHERE id = ?',
      args: [message.timestamp, message.session_id],
    });
  }

  async deleteMessage(id: string): Promise<void> {
    await this.client.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [id] });
  }
}

let dbInstance: DbAdapter;

export function getDatabase(): DbAdapter {
  if (dbInstance) return dbInstance;

  try {
    // Attempt native better-sqlite3 first
    dbInstance = new BetterSqliteAdapter(dbPath);
  } catch (e) {
    console.warn('Native better-sqlite3 initialization failed. Falling back to @libsql/client:', e);
    dbInstance = new LibSqlAdapter(dbPath);
  }

  // Initialize Schema
  const initSql = `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      world_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      system_instruction TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `;
  
  try {
    dbInstance.exec(initSql);
  } catch (err) {
    console.error('Failed to initialize SQLite schema:', err);
  }

  return dbInstance;
}
