import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, closeDatabase, reconnectDatabase, getDbPath } from '@/lib/db';
import { getCrowdState, upsertCrowdState, getCrowdEngagement, upsertCrowdEngagement, recordAnalyticsStep } from './crowd';
import { getProfiles, savePost, toggleLike } from './db';
import { createSimulationSnapshot, restoreSimulationSnapshot, getSnapshotsDir } from './snapshots';
import { resumeSimulation } from './simulation';

describe('DreamX Core/Crowd Isolation & Foundation', () => {
  const prodDbPath = path.resolve(process.cwd(), 'data', 'app.db');
  let originalProdHash: string | null = null;

  beforeEach(() => {
    expect(process.env.NODE_ENV).toBe('test');
    
    if (fs.existsSync(prodDbPath)) {
      originalProdHash = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
    }

    expect(getDbPath()).toContain('data/test/app.db');
    
    closeDatabase();
    if (fs.existsSync(getDbPath())) fs.unlinkSync(getDbPath());
    if (fs.existsSync(`${getDbPath()}-wal`)) fs.unlinkSync(`${getDbPath()}-wal`);
    if (fs.existsSync(`${getDbPath()}-shm`)) fs.unlinkSync(`${getDbPath()}-shm`);
    
    const snapDir = getSnapshotsDir();
    for (const file of fs.readdirSync(snapDir)) {
      fs.unlinkSync(path.join(snapDir, file));
    }

    reconnectDatabase();
  });

  afterEach(() => {
    if (originalProdHash !== null && fs.existsSync(prodDbPath)) {
      const currentProdHash = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
      expect(currentProdHash).toBe(originalProdHash);
    }
    closeDatabase();
    resumeSimulation(); 
  });

  it('1 & 2. Creating/updating crowd metrics does not create Core Agent rows or increase agents', async () => {
    const initialProfiles = await getProfiles();
    const initialCount = initialProfiles.length;

    await upsertCrowdState({
      actor_id: 'fake_crowd_target',
      followers_count: 15000000,
      sentiment_score: 0.8,
      momentum: 2.5,
      influence_score: 95,
      updated_at: Date.now()
    });

    const state = await getCrowdState('fake_crowd_target');
    expect(state).toBeDefined();
    expect(state?.followers_count).toBe(15000000);

    const afterProfiles = await getProfiles();
    expect(afterProfiles.length).toBe(initialCount);
  });

  it('3. Existing Core Agent likes/follows remain independent from crowd counts', async () => {
    const post = await savePost({ author_id: 'core_a', author_type: 'ai', content: 'Hello Core' });
    
    // Core interaction
    await toggleLike(post.id, 'core_b', 'ai');

    // Crowd interaction
    await upsertCrowdEngagement({
      post_id: post.id,
      crowd_likes: 500000,
      crowd_reposts: 20000,
      impressions: 1200000,
      engagement_velocity: 15.5,
      updated_at: Date.now()
    });

    const engagement = await getCrowdEngagement(post.id);
    expect(engagement?.crowd_likes).toBe(500000);

    // Verify Core likes count is just 1
    const db = getDatabase();
    const coreLikes = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_likes WHERE post_id = ?', [post.id]);
    
    expect(coreLikes?.count).toBe(1);
    expect(coreLikes?.count).not.toBe(500001); // Explicitly unmerged
  });

  it('4 & 5. Snapshot restoration restores crowd state correctly', async () => {
    // State A
    await upsertCrowdState({
      actor_id: 'hero',
      followers_count: 1000,
      sentiment_score: 0.1,
      momentum: 0,
      influence_score: 5,
      updated_at: Date.now()
    });

    const snap = await createSimulationSnapshot('State A');

    // Mutate to State B
    await upsertCrowdState({
      actor_id: 'hero',
      followers_count: 9999999,
      sentiment_score: -0.9,
      momentum: -10,
      influence_score: 100,
      updated_at: Date.now()
    });

    let state = await getCrowdState('hero');
    expect(state?.followers_count).toBe(9999999);

    // Restore to State A
    await restoreSimulationSnapshot(snap.snapshot_id);

    state = await getCrowdState('hero');
    expect(state?.followers_count).toBe(1000); // Back to State A
    expect(state?.sentiment_score).toBe(0.1);
  });

  it('Records analytics step correctly without blowing up', async () => {
    await recordAnalyticsStep({
      step_id: 'step-001',
      type: 'normal',
      started_at: Date.now(),
      duration_ms: 125,
      actions_taken: 5,
      created_at: Date.now()
    });

    const db = getDatabase();
    const step = await db.queryFirst<any>('SELECT * FROM dreamx_analytics_steps WHERE step_id = ?', ['step-001']);
    expect(step).toBeDefined();
    expect(step.duration_ms).toBe(125);
  });
});
