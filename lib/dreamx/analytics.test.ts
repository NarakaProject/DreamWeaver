import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAnalyticsData } from './analytics';
import { GET } from '@/app/api/dreamx/analytics/route';
import { getDatabase, closeDatabase, reconnectDatabase, getDbPath } from '@/lib/db';
import { saveProfile, savePost, toggleLike, toggleFollow } from './db';
import { computeCrowdBurst } from './crowd';
import fs from 'fs';
import path from 'path';

describe('DreamX Phase C1 - Analytics Engine', () => {
  const dbPath = getDbPath();
  const backupPath = path.join(path.dirname(dbPath), 'app.golden.db');

  beforeEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, dbPath);
    reconnectDatabase();
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    vi.restoreAllMocks();
  });

  it('Analytics endpoint handles empty state cleanly without fabricating data', async () => {
    const data = await getAnalyticsData();
    expect(data.summary.totalBursts).toBe(0);
    expect(data.summary.totalActions).toBe(0);
    expect(data.summary.averageBurstDurationMs).toBe(0);
    expect(data.summary.latestBurstAt).toBeNull();
    
    expect(data.crowd.totalFollowers).toBe(0);
    expect(data.crowd.averageSentiment).toBe(0);
    expect(data.crowd.averageMomentum).toBe(0);
    expect(data.crowd.trackedActors).toBe(0);
    
    expect(data.engagement.totalImpressions).toBe(0);
    expect(data.engagement.totalLikes).toBe(0);
    expect(data.engagement.totalReposts).toBe(0);
    
    expect(data.recentBursts).toHaveLength(0);

    // Test API route
    const response = await GET();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.summary.totalBursts).toBe(0);
  });

  it('Analytics endpoint does not mutate simulation state or cursors', async () => {
    const db = getDatabase();
    await saveProfile({ id: 'prof_1', display_name: 'P1', handle: '@p1' });
    await toggleFollow('prof_1', 'human', 'user_a');
    await computeCrowdBurst();

    const cursorBefore = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    const logsBefore = await db.queryAll('SELECT * FROM dreamx_activity_log');
    const stepsBefore = await db.queryAll('SELECT * FROM dreamx_analytics_steps');

    // Call analytics multiple times
    await getAnalyticsData();
    await GET();
    await getAnalyticsData();

    const cursorAfter = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    const logsAfter = await db.queryAll('SELECT * FROM dreamx_activity_log');
    const stepsAfter = await db.queryAll('SELECT * FROM dreamx_analytics_steps');

    expect(cursorAfter?.value).toBe(cursorBefore?.value);
    expect(logsAfter.length).toBe(logsBefore.length);
    expect(stepsAfter.length).toBe(stepsBefore.length);
  });

  it('Returns valid data with populated DreamX state (Crowd, Engagement, Bursts)', async () => {
    await saveProfile({ id: 'prof_1', display_name: 'P1', handle: '@p1' });
    await savePost({ id: 'post_1', author_id: 'prof_1', author_type: 'human', content: 'hello' });
    
    // Setup specific time so we can assert on latestBurstAt
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Burst 1
    await computeCrowdBurst();

    vi.spyOn(Date, 'now').mockReturnValue(now + 1000);
    await toggleLike('post_1', 'user_a', 'human');
    await toggleLike('post_1', 'user_b', 'human');
    await toggleFollow('prof_1', 'human', 'user_a');
    
    // Burst 2
    await computeCrowdBurst();

    const data = await getAnalyticsData();

    // Summary assertions
    expect(data.summary.totalBursts).toBe(2);
    expect(data.summary.totalActions).toBe(4); // 1 post + 2 likes + 1 follow
    expect(data.summary.latestBurstAt).toBe(now + 1000);
    expect(data.summary.averageBurstDurationMs).toBeGreaterThanOrEqual(0);

    // Crowd assertions
    expect(data.crowd.trackedActors).toBe(3);
    expect(data.crowd.totalFollowers).toBe(1);

    // Engagement assertions
    expect(data.engagement.totalLikes).toBeGreaterThanOrEqual(0);
    expect(data.engagement.totalImpressions).toBeGreaterThanOrEqual(0);

    // History assertions
    expect(data.recentBursts).toHaveLength(2);
    // Ordered by DESC
    expect(data.recentBursts[0].created_at).toBe(now + 1000);
    expect(data.recentBursts[1].created_at).toBe(now);
  });

  it('Database errors are handled correctly by the API route', async () => {
    const db = getDatabase();
    // Intentionally corrupt the schema to force a DB error
    await db.execute('DROP TABLE dreamx_crowd_state');

    const response = await GET();
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/no such table: dreamx_crowd_state/);
  });
});
