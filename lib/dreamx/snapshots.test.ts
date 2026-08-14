import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, closeDatabase, reconnectDatabase, getDbPath } from '@/lib/db';
import { createSimulationSnapshot, restoreSimulationSnapshot, getSnapshots, deleteSnapshot, getSnapshotsDir } from './snapshots';
import { savePost } from './db';
import { runAutonomousActivityStep, pauseSimulation, resumeSimulation, getRunToken, invalidateSimulationToken } from './simulation';

describe('DreamX Snapshot & Rollback Architecture', () => {
  const prodDbPath = path.resolve(process.cwd(), 'data', 'app.db');
  let originalProdHash: string | null = null;

  beforeEach(() => {
    // 1. CRITICAL: Assert Production Non-Interference
    expect(process.env.NODE_ENV).toBe('test');
    
    // Hash production DB if it exists
    if (fs.existsSync(prodDbPath)) {
      originalProdHash = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
    }

    // Ensure we are operating in data/test
    expect(getDbPath()).toContain('data/test/app.db');
    
    // Clear test db before each test
    closeDatabase();
    if (fs.existsSync(getDbPath())) fs.unlinkSync(getDbPath());
    if (fs.existsSync(`${getDbPath()}-wal`)) fs.unlinkSync(`${getDbPath()}-wal`);
    if (fs.existsSync(`${getDbPath()}-shm`)) fs.unlinkSync(`${getDbPath()}-shm`);
    
    // Clear snapshots dir
    const snapDir = getSnapshotsDir();
    for (const file of fs.readdirSync(snapDir)) {
      fs.unlinkSync(path.join(snapDir, file));
    }

    reconnectDatabase();
  });

  afterEach(() => {
    // Double check prod DB wasn't touched
    if (originalProdHash !== null && fs.existsSync(prodDbPath)) {
      const currentProdHash = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
      expect(currentProdHash).toBe(originalProdHash);
    } else if (originalProdHash === null) {
      expect(fs.existsSync(prodDbPath)).toBe(false);
    }

    closeDatabase();
    resumeSimulation(); // Reset simulation paused state
    vi.restoreAllMocks(); // Ensure no mock leaks!
  });

  it('H. Production DB Non-Interference (CRITICAL)', () => {
    expect(getDbPath()).not.toBe(prodDbPath);
  });

  it('B. Snapshot Read-Only Validation & Metadata Integrity', async () => {
    await savePost({ author_id: 'test_author', author_type: 'human', content: 'test content' });
    
    const snapMeta = await createSimulationSnapshot('Test Snapshot');
    
    expect(snapMeta.snapshot_id).toMatch(/^snap_/);
    expect(snapMeta.label).toBe('Test Snapshot');
    expect(snapMeta.post_count).toBe(1);
    
    const snapPath = path.join(getSnapshotsDir(), `${snapMeta.snapshot_id}.db`);
    expect(fs.existsSync(snapPath)).toBe(true);
    
    const currentHash = crypto.createHash('sha256').update(fs.readFileSync(snapPath)).digest('hex');
    expect(currentHash).toBe(snapMeta.database_hash_sha256);

    // Assert sidecar isolation
    expect(fs.existsSync(`${snapPath}-wal`)).toBe(false);
    expect(fs.existsSync(`${snapPath}-shm`)).toBe(false);

    // Tamper with hash and assert rejection
    const metaPath = path.join(getSnapshotsDir(), `${snapMeta.snapshot_id}.json`);
    const tamperedMeta = { ...snapMeta, database_hash_sha256: 'tampered' };
    fs.writeFileSync(metaPath, JSON.stringify(tamperedMeta));

    await expect(restoreSimulationSnapshot(snapMeta.snapshot_id)).rejects.toThrow('Hash mismatch');
  });

  it('A. Native Restore Only (No LibSQL Fallback)', async () => {
    await savePost({ author_id: 'a', author_type: 'human', content: '1' });
    const snapMeta = await createSimulationSnapshot('Safe Point');
    
    // Mutate the live DB to check if it's recovered or skipped
    await savePost({ author_id: 'a', author_type: 'human', content: '2' });

    // We will spy on fs.renameSync, and AFTER it renames the validated file to app.db, 
    // we corrupt app.db so reconnectDatabase will fail native init.
    const originalRenameSync = fs.renameSync;
    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      originalRenameSync(oldPath, newPath);
      if (oldPath.toString().includes('restore.tmp') && newPath.toString().includes('app.db')) {
        fs.writeFileSync(newPath, 'THIS IS NOT A SQLITE DATABASE');
      }
    });

    await expect(restoreSimulationSnapshot(snapMeta.snapshot_id))
      .rejects.toThrow(/Restored database connection failed, but emergency recovery succeeded/);
  });

  it('C. Invalid Snapshot IDs', async () => {
    await expect(restoreSimulationSnapshot('../app')).rejects.toThrow('Invalid snapshot ID');
    await expect(restoreSimulationSnapshot('/absolute/path')).rejects.toThrow('Invalid snapshot ID');
  });

  it('E. Emergency Recovery (Restore Failure)', async () => {
    await savePost({ author_id: 'test_author', author_type: 'human', content: 'Base state' });
    const snapMeta = await createSimulationSnapshot('Safe Point');
    
    // Mutate live DB (this is the state that emergency backup will capture)
    await savePost({ author_id: 'test_author', author_type: 'human', content: 'Mutated state' });
    
    // Mock renameSync to fail the atomic replacement
    const originalRenameSync = fs.renameSync;
    const renameMock = vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      if (oldPath.toString().includes('restore.tmp')) {
        throw new Error('Mocked atomic rename failure');
      }
      return originalRenameSync(oldPath, newPath);
    });

    // The restore will fail at the rename step, then emergency recovery will restore the emergency backup
    await expect(restoreSimulationSnapshot(snapMeta.snapshot_id))
      .rejects.toThrow('Rollback failed, but emergency recovery succeeded. Original error: Mocked atomic rename failure');
    
    // Verify the mutated state was recovered!
    const db = (getDatabase() as any).client || (getDatabase() as any).db;
    const posts = db.prepare('SELECT content FROM dreamx_posts').all();
    expect(posts.length).toBe(2);
    expect(posts[1].content).toBe('Mutated state');
  });

  it('F. No Schema Migration During Restore', async () => {
    await savePost({ author_id: 'a', author_type: 'human', content: '1' });
    const snapMeta = await createSimulationSnapshot('Snap 1');
    
    // We can spy on `Database.prototype.exec` to ensure ALTER TABLE is never called during restore.
    const Database = require('better-sqlite3');
    const execSpy = vi.spyOn(Database.prototype, 'exec');
    
    await restoreSimulationSnapshot(snapMeta.snapshot_id);
    
    const alterCalls = execSpy.mock.calls.filter((call: any) => call[0].toString().includes('ALTER TABLE'));
    expect(alterCalls.length).toBe(0);
  });

  it('G. Ghost Write Race', async () => {
    const originalToken = getRunToken();
    
    pauseSimulation();
    invalidateSimulationToken();
    
    await expect(savePost({ author_id: 'ai_1', author_type: 'ai', content: 'Ghost post' }, originalToken))
      .rejects.toThrow('Ghost write aborted: Stale simulation generation');
  });

  it('D. Restore Determinism', async () => {
    await savePost({ author_id: 'a', author_type: 'human', content: '1' });
    const snap1 = await createSimulationSnapshot('Snap 1');
    
    await savePost({ author_id: 'a', author_type: 'human', content: '2' });
    const snap2 = await createSimulationSnapshot('Snap 2');
    
    await restoreSimulationSnapshot(snap1.snapshot_id);
    const db = (getDatabase() as any).client || (getDatabase() as any).db;
    let posts = db.prepare('SELECT content FROM dreamx_posts').all();
    expect(posts.length).toBe(1);
    expect(posts[0].content).toBe('1');
    
    await restoreSimulationSnapshot(snap2.snapshot_id);
    const db2 = (getDatabase() as any).client || (getDatabase() as any).db;
    posts = db2.prepare('SELECT content FROM dreamx_posts').all();
    expect(posts.length).toBe(2);
    expect(posts[1].content).toBe('2');
  });

});
