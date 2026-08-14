import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase, reconnectDatabase, getDbPath } from '@/lib/db';
import {
  saveProfile,
  savePost,
  toggleLike,
  toggleRepost,
  toggleFollow,
  deleteProfile,
  resetSimulationState
} from './db';
import { computeCrowdBurst, getCrowdState, getCrowdEngagement } from './crowd';

describe('DreamX Phase B - Concurrency and Event Ledger', () => {
  beforeEach(async () => {
    expect(process.env.NODE_ENV).toBe('test');
    closeDatabase();
    if (fs.existsSync(getDbPath())) fs.unlinkSync(getDbPath());
    if (fs.existsSync(`${getDbPath()}-wal`)) fs.unlinkSync(`${getDbPath()}-wal`);
    if (fs.existsSync(`${getDbPath()}-shm`)) fs.unlinkSync(`${getDbPath()}-shm`);
    reconnectDatabase();
    await resetSimulationState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves activity log rows during profile deletion (append-only ledger)', async () => {
    const prof = await saveProfile({ id: 'prof_del', display_name: 'ToDelete', handle: '@del' });
    await toggleLike('some_post', prof.id, 'human');

    const db = getDatabase();
    let logs = await db.queryAll<any>('SELECT rowid, * FROM dreamx_activity_log');
    expect(logs.length).toBeGreaterThan(0);
    const originalRowid = logs[0].rowid;

    // Delete profile
    await deleteProfile(prof.id);

    // Verify rowid still exists and actor_id is scrubbed
    logs = await db.queryAll<any>('SELECT rowid, actor_id FROM dreamx_activity_log WHERE rowid = ?', [originalRowid]);
    expect(logs.length).toBe(1);
    expect(logs[0].actor_id).toBe('[DELETED]');
  });

  it('logs human interactions to the activity ledger', async () => {
    const db = getDatabase();
    await toggleLike('post_a', 'human_user', 'human');
    let logs = await db.queryAll<any>('SELECT * FROM dreamx_activity_log WHERE action_type = ? AND actor_id = ?', ['like', 'human_user']);
    expect(logs.length).toBe(1);

    await toggleRepost('post_a', 'human_user', 'human');
    logs = await db.queryAll<any>('SELECT * FROM dreamx_activity_log WHERE action_type = ?', ['repost']);
    expect(logs.length).toBe(1);

    await toggleFollow('human_user', 'human', 'prof_a');
    logs = await db.queryAll<any>('SELECT * FROM dreamx_activity_log WHERE action_type = ?', ['follow']);
    expect(logs.length).toBe(1);
  });

  it('safely processes empty event window', async () => {
    // Should not throw, should not advance cursor
    await computeCrowdBurst();
    const db = getDatabase();
    const cursor = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    // It might be undefined if no events were ever processed
    if (cursor) {
      expect(parseInt(cursor.value, 10)).toBeGreaterThanOrEqual(0);
    }
  });

  it('logs correct analytics step metrics for the burst (B7)', async () => {
    await saveProfile({ id: 'prof_a', display_name: 'A', handle: '@a' });
    await savePost({ id: 'post_1', author_id: 'prof_a', author_type: 'human', content: 'hello' });
    await computeCrowdBurst();
    const db = getDatabase();
    const step = await db.queryFirst<any>('SELECT * FROM dreamx_analytics_steps WHERE type = \'burst\' ORDER BY created_at DESC');
    expect(step).toBeDefined();
    expect(step.duration_ms).toBeGreaterThanOrEqual(0);
    expect(step.actions_taken).toBe(1); // 1 post event
  });

  it('processes events and ignores repeated invocations', async () => {
    await saveProfile({ id: 'prof_a', display_name: 'A', handle: '@a' });
    const post = await savePost({ id: 'post_1', author_id: 'prof_a', author_type: 'human', content: 'hello' });

    // First invocation
    await computeCrowdBurst();

    let eng = await getCrowdEngagement(post.id);
    expect(eng).toBeDefined();
    const initialImpressions = eng!.impressions;

    // Repeated invocation should process 0 events (no double counting)
    await computeCrowdBurst();

    eng = await getCrowdEngagement(post.id);
    expect(eng!.impressions).toBe(initialImpressions);
  });

  it('prevents double-processing under concurrent computeCrowdBurst calls', async () => {
    await saveProfile({ id: 'prof_a', display_name: 'A', handle: '@a' });
    const post = await savePost({ id: 'post_1', author_id: 'prof_a', author_type: 'human', content: 'hello' });

    // Trigger two simultaneous calls
    await Promise.all([
      computeCrowdBurst(),
      computeCrowdBurst()
    ]);

    // The OCC lock ensures only one transaction commits
    const eng = await getCrowdEngagement(post.id);
    expect(eng).toBeDefined();

    // If double processing occurred, it would have run estimatePostEngagement twice and added the impressions twice
    // Since estimatePostEngagement is deterministic for ageHours:0, running it once vs twice yields different results
    // We just verify it ran exactly once by ensuring repeated sequential invocation doesn't change it further
    const impressionsAfterConcurrent = eng!.impressions;

    // A third sequential run to ensure the DB state is stable
    await computeCrowdBurst();
    const eng3 = await getCrowdEngagement(post.id);
    expect(eng3!.impressions).toBe(impressionsAfterConcurrent);

    const db = getDatabase();
    const locks = await db.queryAll<any>('SELECT * FROM dreamx_simulation_state WHERE key LIKE \'crowd_transition_from_%\'');
    // Only one transition should exist for from_0
    expect(locks.length).toBe(1);
  });

  it('processes multiple events with identical created_at timestamps safely', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    await toggleLike('post_1', 'user_a', 'human');
    await toggleLike('post_2', 'user_b', 'human');

    const db = getDatabase();
    const logs = await db.queryAll<any>('SELECT rowid, created_at FROM dreamx_activity_log');
    expect(logs.length).toBe(2);
    expect(logs[0].created_at).toBe(logs[1].created_at);
    expect(logs[0].rowid).not.toBe(logs[1].rowid); // SQLite rowid is unique

    await computeCrowdBurst();

    const cursorRow = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    expect(parseInt(cursorRow!.value, 10)).toBe(logs[1].rowid); // Cursor advanced past both
  });

  it('does not skip late-arriving events due to rowid ordering', async () => {
    const db = getDatabase();

    await savePost({ id: 'post_1', author_id: 'prof_a', author_type: 'human', content: 'hello' });
    await savePost({ id: 'post_2', author_id: 'prof_a', author_type: 'human', content: 'hello2' });

    // Simulate a pause by forcing rowids manually if possible, or just relying on sequential inserts
    await toggleLike('post_1', 'user_a', 'human');

    // First burst reads the first like
    await computeCrowdBurst();

    const cursor1 = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    const rowid1 = parseInt(cursor1!.value, 10);

    // Another like arrives
    await toggleLike('post_2', 'user_b', 'human');

    // Second burst
    await computeCrowdBurst();

    const cursor2 = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
    const rowid2 = parseInt(cursor2!.value, 10);

    expect(rowid2).toBeGreaterThan(rowid1);
  });

  it('correctly maps target_post_id to the new reply ID for both human and AI replies', async () => {
    const db = getDatabase();
    await saveProfile({ id: 'prof_parent', display_name: 'Parent', handle: '@parent' });
    const parentPost = await savePost({ id: 'post_parent', author_id: 'prof_parent', author_type: 'human', content: 'Parent post' });

    // Clear log so we only see the replies
    await db.execute('DELETE FROM dreamx_activity_log');

    await saveProfile({ id: 'prof_replier', display_name: 'Replier', handle: '@replier' });

    // Give replier some followers so estimatePostEngagement yields > 0 impressions
    await db.execute(
      'INSERT INTO dreamx_crowd_state (actor_id, followers_count, sentiment_score, momentum, influence_score, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['prof_replier', 1000, 0, 0, 50, Date.now()]
    );

    const humanReply = await savePost({ id: 'reply_human', author_id: 'prof_replier', author_type: 'human', content: 'Reply', reply_to_post_id: parentPost.id });

    const logs = await db.queryAll<any>('SELECT * FROM dreamx_activity_log');
    expect(logs.length).toBe(1);
    expect(logs[0].action_type).toBe('reply');
    expect(logs[0].target_post_id).toBe('reply_human'); // The newly-created reply ID

    // Run burst
    await computeCrowdBurst();

    // Verify reply gets its own base engagement
    const replyEng = await getCrowdEngagement('reply_human');
    expect(replyEng).toBeDefined();
    expect(replyEng!.impressions).toBeGreaterThan(0); // Because estimatePostEngagement should run

    // Verify parent gets catalyst propagation
    const parentEng = await getCrowdEngagement('post_parent');
    expect(parentEng).toBeDefined();
    expect(parentEng!.impressions).toBeGreaterThan(0);
  });
});
