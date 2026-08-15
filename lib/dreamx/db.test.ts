import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('DreamX Database Schema Migration Comprehensive Audit', () => {
  let testDir: string;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary directory for isolated test database
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamx-audit-test-'));
    
    // Mock process.cwd() so lib/db/index.ts uses testDir/data/app.db
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    
    const dataDir = path.join(testDir, 'data', 'test');
    fs.mkdirSync(dataDir, { recursive: true });
    testDbPath = path.join(dataDir, 'app.db');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('preserves legacy posts, nested replies, and count metadata during migration', async () => {
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);

    testDb.exec(`
      CREATE TABLE dreamx_profiles (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        handle TEXT NOT NULL,
        avatar_url TEXT, bio TEXT, personality TEXT, traits TEXT, interests TEXT,
        speaking_style TEXT, beliefs TEXT, background TEXT, posting_guidelines TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      INSERT INTO dreamx_profiles (id, display_name, handle, created_at, updated_at)
      VALUES ('profA', 'Profile A', '@profA', 1000, 1000), ('profB', 'Profile B', '@profB', 1000, 1000);

      CREATE TABLE dreamx_posts (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        content TEXT NOT NULL,
        reply_to_post_id TEXT,
        likes_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES dreamx_profiles(id)
      );

      INSERT INTO dreamx_posts (id, profile_id, content, reply_to_post_id, likes_count, reposts_count, created_at)
      VALUES 
        ('postA', 'profA', 'Root post content', NULL, 12, 4, 1000),
        ('postB', 'profB', 'Reply to postA', 'postA', 3, 0, 2000),
        ('postC', 'profA', 'Nested reply to postB', 'postB', 1, 1, 3000);
    `);
    testDb.close();

    // Trigger migration via getDatabase()
    const { getDatabase } = await import('../db/index');
    const db = getDatabase();

    // 1. Verify schema is v0.2 actor model
    const tableInfo = await db.queryAll<any>("PRAGMA table_info(dreamx_posts);");
    const colNames = tableInfo.map(c => c.name);
    expect(colNames).not.toContain('profile_id');
    expect(colNames).toContain('author_id');
    expect(colNames).toContain('author_type');

    // 2. Verify legacy row preservation
    const posts = await db.queryAll<any>("SELECT * FROM dreamx_posts ORDER BY created_at ASC");
    expect(posts).toHaveLength(3);

    expect(posts[0].id).toBe('postA');
    expect(posts[0].author_id).toBe('profA');
    expect(posts[0].author_type).toBe('ai');
    expect(posts[0].reply_to_post_id).toBeNull();
    expect(posts[0].likes_count).toBe(12);
    expect(posts[0].reposts_count).toBe(4);

    // 3. Verify reply relationships (postA -> postB -> postC)
    expect(posts[1].id).toBe('postB');
    expect(posts[1].reply_to_post_id).toBe('postA');
    expect(posts[1].author_id).toBe('profB');

    expect(posts[2].id).toBe('postC');
    expect(posts[2].reply_to_post_id).toBe('postB');

    // 4. Verify zero foreign keys on dreamx_posts
    const fkInfo = await db.queryAll<any>("PRAGMA foreign_key_list(dreamx_posts);");
    expect(fkInfo).toHaveLength(0);
  });

  it('is idempotent and safe when executed multiple times', async () => {
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);
    testDb.exec(`
      CREATE TABLE dreamx_posts (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, content TEXT NOT NULL,
        reply_to_post_id TEXT, likes_count INTEGER DEFAULT 0, reposts_count INTEGER DEFAULT 0, created_at INTEGER NOT NULL
      );
      INSERT INTO dreamx_posts (id, profile_id, content, created_at) VALUES ('post1', 'prof1', 'Test', 100);
    `);
    testDb.close();

    const { getDatabase } = await import('../db/index');
    
    // First init - runs migration
    const db1 = getDatabase();
    const rows1 = await db1.queryAll<any>("SELECT * FROM dreamx_posts");
    expect(rows1[0].author_id).toBe('prof1');

    // Reset module cache and simulate app restart
    vi.resetModules();
    const { getDatabase: getDatabase2 } = await import('../db/index');
    const db2 = getDatabase2();
    
    const rows2 = await db2.queryAll<any>("SELECT * FROM dreamx_posts");
    expect(rows2).toHaveLength(1);
    expect(rows2[0].author_id).toBe('prof1');
    expect(rows2[0].author_type).toBe('ai');
  });

  it('supports all savePost insert paths (human, AI, human reply, AI reply) and enforces deduplication correctly', async () => {
    const { savePost, getUserProfile, saveUserProfile, saveProfile } = await import('./db');
    
    // Scrape/setup profiles
    const human = await saveUserProfile({ display_name: 'Human User', handle: '@human_user' });
    const aiProf = await saveProfile({ display_name: 'AI Agent', handle: '@ai_agent' });

    // 1. Human root post
    const hPost = await savePost({
      author_id: human.id,
      author_type: 'human',
      content: 'Hello from human'
    });
    expect(hPost.author_type).toBe('human');
    expect(hPost.author_id).toBe(human.id);

    // 2. AI root post
    const aiPost = await savePost({
      author_id: aiProf.id,
      author_type: 'ai',
      content: 'Hello from AI'
    });
    expect(aiPost.author_type).toBe('ai');
    expect(aiPost.author_id).toBe(aiProf.id);

    // 3. AI reply to human post
    const aiReply1 = await savePost({
      author_id: aiProf.id,
      author_type: 'ai',
      content: 'AI reply to human',
      reply_to_post_id: hPost.id
    });
    expect(aiReply1.reply_to_post_id).toBe(hPost.id);

    // 4. Duplicate AI reply to same post should be rejected by unique index
    await expect(savePost({
      author_id: aiProf.id,
      author_type: 'ai',
      content: 'Duplicate AI reply',
      reply_to_post_id: hPost.id
    })).rejects.toThrow();

    // 5. Multiple human replies to same post ARE allowed
    const hReply1 = await savePost({
      author_id: human.id,
      author_type: 'human',
      content: 'Human reply 1',
      reply_to_post_id: hPost.id
    });
    const hReply2 = await savePost({
      author_id: human.id,
      author_type: 'human',
      content: 'Human reply 2',
      reply_to_post_id: hPost.id
    });
    expect(hReply1.id).toBeDefined();
    expect(hReply2.id).toBeDefined();
  });

  it('prevents DreamX operations and surfaces clear error if migration fails without breaking DreamWeaver', async () => {
    // Setup corrupt table structure where INSERT into new table will fail (e.g. content NULL)
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);
    
    // Disable strict check to force invalid NULL into legacy table that violates dreamx_posts_new NOT NULL constraint
    testDb.exec(`
      CREATE TABLE dreamx_posts (
        id TEXT, profile_id TEXT, content TEXT, created_at INTEGER
      );
      INSERT INTO dreamx_posts VALUES ('post_corrupt', 'prof_1', NULL, 1000);
    `);
    testDb.close();

    const { getDatabase, assertDreamXAvailable } = await import('../db/index');
    
    // Core database initialization succeeds for DreamWeaver
    const db = getDatabase();
    expect(db).toBeDefined();

    // DreamWeaver core functions work unaffected
    await expect(db.getSessions()).resolves.toBeDefined();

    // DreamX availability check fails cleanly
    expect(() => assertDreamXAvailable()).toThrow(/DreamX Subsystem Unavailable/);

    // DreamX DAL functions fail cleanly with the DreamX error
    const { getFeedTree } = await import('./db');
    await expect(getFeedTree()).rejects.toThrow(/DreamX Subsystem Unavailable/);
  });
});

describe('Phase 0 - Adapter-Aware Schema Introspection', () => {
  let testDir: string;
  let testDbPath: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamx-schema-test-'));
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    const dataDir = path.join(testDir, 'data', 'test');
    fs.mkdirSync(dataDir, { recursive: true });
    testDbPath = path.join(dataDir, 'app.db');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('fresh DB -> initialization succeeds', async () => {
    const { getDatabase, assertDreamXAvailable } = await import('../db/index');
    const db = getDatabase();
    expect(() => assertDreamXAvailable()).not.toThrow();

    // Verify columns exist
    const profilesInfo = await db.queryAll<any>("PRAGMA table_info(dreamx_profiles)");
    expect(profilesInfo.map(c => c.name)).toContain('verification_type');
    expect(profilesInfo.map(c => c.name)).toContain('behavior_policy');
  });

  it('existing DB with column -> initialization succeeds (idempotent)', async () => {
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);
    testDb.exec(`
      CREATE TABLE dreamx_profiles (id TEXT PRIMARY KEY, verification_type TEXT, behavior_policy TEXT);
      CREATE TABLE dreamx_user_profile (id TEXT PRIMARY KEY, verification_type TEXT);
    `);
    testDb.close();

    const { getDatabase, assertDreamXAvailable } = await import('../db/index');
    getDatabase();
    expect(() => assertDreamXAvailable()).not.toThrow();
  });

  it('existing DB without column -> migration succeeds', async () => {
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);
    testDb.exec(`
      CREATE TABLE dreamx_profiles (id TEXT PRIMARY KEY);
      CREATE TABLE dreamx_user_profile (id TEXT PRIMARY KEY);
    `);
    testDb.close();

    const { getDatabase, assertDreamXAvailable } = await import('../db/index');
    const db = getDatabase();
    expect(() => assertDreamXAvailable()).not.toThrow();

    const profilesInfo = await db.queryAll<any>("PRAGMA table_info(dreamx_profiles)");
    expect(profilesInfo.map(c => c.name)).toContain('verification_type');
    expect(profilesInfo.map(c => c.name)).toContain('behavior_policy');
  });

  it('invalid migration SQL -> throws (caught and sets init error)', async () => {
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);
    // Create view instead of table so ALTER TABLE fails genuinely
    testDb.exec(`
      CREATE VIEW dreamx_profiles AS SELECT 1 AS id;
      CREATE TABLE dreamx_user_profile (id TEXT PRIMARY KEY);
    `);
    testDb.close();

    const { getDatabase, assertDreamXAvailable } = await import('../db/index');
    getDatabase();
    // The migration attempts to ALTER TABLE on a view, which throws a genuine error
    expect(() => assertDreamXAvailable()).toThrow(/DreamX Subsystem Unavailable/);
  });
});
