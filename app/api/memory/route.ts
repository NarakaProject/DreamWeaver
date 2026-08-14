import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { extractKeywords, scoreMemories, MemoryEntry } from '@/lib/memory/store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const query = searchParams.get('query');
    const topKParam = searchParams.get('topK');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const db = getDatabase();
    const dbMems = await db.getMemories(sessionId);
    const memories: MemoryEntry[] = dbMems.map((m) => ({
      id: m.id,
      sessionId: m.session_id,
      turnNumber: m.turn_number,
      speaker: m.speaker || 'Narrator',
      content: m.content,
      keywords: m.keywords ? m.keywords.split(',') : extractKeywords(m.content),
      isSummary: Boolean(m.is_summary),
      timestamp: m.timestamp,
    }));

    if (query) {
      const topK = topKParam ? parseInt(topKParam, 10) : 5;
      const results = scoreMemories(memories, query, topK);
      return NextResponse.json({ memories: results });
    }

    return NextResponse.json({ memories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, sessionId, turnNumber, speaker, content, keywords, isSummary, timestamp } = body;

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing sessionId or content' }, { status: 400 });
    }

    const db = getDatabase();
    const memId = id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const kwArray = Array.isArray(keywords) && keywords.length > 0 ? keywords : extractKeywords(content);
    const kwStr = kwArray.join(',');
    const ts = timestamp || Date.now();

    await db.saveMemory({
      id: memId,
      session_id: sessionId,
      turn_number: turnNumber || 1,
      speaker: speaker || 'Narrator',
      content: content,
      keywords: kwStr,
      is_summary: isSummary ? 1 : 0,
      timestamp: ts,
    });

    const memory: MemoryEntry = {
      id: memId,
      sessionId,
      turnNumber: turnNumber || 1,
      speaker: speaker || 'Narrator',
      content,
      keywords: kwArray,
      isSummary: Boolean(isSummary),
      timestamp: ts,
    };

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

    const db = getDatabase();

    if (clearAll === 'true') {
      await db.clearMemories(sessionId);
      return NextResponse.json({ success: true, cleared: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing memory ID' }, { status: 400 });
    }

    await db.deleteMemory(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete memory' }, { status: 500 });
  }
}
