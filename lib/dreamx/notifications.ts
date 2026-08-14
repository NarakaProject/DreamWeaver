import { getDatabase, assertDreamXAvailable } from '@/lib/db';
import type { DreamXPost } from './types';
import { getPost } from './db';

function getDreamXDb() {
  assertDreamXAvailable();
  return getDatabase();
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export async function aggregateNotifications(): Promise<void> {
  const db = getDreamXDb();

  // 1. Fetch cursor safely
  const cursorRow = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_notification_log_rowid\'');
  const lastRowid = parseInt(cursorRow?.value || '0', 10);

  // 2. Fetch new logs (batch of 1000)
  const events = await db.queryAll<any>(
    'SELECT rowid, * FROM dreamx_activity_log WHERE rowid > ? AND action_type IN (\'like\', \'repost\', \'reply\', \'follow\') ORDER BY rowid ASC LIMIT 1000',
    [lastRowid]
  );

  if (events.length === 0) return;

  // 3. Resolve Recipients
  // We need to look up post authors for 'like', 'repost', and 'reply'.
  // For 'follow', the target_post_id IS the recipient profile ID.
  const postIdsToFetch = new Set<string>();
  
  for (const ev of events) {
    if ((ev.action_type === 'like' || ev.action_type === 'repost' || ev.action_type === 'reply') && ev.target_post_id) {
      postIdsToFetch.add(ev.target_post_id);
    }
  }

  const postsMap = new Map<string, DreamXPost>();
  if (postIdsToFetch.size > 0) {
    // SQLite limits parameters, we should chunk the IN clause if it's too large,
    // but a batch of 1000 unique posts max is within the 999/32766 limit.
    const ids = Array.from(postIdsToFetch);
    const placeholders = ids.map(() => '?').join(',');
    const posts = await db.queryAll<any>(`SELECT * FROM dreamx_posts WHERE id IN (${placeholders})`, ids);
    for (const p of posts) {
      postsMap.set(p.id, p);
    }
  }

  // If a reply, we need to fetch the parent post to find its author (the recipient)
  const parentPostIdsToFetch = new Set<string>();
  for (const ev of events) {
    if (ev.action_type === 'reply' && ev.target_post_id) {
      const replyPost = postsMap.get(ev.target_post_id);
      if (replyPost?.reply_to_post_id) {
        parentPostIdsToFetch.add(replyPost.reply_to_post_id);
      }
    }
  }

  if (parentPostIdsToFetch.size > 0) {
    const ids = Array.from(parentPostIdsToFetch);
    const placeholders = ids.map(() => '?').join(',');
    const parentPosts = await db.queryAll<any>(`SELECT * FROM dreamx_posts WHERE id IN (${placeholders})`, ids);
    for (const p of parentPosts) {
      postsMap.set(p.id, p); // Merge into postsMap
    }
  }

  // 4. Construct Notification Statements
  const statements: Array<{ sql: string; args?: any[] }> = [];
  let maxProcessedRowid = lastRowid;

  for (const ev of events) {
    maxProcessedRowid = Math.max(maxProcessedRowid, ev.rowid);
    let recipientId: string | undefined = undefined;
    let targetId: string = ev.target_post_id || '';

    if (ev.action_type === 'follow') {
      recipientId = ev.target_post_id; // target_post_id stores followed_profile_id
      targetId = ev.target_post_id;
    } else if (ev.action_type === 'like' || ev.action_type === 'repost') {
      const post = postsMap.get(ev.target_post_id);
      if (post) recipientId = post.author_id;
    } else if (ev.action_type === 'reply') {
      const replyPost = postsMap.get(ev.target_post_id);
      if (replyPost?.reply_to_post_id) {
        const parentPost = postsMap.get(replyPost.reply_to_post_id);
        if (parentPost) recipientId = parentPost.author_id;
      }
    }

    // Rule: Suppress self-notifications
    if (recipientId && recipientId !== ev.actor_id && ev.actor_id !== '[DELETED]') {
      const notifId = generateId('dx-notif');
      statements.push({
        sql: `
          INSERT OR IGNORE INTO dreamx_notifications (
            id, recipient_id, notification_type, actor_id, target_id, source_log_id, is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `,
        args: [
          notifId,
          recipientId,
          ev.action_type,
          ev.actor_id,
          targetId,
          ev.id, // source_log_id
          ev.created_at
        ]
      });
    }
  }

  // 5. Update Cursor Atomically with Inserts
  statements.push({
    sql: `
      INSERT INTO dreamx_simulation_state (key, value, updated_at) 
      VALUES ('last_notification_log_rowid', ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    args: [maxProcessedRowid.toString(), Date.now()]
  });

  // 6. Execute Batch
  await db.batchExecute(statements);
}
