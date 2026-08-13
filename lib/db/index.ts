import path from 'path';
import fs from 'fs';

import type { DbSession, DbMessage, DbMemory } from './types';
export type { DbSession, DbMessage, DbMemory } from './types';

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.resolve(dbDir, 'app.db');

interface DbAdapter {
  exec(sql: string): Promise<void> | void;
  getSessions(): Promise<DbSession[]>;
  saveSession(session: DbSession): Promise<void>;
  updateSession(id: string, fields: Partial<DbSession>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getMessages(sessionId: string): Promise<DbMessage[]>;
  saveMessage(message: DbMessage): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  getMemories(sessionId: string): Promise<DbMemory[]>;
  saveMemory(memory: DbMemory): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  clearMemories(sessionId: string): Promise<void>;
}

class BetterSqliteAdapter implements DbAdapter {
  private db: any;

  constructor(file: string) {
    const Database = require('better-sqlite3');
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
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
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM memories WHERE session_id = ?').run(id);
      this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    });
    txn();
  }

  async getMessages(sessionId: string): Promise<DbMessage[]> {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC');
    return stmt.all(sessionId);
  }

  async updateSession(id: string, fields: Partial<DbSession>): Promise<void> {
    if (fields.updated_at !== undefined) {
      this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(fields.updated_at, id);
    }
    if (fields.title !== undefined) {
      this.db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(fields.title, id);
    }
  }

  async saveMessage(message: DbMessage): Promise<void> {
    const txn = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO messages (id, session_id, role, content, type, speaker, timestamp)
        VALUES (@id, @session_id, @role, @content, @type, @speaker, @timestamp)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          speaker = excluded.speaker,
          timestamp = excluded.timestamp
      `);
      stmt.run({
        id: message.id,
        session_id: message.session_id,
        role: message.role,
        content: message.content,
        type: message.type || null,
        speaker: message.speaker || null,
        timestamp: message.timestamp,
      });

      // Update parent session updated_at atomically
      this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(message.timestamp, message.session_id);
    });
    txn();
  }

  async deleteMessage(id: string): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  async getMemories(sessionId: string): Promise<DbMemory[]> {
    const stmt = this.db.prepare('SELECT * FROM memories WHERE session_id = ? ORDER BY turn_number ASC, timestamp ASC');
    return stmt.all(sessionId);
  }

  async saveMemory(memory: DbMemory): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, session_id, turn_number, speaker, content, keywords, is_summary, timestamp)
      VALUES (@id, @session_id, @turn_number, @speaker, @content, @keywords, @is_summary, @timestamp)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        keywords = excluded.keywords,
        timestamp = excluded.timestamp
    `);
    stmt.run({
      id: memory.id,
      session_id: memory.session_id,
      turn_number: memory.turn_number,
      speaker: memory.speaker || null,
      content: memory.content,
      keywords: memory.keywords || null,
      is_summary: memory.is_summary || 0,
      timestamp: memory.timestamp,
    });
  }

  async deleteMemory(id: string): Promise<void> {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  async clearMemories(sessionId: string): Promise<void> {
    this.db.prepare('DELETE FROM memories WHERE session_id = ?').run(sessionId);
  }
}

class LibSqlAdapter implements DbAdapter {
  private client: any;

  constructor(file: string) {
    const { createClient } = require('@libsql/client');
    const absPath = path.resolve(file);
    this.client = createClient({
      url: `file:${absPath}`,
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
    await this.client.batch([
      { sql: 'DELETE FROM memories WHERE session_id = ?', args: [id] },
      { sql: 'DELETE FROM messages WHERE session_id = ?', args: [id] },
      { sql: 'DELETE FROM sessions WHERE id = ?', args: [id] },
    ]);
  }

  async updateSession(id: string, fields: Partial<DbSession>): Promise<void> {
    if (fields.updated_at !== undefined) {
      await this.client.execute({ sql: 'UPDATE sessions SET updated_at = ? WHERE id = ?', args: [fields.updated_at, id] });
    }
    if (fields.title !== undefined) {
      await this.client.execute({ sql: 'UPDATE sessions SET title = ? WHERE id = ?', args: [fields.title, id] });
    }
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
      speaker: row.speaker ? String(row.speaker) : undefined,
      timestamp: Number(row.timestamp),
    }));
  }

  async saveMessage(message: DbMessage): Promise<void> {
    await this.client.batch([
      {
        sql: `INSERT INTO messages (id, session_id, role, content, type, speaker, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET content = excluded.content, speaker = excluded.speaker, timestamp = excluded.timestamp`,
        args: [
          message.id,
          message.session_id,
          message.role,
          message.content,
          message.type || null,
          message.speaker || null,
          message.timestamp,
        ],
      },
      {
        sql: 'UPDATE sessions SET updated_at = ? WHERE id = ?',
        args: [message.timestamp, message.session_id],
      },
    ]);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.client.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [id] });
  }

  async getMemories(sessionId: string): Promise<DbMemory[]> {
    const res = await this.client.execute({
      sql: 'SELECT * FROM memories WHERE session_id = ? ORDER BY turn_number ASC, timestamp ASC',
      args: [sessionId],
    });
    return res.rows.map((row: any) => ({
      id: String(row.id),
      session_id: String(row.session_id),
      turn_number: Number(row.turn_number),
      speaker: row.speaker ? String(row.speaker) : undefined,
      content: String(row.content),
      keywords: row.keywords ? String(row.keywords) : undefined,
      is_summary: row.is_summary ? Number(row.is_summary) : 0,
      timestamp: Number(row.timestamp),
    }));
  }

  async saveMemory(memory: DbMemory): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO memories (id, session_id, turn_number, speaker, content, keywords, is_summary, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET content = excluded.content, keywords = excluded.keywords, timestamp = excluded.timestamp`,
      args: [
        memory.id,
        memory.session_id,
        memory.turn_number,
        memory.speaker || null,
        memory.content,
        memory.keywords || null,
        memory.is_summary || 0,
        memory.timestamp,
      ],
    });
  }

  async deleteMemory(id: string): Promise<void> {
    await this.client.execute({ sql: 'DELETE FROM memories WHERE id = ?', args: [id] });
  }

  async clearMemories(sessionId: string): Promise<void> {
    await this.client.execute({ sql: 'DELETE FROM memories WHERE session_id = ?', args: [sessionId] });
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
      speaker TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      speaker TEXT,
      content TEXT NOT NULL,
      keywords TEXT,
      is_summary INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `;
  
  try {
    dbInstance.exec(initSql);
  } catch (err) {
    console.error('Failed to initialize SQLite schema:', err);
  }

  // Graceful column migration for existing databases
  try {
    dbInstance.exec('ALTER TABLE messages ADD COLUMN speaker TEXT;');
  } catch {
    // speaker column already exists, safe migration fallback
  }

  return dbInstance;
}
