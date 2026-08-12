import { NextRequest, NextResponse } from 'next/server';
import { addMemory, getMemoriesForSession, searchMemories, deleteMemory, clearMemories } from '@/lib/memory/store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const query = searchParams.get('query');
    const topKParam = searchParams.get('topK');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    if (query) {
      const topK = topKParam ? parseInt(topKParam, 10) : 5;
      const results = await searchMemories(sessionId, query, topK);
      return NextResponse.json({ memories: results });
    }

    const memories = await getMemoriesForSession(sessionId);
    return NextResponse.json({ memories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, turnNumber, speaker, content, keywords, isSummary } = body;

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing sessionId or content' }, { status: 400 });
    }

    const memory = await addMemory({
      sessionId,
      turnNumber: turnNumber || 1,
      speaker: speaker || 'Narrator',
      content,
      keywords,
      isSummary: Boolean(isSummary),
    });

    return NextResponse.json({ success: true, memory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add memory' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    if (clearAll === 'true') {
      await clearMemories(sessionId);
      return NextResponse.json({ success: true, cleared: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });
    }

    await deleteMemory(sessionId, id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete memory' }, { status: 500 });
  }
}
