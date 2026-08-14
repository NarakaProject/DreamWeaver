import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDatabase } from '@/lib/db';
import { resetSimulationState, saveProfile, saveUserProfile, savePost, logActivity, deleteProfile } from './db';
import { executeMassLike, executeMassFollow } from './social';
import { aggregateNotifications } from './notifications';
import { computeCrowdBurst } from './crowd';

describe('DreamX Phase C3 - Notification Engine', () => {
  beforeEach(async () => {
    const db = getDatabase();
    await resetSimulationState();
    
    // Create base actors
    await saveUserProfile({ id: 'user_1', display_name: 'Human User', handle: '@user1' });
    await saveProfile({ id: 'prof_A', display_name: 'AI Alice', handle: '@alice' });
    await saveProfile({ id: 'prof_B', display_name: 'AI Bob', handle: '@bob' });

    await db.execute('INSERT OR IGNORE INTO dreamx_crowd_state (actor_id, followers_count, influence_score, updated_at) VALUES (?, ?, ?, ?)', ['prof_A', 1000, 50, Date.now()]);
    await db.execute('INSERT OR IGNORE INTO dreamx_crowd_state (actor_id, followers_count, influence_score, updated_at) VALUES (?, ?, ?, ?)', ['prof_B', 1000, 50, Date.now()]);
  });

  it('1. notification-before-crowd & crowd-before-notification processing advance independently', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    
    // Simulate events
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_1' });
    await logActivity({ action_type: 'like', actor_id: 'prof_B', target_post_id: 'post_1' });

    // Path A: Notification then Crowd
    await aggregateNotifications();
    const notifsA = await db.queryAll<any>('SELECT * FROM dreamx_notifications');
    expect(notifsA.length).toBe(2);

    await computeCrowdBurst();
    const cursorA = await db.queryFirst<{value: string}>("SELECT value FROM dreamx_simulation_state WHERE key = 'last_crowd_log_rowid'");
    expect(parseInt(cursorA?.value || '0', 10)).toBeGreaterThan(0);

    // Reset
    await resetSimulationState();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_1' });
    
    // Path B: Crowd then Notification
    await computeCrowdBurst();
    await aggregateNotifications();
    const cursorB = await db.queryFirst<{value: string}>("SELECT value FROM dreamx_simulation_state WHERE key = 'last_crowd_log_rowid'");
    const notifsB = await db.queryAll<any>('SELECT * FROM dreamx_notifications');
    expect(parseInt(cursorB?.value || '0', 10)).toBeGreaterThan(0);
    expect(notifsB.length).toBe(1);
  });

  it('2. Repeated aggregation is perfectly idempotent', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_1' });
    
    await aggregateNotifications();
    const count1 = await db.queryFirst<{count: number}>('SELECT COUNT(*) as count FROM dreamx_notifications');
    
    await aggregateNotifications();
    await aggregateNotifications();
    const count2 = await db.queryFirst<{count: number}>('SELECT COUNT(*) as count FROM dreamx_notifications');
    
    expect(count1?.count).toBe(1);
    expect(count2?.count).toBe(1);
  });

  it('3. Concurrent notification aggregation does not duplicate', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_1' });
    
    await Promise.all([
      aggregateNotifications(),
      aggregateNotifications(),
      aggregateNotifications()
    ]);
    
    const count = await db.queryFirst<{count: number}>('SELECT COUNT(*) as count FROM dreamx_notifications');
    expect(count?.count).toBe(1);
  });

  it('4. Resolves recipient semantics for reply, repost, like, follow', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_parent', author_id: 'user_1', author_type: 'human', content: 'hello' });
    await savePost({ id: 'post_reply', author_id: 'prof_A', author_type: 'ai', content: 'replying', reply_to_post_id: 'post_parent' });
    
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_parent' });
    await logActivity({ action_type: 'repost', actor_id: 'prof_A', target_post_id: 'post_parent' });
    await logActivity({ action_type: 'reply', actor_id: 'prof_A', target_post_id: 'post_reply' });
    await logActivity({ action_type: 'follow', actor_id: 'prof_A', target_post_id: 'user_1' });
    
    await aggregateNotifications();
    const notifs = await db.queryAll<any>('SELECT * FROM dreamx_notifications ORDER BY notification_type ASC');
    
    expect(notifs.length).toBe(4);
    for (const n of notifs) {
      expect(n.recipient_id).toBe('user_1'); // all should target user_1
    }
  });

  it('5. Self-notification suppression works', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    
    await logActivity({ action_type: 'like', actor_id: 'user_1', target_post_id: 'post_1' }); // self like
    await logActivity({ action_type: 'follow', actor_id: 'user_1', target_post_id: 'user_1' }); // self follow
    
    await aggregateNotifications();
    const count = await db.queryFirst<{count: number}>('SELECT COUNT(*) as count FROM dreamx_notifications');
    expect(count?.count).toBe(0);
  });

  it('6. C2 mass-like and mass-follow notifications map correctly', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    
    await executeMassLike(['prof_A', 'prof_B'], 'post_1', 'ai');
    await executeMassFollow(['prof_A', 'prof_B'], 'user_1', 'ai');
    
    await aggregateNotifications();
    const likes = await db.queryFirst<{count: number}>("SELECT COUNT(*) as count FROM dreamx_notifications WHERE notification_type = 'like'");
    const follows = await db.queryFirst<{count: number}>("SELECT COUNT(*) as count FROM dreamx_notifications WHERE notification_type = 'follow'");
    
    expect(likes?.count).toBe(2);
    expect(follows?.count).toBe(2);
  });

  it('7. Survives privacy-scrubbed / deleted actors', async () => {
    const db = getDatabase();
    await savePost({ id: 'post_1', author_id: 'user_1', author_type: 'human', content: 'hello' });
    await logActivity({ action_type: 'like', actor_id: 'prof_A', target_post_id: 'post_1' });
    
    // delete profile scrubs actor_id to '[DELETED]'
    await deleteProfile('prof_A');
    
    await aggregateNotifications();
    const count = await db.queryFirst<{count: number}>('SELECT COUNT(*) as count FROM dreamx_notifications');
    expect(count?.count).toBe(0); // [DELETED] likes don't notify
  });
});
