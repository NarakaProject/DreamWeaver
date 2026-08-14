import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { createDirectMessage } from '@/lib/dreamx/dm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDatabase();
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: conversationId } = await params;

    // Validate membership
    const participant = await db.queryFirst(
      'SELECT * FROM dreamx_conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, user.id]
    );
    if (!participant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Parse cursor
    const url = new URL(req.url);
    const cursor = parseInt(url.searchParams.get('cursor') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    // Fetch ordered by rowid ASC but if we want cursor-based pagination backward:
    // Actually, typical chat loads newest first (DESC), then reverses in UI.
    // Let's do: WHERE rowid < cursor (if cursor > 0) ORDER BY rowid DESC LIMIT X.
    let query = 'SELECT rowid, * FROM dreamx_messages WHERE conversation_id = ?';
    const queryArgs: any[] = [conversationId];

    if (cursor > 0) {
      query += ' AND rowid < ?';
      queryArgs.push(cursor);
    }
    
    query += ' ORDER BY rowid DESC LIMIT ?';
    queryArgs.push(limit);

    const messages = await db.queryAll<any>(query, queryArgs);
    
    // Reverse it to be chronological
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error('Failed to list messages:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDatabase();
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: conversationId } = await params;
    const { body } = await req.json();

    // Sender is STRICTLY the authenticated user
    const message = await createDirectMessage({
      conversationId,
      senderId: user.id,
      body
    });

    return NextResponse.json({ message });
  } catch (err: any) {
    console.error('Failed to send message:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
