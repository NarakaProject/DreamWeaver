import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (sessionId) {
      const messages = await db.getMessages(sessionId);
      return NextResponse.json({ messages });
    }

    const sessions = await db.getSessions();
    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const { action, session, message } = body;

    if (action === 'saveSession' && session) {
      await db.saveSession(session);
      return NextResponse.json({ success: true, session });
    }

    if (action === 'saveMessage' && message) {
      await db.saveMessage(message);
      return NextResponse.json({ success: true, message });
    }

    return NextResponse.json({ error: 'Invalid action or payload' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save session data' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDatabase();
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const messageId = req.nextUrl.searchParams.get('messageId');

    if (messageId) {
      await db.deleteMessage(messageId);
      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    if (sessionId) {
      await db.deleteSession(sessionId);
      return NextResponse.json({ success: true, deletedSessionId: sessionId });
    }

    return NextResponse.json({ error: 'Missing sessionId or messageId parameter' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}
