import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { markConversationRead } from '@/lib/dreamx/dm';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDatabase();
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: conversationId } = await params;
    const { messageRowid } = await req.json();

    if (typeof messageRowid !== 'number') {
      return NextResponse.json({ error: 'messageRowid must be a number' }, { status: 400 });
    }

    await markConversationRead({
      conversationId,
      userId: user.id,
      messageRowid
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to mark read:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
