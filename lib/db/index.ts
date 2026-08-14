import path from 'path';
import fs from 'fs';

import type { DbSession, DbMessage, DbMemory } from './types';
export type { DbSession, DbMessage, DbMemory } from './types';

// Determine if we are running in a test environment
const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Ensure data directory exists
const baseDbDir = path.resolve(process.cwd(), 'data');
const dbDir = isTestMode ? path.resolve(baseDbDir, 'test') : baseDbDir;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Resolve the actual database file
const defaultDbName = 'app.db';
const dbPath = process.env.DREAMX_DB_PATH || path.resolve(dbDir, defaultDbName);

// HARD SAFETY RULE: Fail-closed if test mode accidentally resolves to production database
if (isTestMode && dbPath === path.resolve(baseDbDir, 'app.db')) {
  throw new Error('FATAL ERROR: Test mode must not use the production database (app.db).');
}

export function getDbPath(): string {
  return dbPath;
}

interface DbAdapter {
  exec(sql: string): Promise<void> | void;
  getSessions(): Promise<DbSession[]>;
  saveSession(session: DbSession): Promise<void>;
  saveSessionWithMessage(session: DbSession, message: DbMessage, indexMemory?: boolean): Promise<void>;
  updateSession(id: string, fields: Partial<DbSession>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getMessages(sessionId: string): Promise<DbMessage[]>;
  saveMessage(message: DbMessage): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  getMemories(sessionId: string): Promise<DbMemory[]>;
  saveMemory(memory: DbMemory): Promise<void>;
  deleteMemory(id: string): Promise<void>;
  clearMemories(sessionId: string): Promise<void>;
  
  // Generic methods for isolated subsystems (e.g. DreamX)
  queryAll<T>(sql: string, args?: any[]): Promise<T[]>;
  queryFirst<T>(sql: string, args?: any[]): Promise<T | undefined>;
  execute(sql: string, args?: any[]): Promise<void>;
  batchExecute(statements: Array<{ sql: string; args?: any[] }>): Promise<void>;
  close(): void;
  backup?(destinationFile: string): Promise<any>;
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

  close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }

  async backup(destinationFile: string): Promise<any> {
    return this.db.backup(destinationFile);
  }

  async queryAll<T>(sql: string, args: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...args) as T[];
  }

  async queryFirst<T>(sql: string, args: any[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...args) as T | undefined;
  }

  async execute(sql: string, args: any[] = []): Promise<void> {
    this.db.prepare(sql).run(...args);
  }

  async batchExecute(statements: Array<{ sql: string; args?: any[] }>): Promise<void> {
    const txn = this.db.transaction(() => {
      for (const stmt of statements) {
        this.db.prepare(stmt.sql).run(...(stmt.args || []));
      }
    });
    txn();
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
    stmt.run({
      id: session.id,
      title: session.title,
      world_id: session.world_id,
      character_id: session.character_id,
      system_instruction: session.system_instruction || null,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });
  }

  async saveSessionWithMessage(session: DbSession, message: DbMessage, indexMemory?: boolean): Promise<void> {
    const txn = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO sessions (id, title, world_id, character_id, system_instruction, created_at, updated_at)
        VALUES (@id, @title, @world_id, @character_id, @system_instruction, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          updated_at = excluded.updated_at
      `).run({
        id: session.id,
        title: session.title,
        world_id: session.world_id,
        character_id: session.character_id,
        system_instruction: session.system_instruction || null,
        created_at: session.created_at,
        updated_at: session.updated_at,
      });

      this.db.prepare(`
        INSERT INTO messages (id, session_id, role, content, type, speaker, timestamp)
        VALUES (@id, @session_id, @role, @content, @type, @speaker, @timestamp)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          speaker = excluded.speaker,
          timestamp = excluded.timestamp
      `).run({
        id: message.id,
        session_id: message.session_id,
        role: message.role,
        content: message.content,
        type: message.type || null,
        speaker: message.speaker || null,
        timestamp: message.timestamp,
      });

      if (indexMemory && message.content) {
        const words = message.content.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        const kwStr = Array.from(new Set(words)).slice(0, 10).join(',');
        this.db.prepare(`
          INSERT INTO memories (id, session_id, turn_number, speaker, content, keywords, is_summary, timestamp)
          VALUES (@id, @session_id, @turn_number, @speaker, @content, @keywords, @is_summary, @timestamp)
          ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            keywords = excluded.keywords,
            timestamp = excluded.timestamp
        `).run({
          id: `mem_${message.timestamp}_init`,
          session_id: message.session_id,
          turn_number: 1,
          speaker: message.speaker || 'Narrator',
          content: message.content,
          keywords: kwStr,
          is_summary: 0,
          timestamp: message.timestamp,
        });
      }
    });
    txn();
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

  async saveSessionWithMessage(session: DbSession, message: DbMessage, indexMemory?: boolean): Promise<void> {
    const statements: any[] = [
      {
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
      },
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
    ];

    if (indexMemory && message.content) {
      const words = message.content.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const kwStr = Array.from(new Set(words)).slice(0, 10).join(',');
      statements.push({
        sql: `INSERT INTO memories (id, session_id, turn_number, speaker, content, keywords, is_summary, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET content = excluded.content, keywords = excluded.keywords, timestamp = excluded.timestamp`,
        args: [
          `mem_${message.timestamp}_init`,
          message.session_id,
          1,
          message.speaker || 'Narrator',
          message.content,
          kwStr,
          0,
          message.timestamp,
        ],
      });
    }

    await this.client.batch(statements);
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

  async queryAll<T>(sql: string, args: any[] = []): Promise<T[]> {
    const res = await this.client.execute({ sql, args });
    // Convert rows array to object array
    return res.rows as unknown as T[];
  }

  async queryFirst<T>(sql: string, args: any[] = []): Promise<T | undefined> {
    const res = await this.client.execute({ sql, args });
    return (res.rows[0] as unknown as T) || undefined;
  }

  async execute(sql: string, args: any[] = []): Promise<void> {
    await this.client.execute({ sql, args });
  }

  async batchExecute(statements: Array<{ sql: string; args?: any[] }>): Promise<void> {
    const batchStmts = statements.map(s => ({ sql: s.sql, args: s.args || [] }));
    await this.client.batch(batchStmts);
  }

  close(): void {
    this.client.close();
  }
}

let dbInstance: DbAdapter | null = null;
let dreamxInitError: Error | null = null;

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function reconnectDatabase(mode: 'normal' | 'restore' = 'normal'): DbAdapter {
  closeDatabase();
  dreamxInitError = null;
  return getDatabase(mode);
}

export function assertDreamXAvailable(): void {
  if (dreamxInitError) {
    throw new Error(`DreamX Subsystem Unavailable: Database schema migration failed. (${dreamxInitError.message})`);
  }
}

export function getDatabase(mode: 'normal' | 'restore' = 'normal'): DbAdapter {
  if (dbInstance) return dbInstance;

  try {
    // Attempt native better-sqlite3 first
    dbInstance = new BetterSqliteAdapter(dbPath);

    // ---------------------------------------------------------
    // ATOMIC SYNCHRONOUS DREAMX MIGRATION (v0.1 -> v0.2)
    // ---------------------------------------------------------
    if (mode === 'normal') {
      try {
        const rawDb = (dbInstance as any).db;
      if (rawDb) {
        // Inspect current schema of dreamx_posts safely
        const tableInfo = rawDb.pragma('table_info(dreamx_posts)');
        const hasProfileId = tableInfo.some((col: any) => col.name === 'profile_id');
        const hasAuthorId = tableInfo.some((col: any) => col.name === 'author_id');
        const hasAuthorType = tableInfo.some((col: any) => col.name === 'author_type');
        
        // If legacy profile_id column exists, perform a safe table rebuild
        if (hasProfileId) {
          console.log('Migrating legacy dreamx_posts schema to v0.2 actor model...');
          
          const authorIdSrc = hasAuthorId ? 'author_id' : 'profile_id';
          const authorTypeSrc = hasAuthorType ? 'author_type' : "'ai'";
          const hasLikes = tableInfo.some((col: any) => col.name === 'likes_count');
          const likesSrc = hasLikes ? 'likes_count' : '0';
          const hasReposts = tableInfo.some((col: any) => col.name === 'reposts_count');
          const repostsSrc = hasReposts ? 'reposts_count' : '0';
          const hasReplyTo = tableInfo.some((col: any) => col.name === 'reply_to_post_id');
          const replyToSrc = hasReplyTo ? 'reply_to_post_id' : 'NULL';

          // Atomic transaction - if any statement fails, better-sqlite3 automatically rolls back
          rawDb.transaction(() => {
            // 1. Create target v0.2 table
            rawDb.prepare(`
              CREATE TABLE dreamx_posts_new (
                id TEXT PRIMARY KEY,
                author_id TEXT NOT NULL,
                author_type TEXT NOT NULL CHECK(author_type IN ('human', 'ai')),
                content TEXT NOT NULL,
                reply_to_post_id TEXT,
                likes_count INTEGER DEFAULT 0,
                reposts_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL
              )
            `).run();
            
            // 2. Map legacy data, preserving content and defaults
            rawDb.prepare(`
              INSERT INTO dreamx_posts_new (
                id, author_id, author_type, content, reply_to_post_id, likes_count, reposts_count, created_at
              )
              SELECT 
                id, 
                COALESCE(${authorIdSrc}, profile_id), 
                COALESCE(${authorTypeSrc}, 'ai'), 
                content, 
                ${replyToSrc}, 
                ${likesSrc}, 
                ${repostsSrc}, 
                created_at 
              FROM dreamx_posts
            `).run();
            
            // 3. Swap tables and drop legacy foreign keys
            rawDb.prepare(`DROP TABLE dreamx_posts`).run();
            rawDb.prepare(`ALTER TABLE dreamx_posts_new RENAME TO dreamx_posts`).run();
            
            // 4. Recreate the deduplication index
            rawDb.prepare(`
              CREATE UNIQUE INDEX IF NOT EXISTS idx_dreamx_ai_reply_dedup 
              ON dreamx_posts(author_id, reply_to_post_id) 
              WHERE author_type = 'ai' AND reply_to_post_id IS NOT NULL
            `).run();
          })();
          
          console.log('DreamX schema migration completed successfully.');
        }
      }
      } catch (migErr: any) {
        console.error('DreamX synchronous migration failed (rolling back automatically):', migErr);
        dreamxInitError = migErr instanceof Error ? migErr : new Error(String(migErr));
      }
    }
    // ---------------------------------------------------------

  } catch (e) {
    if (mode === 'restore') {
      throw new Error(`Native better-sqlite3 initialization failed during restore operation. Bypassing fallback to prevent schema corruption. Original error: ${(e as Error).message}`);
    }

    console.warn('Native better-sqlite3 initialization failed. Falling back to @libsql/client:', e);
    dbInstance = new LibSqlAdapter(dbPath);

    // Documented libSQL fallback guard: Check for unmigrated legacy schema asynchronously
    (async () => {
      try {
        const tableInfo = await dbInstance.queryAll<{ name: string }>("PRAGMA table_info(dreamx_posts);");
        const hasProfileId = tableInfo.some(col => col.name === 'profile_id');
        if (hasProfileId) {
          dreamxInitError = new Error('DreamX subsystem unavailable under @libsql/client fallback with legacy schema. Native better-sqlite3 adapter required.');
        }
      } catch {}
    })();
  }

  // Initialize Schema ONLY in normal mode
  if (mode === 'normal') {
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

  // Initialize DreamX Schema (Hard Feature Isolation)
  // These tables have NO foreign keys pointing to DreamWeaver tables.
  const dreamxInitSql = `
    CREATE TABLE IF NOT EXISTS dreamx_user_profile (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      personality TEXT,
      interests TEXT,
      writing_style TEXT,
      verification_type TEXT DEFAULT 'none',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      personality TEXT,
      traits TEXT,
      interests TEXT,
      speaking_style TEXT,
      beliefs TEXT,
      background TEXT,
      posting_guidelines TEXT,
      verification_type TEXT DEFAULT 'none',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );


    CREATE TABLE IF NOT EXISTS dreamx_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_type TEXT NOT NULL CHECK(author_type IN ('human', 'ai')),
      content TEXT NOT NULL,
      reply_to_post_id TEXT,
      likes_count INTEGER DEFAULT 0,
      reposts_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('human', 'ai')),
      created_at INTEGER NOT NULL,
      UNIQUE(post_id, actor_id, actor_type)
    );

    CREATE TABLE IF NOT EXISTS dreamx_reposts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('human', 'ai')),
      created_at INTEGER NOT NULL,
      UNIQUE(post_id, actor_id, actor_type)
    );

    CREATE TABLE IF NOT EXISTS dreamx_follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      follower_type TEXT NOT NULL CHECK(follower_type IN ('human', 'ai')),
      followed_profile_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(follower_id, follower_type, followed_profile_id)
    );

    CREATE TABLE IF NOT EXISTS dreamx_simulation_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dreamx_ai_reply_dedup ON dreamx_posts(author_id, reply_to_post_id) WHERE author_type = 'ai' AND reply_to_post_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS dreamx_activity_log (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      actor_id TEXT,
      target_post_id TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_crowd_state (
      actor_id TEXT PRIMARY KEY,
      followers_count INTEGER DEFAULT 0,
      sentiment_score REAL DEFAULT 0,
      momentum REAL DEFAULT 0,
      influence_score REAL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_crowd_engagement (
      post_id TEXT PRIMARY KEY,
      crowd_likes INTEGER DEFAULT 0,
      crowd_reposts INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      engagement_velocity REAL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_crowd_history_daily (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('actor', 'global')),
      date_string TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(target_id, target_type, date_string)
    );

    CREATE TABLE IF NOT EXISTS dreamx_analytics_steps (
      step_id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('normal', 'burst')),
      started_at INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      actions_taken INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dreamx_notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      source_log_id TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(source_log_id)
    );
  `;

  try {
    dbInstance.exec(dreamxInitSql);
  } catch (err) {
    console.error('Failed to initialize DreamX SQLite schema. DreamWeaver will continue unaffected:', err);
  }

  // Graceful column migrations for DreamX verification_type
  try {
    dbInstance.exec("ALTER TABLE dreamx_profiles ADD COLUMN verification_type TEXT DEFAULT 'none';");
  } catch {
    // verification_type already exists
  }
  try {
    dbInstance.exec("ALTER TABLE dreamx_user_profile ADD COLUMN verification_type TEXT DEFAULT 'none';");
  } catch {
    // verification_type already exists
  }
  }

  return dbInstance;
}
