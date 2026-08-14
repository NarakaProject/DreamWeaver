import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { aggregateNotifications } from '@/lib/dreamx/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();

    // 1. First, process any pending notifications
    try {
      await aggregateNotifications();
    } catch (aggErr) {
      console.warn('Background notification aggregation failed, returning existing state:', aggErr);
    }

    // 2. Identify the active human user
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // 3. Read-time aggregation of notifications
    const rows = await db.queryAll<any>(`
      SELECT 
        notification_type, 
        target_id, 
        MAX(created_at) as updated_at,
        MIN(is_read) as group_is_read, -- If ANY notification in the group is unread, the group is unread
        COUNT(*) as total_count,
        GROUP_CONCAT(actor_id) as actor_ids
      FROM dreamx_notifications
      WHERE recipient_id = ?
      GROUP BY notification_type, target_id
      ORDER BY updated_at DESC
      LIMIT 50
    `, [user.id]);

    // We also need an accurate unread count across ALL groups
    const unreadRow = await db.queryFirst<{ count: number }>(`
      SELECT COUNT(*) as count FROM (
        SELECT MIN(is_read) as group_is_read
        FROM dreamx_notifications
        WHERE recipient_id = ?
        GROUP BY notification_type, target_id
      ) WHERE group_is_read = 0
    `, [user.id]);

    // Format for the UI
    const notifications = rows.map(r => {
      // Split the actor_ids string and get unique actors
      const actors = Array.from(new Set(r.actor_ids.split(',')));
      return {
        id: `${r.notification_type}-${r.target_id}`, // Stable ID for React key
        type: r.notification_type,
        targetId: r.target_id,
        actors: (actors as string[]).slice(0, 3), // Return up to 3 actors
        additionalActorsCount: Math.max(0, actors.length - 3),
        totalEvents: r.total_count,
        isRead: r.group_is_read === 1,
        timestamp: r.updated_at
      };
    });

    // Populate actor metadata
    const actorIdsToFetch = new Set<string>();
    for (const notif of notifications) {
      for (const actor of notif.actors) {
        actorIdsToFetch.add(actor as string);
      }
    }

    let profilesMap: Record<string, { display_name: string, handle: string, avatar_url?: string }> = {};
    if (actorIdsToFetch.size > 0) {
      const ids = Array.from(actorIdsToFetch);
      const placeholders = ids.map(() => '?').join(',');
      
      const [aiProfiles, userProfiles] = await Promise.all([
        db.queryAll<any>(`SELECT id, display_name, handle, avatar_url FROM dreamx_profiles WHERE id IN (${placeholders})`, ids),
        db.queryAll<any>(`SELECT id, display_name, handle, avatar_url FROM dreamx_user_profile WHERE id IN (${placeholders})`, ids)
      ]);
      
      for (const p of [...aiProfiles, ...userProfiles]) {
        profilesMap[p.id] = { display_name: p.display_name, handle: p.handle, avatar_url: p.avatar_url };
      }
    }

    const populatedNotifications = notifications.map(notif => ({
      ...notif,
      actors: notif.actors.map((id: string) => profilesMap[id] || { display_name: 'Unknown', handle: '@unknown' })
    }));

    return NextResponse.json({ 
      notifications: populatedNotifications, 
      unreadCount: unreadRow?.count || 0 
    });
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
