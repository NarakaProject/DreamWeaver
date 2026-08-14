import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const db = getDatabase();

    // 1. Identify the active human user
    const user = await db.queryFirst<{ id: string }>('SELECT id FROM dreamx_user_profile LIMIT 1');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
    }

    // 2. Mark ALL notifications for this user as read
    await db.execute('UPDATE dreamx_notifications SET is_read = 1 WHERE recipient_id = ?', [user.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to mark notifications read:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
