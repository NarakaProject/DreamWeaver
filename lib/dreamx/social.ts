import { getDatabase } from '@/lib/db';
import type { ActorType } from './types';

export interface MassActionResult {
  requested: number;
  unique: number;
  created: number;
  skipped: number;
  failed: number;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function executeMassLike(actorIds: string[], postId: string, actorType: ActorType = 'human'): Promise<MassActionResult> {
  const uniqueActors = Array.from(new Set(actorIds));
  const result: MassActionResult = {
    requested: actorIds.length,
    unique: uniqueActors.length,
    created: 0,
    skipped: 0,
    failed: 0
  };

  if (uniqueActors.length === 0) return result;

  const dbAdapter = getDatabase();
  const CHUNK_SIZE = 250;
  
  for (let i = 0; i < uniqueActors.length; i += CHUNK_SIZE) {
    const chunk = uniqueActors.slice(i, i + CHUNK_SIZE);
    
    try {
      const statements: Array<{ sql: string; args?: any[] }> = [];
      const logIds: string[] = [];
      const now = Date.now();

      for (const actorId of chunk) {
        const likeId = generateId('dx-like');
        const logId = generateId('dx-log');
        logIds.push(logId);

        // 1. Insert like atomically ignoring duplicates
        statements.push({
          sql: `INSERT OR IGNORE INTO dreamx_likes (id, post_id, actor_id, actor_type, created_at) VALUES (?, ?, ?, ?, ?)`,
          args: [likeId, postId, actorId, actorType, now]
        });

        // 2. Insert log only if the log for this exact action doesn't already exist.
        // We use the same unique constraint logic to ensure parity.
        // Since both run in one batch, if like was ignored (already existed from before),
        // we shouldn't insert the log. Wait, if we use WHERE NOT EXISTS on dreamx_activity_log,
        // it checks if a log for this like already exists. But what if we just liked it in THIS transaction?
        // Actually, if we just liked it, the log does NOT exist, so it inserts!
        // What if the like existed BEFORE this transaction? The log might already exist.
        // But what if the user unliked and now likes again? A previous log exists, so this log won't insert!
        // That breaks "re-liking logs".
        // Instead, the log should ONLY insert if the like was inserted IN THIS TRANSACTION.
        // In SQLite, since we generate `likeId`, we can just check if `likeId` exists in `dreamx_likes`!
        // WAIT, `INSERT OR IGNORE` will ignore if the UNIQUE constraint (post_id, actor_id, actor_type) fails.
        // But we passed `likeId`. If it's ignored, `likeId` won't be in the DB!
        // So `WHERE EXISTS (SELECT 1 FROM dreamx_likes WHERE id = ?)` perfectly checks if THIS transaction inserted it!
        
        statements.push({
          sql: `
            INSERT INTO dreamx_activity_log (id, action_type, actor_id, target_post_id, reason, created_at)
            SELECT ?, 'like', ?, ?, 'Mass like', ?
            WHERE EXISTS (SELECT 1 FROM dreamx_likes WHERE id = ?)
          `,
          args: [logId, actorId, postId, now, likeId]
        });
      }

      await dbAdapter.batchExecute(statements);

      // Verify how many logs actually made it to the DB
      // We chunk the IN clause safely
      const placeholders = logIds.map(() => '?').join(',');
      const rows = await dbAdapter.queryAll<{ count: number }>(`
        SELECT COUNT(*) as count FROM dreamx_activity_log WHERE id IN (${placeholders})
      `, logIds);

      const chunkCreated = rows[0]?.count || 0;
      result.created += chunkCreated;
      result.skipped += (chunk.length - chunkCreated);
    } catch (err: any) {
      console.error('Mass like chunk error:', err);
      result.failed += chunk.length;
    }
  }

  return result;
}

export async function executeMassFollow(actorIds: string[], targetProfileId: string, actorType: ActorType = 'human'): Promise<MassActionResult> {
  const uniqueActors = Array.from(new Set(actorIds));
  const result: MassActionResult = {
    requested: actorIds.length,
    unique: uniqueActors.length,
    created: 0,
    skipped: 0,
    failed: 0
  };

  if (uniqueActors.length === 0) return result;

  const dbAdapter = getDatabase();
  const CHUNK_SIZE = 250;
  
  for (let i = 0; i < uniqueActors.length; i += CHUNK_SIZE) {
    const chunk = uniqueActors.slice(i, i + CHUNK_SIZE);
    
    try {
      const statements: Array<{ sql: string; args?: any[] }> = [];
      const logIds: string[] = [];
      const now = Date.now();

      for (const actorId of chunk) {
        const followId = generateId('dx-follow');
        const logId = generateId('dx-log');
        logIds.push(logId);

        statements.push({
          sql: `INSERT OR IGNORE INTO dreamx_follows (id, follower_id, follower_type, followed_profile_id, created_at) VALUES (?, ?, ?, ?, ?)`,
          args: [followId, actorId, actorType, targetProfileId, now]
        });

        statements.push({
          sql: `
            INSERT INTO dreamx_activity_log (id, action_type, actor_id, target_post_id, reason, created_at)
            SELECT ?, 'follow', ?, ?, 'Mass follow', ?
            WHERE EXISTS (SELECT 1 FROM dreamx_follows WHERE id = ?)
          `,
          args: [logId, actorId, targetProfileId, now, followId]
        });
      }

      await dbAdapter.batchExecute(statements);

      const placeholders = logIds.map(() => '?').join(',');
      const rows = await dbAdapter.queryAll<{ count: number }>(`
        SELECT COUNT(*) as count FROM dreamx_activity_log WHERE id IN (${placeholders})
      `, logIds);

      const chunkCreated = rows[0]?.count || 0;
      result.created += chunkCreated;
      result.skipped += (chunk.length - chunkCreated);
    } catch (err: any) {
      console.error('Mass follow chunk error:', err);
      result.failed += chunk.length;
    }
  }

  return result;
}
