import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('DreamX Database Schema Migration', () => {
  let testDir: string;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary directory for the test database
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamx-test-'));
    
    // Mock process.cwd() so lib/db/index.ts uses testDir/data/app.db
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    
    // Ensure data directory exists
    const dataDir = path.join(testDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    testDbPath = path.join(dataDir, 'app.db');
    
    // Initialize a raw better-sqlite3 instance to set up legacy schema
    const Database = require('better-sqlite3');
    const testDb = new Database(testDbPath);

    // Create the referenced table
    testDb.exec(`
      CREATE TABLE dreamx_profiles (
        id TEXT PRIMARY KEY
      )
    `);
    
    testDb.exec(`INSERT INTO dreamx_profiles (id) VALUES ('prof1')`);

    // Create the LEGACY schema
    testDb.exec(`
      CREATE TABLE dreamx_posts (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        content TEXT NOT NULL,
        reply_to_post_id TEXT,
        likes_count INTEGER DEFAULT 0,
        reposts_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES dreamx_profiles(id)
      )
    `);

    // Insert legacy data
    testDb.exec(`
      INSERT INTO dreamx_posts (id, profile_id, content, reply_to_post_id, likes_count, reposts_count, created_at)
      VALUES ('post1', 'prof1', 'Hello world', NULL, 5, 2, 1000)
    `);
    
    testDb.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up module cache to ensure getDatabase() runs fresh each time
    vi.resetModules();
    
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('detects legacy profile_id column and migrates to v0.2 actor model synchronously', async () => {
    // Dynamically import to ensure it picks up the mocked process.cwd()
    const { getDatabase } = await import('../db/index');
    
    // Calling getDatabase triggers the synchronous migration
    const db = getDatabase();
    
    // 1. Verify schema is updated
    const tableInfo = await db.queryAll<any>("PRAGMA table_info(dreamx_posts);");
    const colNames = tableInfo.map(c => c.name);
    
    expect(colNames).not.toContain('profile_id');
    expect(colNames).toContain('author_id');
    expect(colNames).toContain('author_type');
    
    // 2. Verify legacy row was mapped
    const rows = await db.queryAll<any>("SELECT * FROM dreamx_posts");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('post1');
    expect(rows[0].author_id).toBe('prof1');
    expect(rows[0].author_type).toBe('ai');
    expect(rows[0].content).toBe('Hello world');
    expect(rows[0].likes_count).toBe(5);
    expect(rows[0].reposts_count).toBe(2);
    
    // 3. Verify foreign keys to external tables are gone
    const fkInfo = await db.queryAll<any>("PRAGMA foreign_key_list(dreamx_posts);");
    expect(fkInfo).toHaveLength(0); // The new table should have no foreign keys
  });
});
