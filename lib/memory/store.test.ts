import { describe, it, expect, beforeEach } from 'vitest';
import { addMemory, getMemoriesForSession, searchMemories, scoreMemories, clearMemories, tokenizeQuery, MemoryEntry } from './store';
import { POST as chatPOST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import * as providerRouter from '@/lib/ai/provider-router';
import { getDatabase } from '@/lib/db';

vi.mock('@/lib/ai/provider-router', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/ai/provider-router')>();
  return {
    ...mod,
    routeChatStream: vi.fn(() => new Response('Mock stream')),
  };
});
import { shouldSummarize, generateHeuristicSummary, summarizeTurnChunk } from './summarizer';

describe('Episodic Long-Term Memory (ELTM) Engine', () => {
  const sessionId = 'test_session_eltm_123';

  beforeEach(async () => {
    await clearMemories(sessionId);
  });

  it('tokenizes queries accurately filtering common stop words', () => {
    const tokens = tokenizeQuery('Do you remember the wooden trinket I showed you?');
    expect(tokens).toContain('wooden');
    expect(tokens).toContain('trinket');
    expect(tokens).not.toContain('remember');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('you');
  });

  it('adds and retrieves memories for a session', async () => {
    await addMemory({
      sessionId,
      turnNumber: 1,
      speaker: 'Player',
      content: 'I entered the dusty library looking for the Anbu scroll.',
    });

    await addMemory({
      sessionId,
      turnNumber: 2,
      speaker: 'Kakashi',
      content: 'Muzan mentioned a secret passage beneath the Konoha library.',
    });

    const memories = await getMemoriesForSession(sessionId);
    expect(memories).toHaveLength(2);
    expect(memories[1].content).toContain('secret passage');
  });

  it('performs keyword relevance scoring to retrieve top-K memories', async () => {
    await addMemory({
      sessionId,
      turnNumber: 2,
      speaker: 'Naruto',
      content: 'I showed Kakashi a strange wooden trinket found in the forest.',
    });

    await addMemory({
      sessionId,
      turnNumber: 5,
      speaker: 'Muzan',
      content: 'The ANBU guards are patrolling the eastern gate.',
    });

    const searchResults = await searchMemories(sessionId, 'wooden trinket', 5);
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].turnNumber).toBe(2);
    expect(searchResults[0].content).toContain('wooden trinket');
  });

  it('performs pure relevance scoring identically (TF-IDF weighting regression)', () => {
    const rawMemories: MemoryEntry[] = [
      { id: '1', sessionId: 's1', turnNumber: 1, speaker: 'Narrator', content: 'The silver amulet lay on the table.', keywords: ['amulet'], isSummary: false, timestamp: 0 },
      { id: '2', sessionId: 's1', turnNumber: 2, speaker: 'Player', content: 'I pick up the wooden trinket.', keywords: ['wooden', 'trinket'], isSummary: false, timestamp: 0 },
      { id: '3', sessionId: 's1', turnNumber: 3, speaker: 'Merchant', content: 'That wooden trinket is cursed!', keywords: ['wooden', 'trinket', 'cursed'], isSummary: true, timestamp: 0 },
      { id: '4', sessionId: 's1', turnNumber: 4, speaker: 'Trinket', content: 'I am a magical item.', keywords: [], isSummary: false, timestamp: 0 },
    ];

    // Query: "wooden trinket"
    // Tokens: "wooden", "trinket"
    // ID 1: 0 match
    // ID 2: content exact (+10), wooden token kw (+3), wooden token content (+2), trinket token kw (+3), trinket token content (+2) = 20
    // ID 3: content exact (+10), wooden token kw (+3), wooden token content (+2), trinket token kw (+3), trinket token content (+2), summary (+1.5) = 21.5
    // ID 4: Trinket speaker (+2)
    
    const results = scoreMemories(rawMemories, 'wooden trinket', 5);
    
    expect(results).toHaveLength(3); // IDs 3, 2, 4
    expect(results[0].id).toBe('3');
    expect(results[1].id).toBe('2');
    expect(results[2].id).toBe('4');
  });

  it('evaluates summarization intervals correctly', () => {
    expect(shouldSummarize(0)).toBe(false);
    expect(shouldSummarize(14)).toBe(false);
    expect(shouldSummarize(15)).toBe(true);
    expect(shouldSummarize(30)).toBe(true);
  });

  it('generates heuristic summaries and stores episodic checkpoint entries', async () => {
    const turns = [
      { turnNumber: 1, speaker: 'Player', content: 'I asked Muzan about the hidden seal.' },
      { turnNumber: 2, speaker: 'Muzan', content: '"The Golden Key is hidden beneath the Hokage monument."' },
    ];

    const summaryStr = generateHeuristicSummary(turns);
    expect(summaryStr).toContain('Muzan stated: "The Golden Key is hidden beneath the Hokage monument."');

    const summaryMem = await summarizeTurnChunk(sessionId, turns, 15);
    expect(summaryMem).not.toBeNull();
    expect(summaryMem?.isSummary).toBe(true);
  });

  describe('ORANGE: Server-Side ELTM Retrieval Integration', () => {
    it('ORANGE-1: Server Retrieves Persisted Memory directly from SQLite', async () => {
      // 0. Ensure session exists to satisfy foreign key constraint during chat stream simulation
      const db = getDatabase();
      db.saveSession({
        id: sessionId,
        world_id: 'default',
        character_id: 'default',
        title: 'Test Session',
        created_at: Date.now(),
        updated_at: Date.now()
      });

      // 1. Insert known memory directly into SQLite
      db.saveMemory({
        id: 'mem_123',
        session_id: sessionId,
        turn_number: 10,
        speaker: 'Admin',
        content: 'UNIQUE_LORE_SECRET: The moon is made of blue cheese.',
        keywords: 'moon,blue cheese',
        is_summary: 0,
        timestamp: Date.now()
      });

      // 2. Invoke Chat API server-side
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'x-gemini-api-key': 'test-key' },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: 'user', content: 'What is the moon made of? Mention the UNIQUE_LORE_SECRET.' }]
        })
      });

      await chatPOST(req);

      // 3. Assert the known memory content appears in the payload sent to the LLM
      expect(providerRouter.routeChatStream).toHaveBeenCalled();
      const mockCall = vi.mocked(providerRouter.routeChatStream).mock.calls[0];
      const payload = mockCall[0]; // first argument is the payload
      
      const payloadStr = JSON.stringify(payload);
      expect(payloadStr).toContain('UNIQUE_LORE_SECRET: The moon is made of blue cheese.');
    });

    it('ORANGE-3: Empty Memory State remains valid', async () => {
      const emptySessionId = 'empty_session_404';
      
      const db = getDatabase();
      db.saveSession({
        id: emptySessionId,
        world_id: 'default',
        character_id: 'default',
        title: 'Empty Session',
        created_at: Date.now(),
        updated_at: Date.now()
      });
      
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'x-gemini-api-key': 'test-key' },
        body: JSON.stringify({
          sessionId: emptySessionId,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);
      
      const mockCall = vi.mocked(providerRouter.routeChatStream).mock.calls[1];
      expect(mockCall).toBeDefined();
    });
  });
});
