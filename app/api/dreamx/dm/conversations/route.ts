import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getOrCreateConversation } from '@/lib/dreamx/dm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDatabase();
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conversations = await db.queryAll<any>(`
      SELECT c.*, p.last_read_message_rowid, p.joined_at,
             (SELECT COUNT(*) FROM dreamx_messages m WHERE m.conversation_id = c.id AND m.rowid > p.last_read_message_rowid) as unread_count
      FROM dreamx_conversations c
      JOIN dreamx_conversation_participants p ON c.id = p.conversation_id
      WHERE p.user_id = ?
      ORDER BY c.updated_at DESC
    `, [user.id]);

    // Enhance with other participants' details
    for (const conv of conversations) {
      const parts = await db.queryAll<{ user_id: string }>(
        'SELECT user_id FROM dreamx_conversation_participants WHERE conversation_id = ?', 
        [conv.id]
      );
      
      const otherId = parts.find(p => p.user_id !== user.id)?.user_id;
      if (otherId) {
        const otherProfile = await db.queryFirst<{ display_name: string, handle: string, avatar_url: string }>(
          `SELECT display_name, handle, avatar_url FROM (
             SELECT display_name, handle, avatar_url FROM dreamx_user_profile WHERE id = ?
             UNION
             SELECT display_name, handle, avatar_url FROM dreamx_profiles WHERE id = ?
           )`, [otherId, otherId]
        );
        conv.other_participant = { id: otherId, ...otherProfile };
      }
      
      if (conv.last_message_id) {
        conv.last_message = await db.queryFirst('SELECT * FROM dreamx_messages WHERE id = ?', [conv.last_message_id]);
      }
    }

    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error('Failed to list conversations:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDatabase();
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await req.json();
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });

    const conversation = await getOrCreateConversation(user.id, targetUserId);
    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error('Failed to get/create conversation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
