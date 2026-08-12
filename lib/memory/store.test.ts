import { describe, it, expect, beforeEach } from 'vitest';
import { addMemory, getMemoriesForSession, searchMemories, clearMemories, tokenizeQuery } from './store';
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
});
