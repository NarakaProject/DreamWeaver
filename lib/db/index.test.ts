import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from './index';

describe('Database Adapter Persistence Tests', () => {
  const db = getDatabase();

  it('saveSession succeeds when system_instruction is absent', async () => {
    const sessionId = `test-sess-${Date.now()}`;
    await expect(
      db.saveSession({
        id: sessionId,
        title: 'Test Session Without System Instruction',
        world_id: 'test-world',
        character_id: 'test-character',
        created_at: Date.now(),
        updated_at: Date.now(),
      })
    ).resolves.not.toThrow();

    const sessions = await db.getSessions();
    const found = sessions.find((s) => s.id === sessionId);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Test Session Without System Instruction');
  });

  it('saveSessionWithMessage succeeds atomically when system_instruction is absent', async () => {
    const sessionId = `test-atomic-sess-${Date.now()}`;
    const msgId = `test-atomic-msg-${Date.now()}`;

    await expect(
      db.saveSessionWithMessage(
        {
          id: sessionId,
          title: 'Test Atomic Session',
          world_id: 'test-world',
          character_id: 'test-character',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: msgId,
          session_id: sessionId,
          role: 'model',
          content: 'Hello World opening narrative',
          speaker: 'Narrator',
          timestamp: Date.now(),
        },
        true
      )
    ).resolves.not.toThrow();

    const sessions = await db.getSessions();
    const foundSession = sessions.find((s) => s.id === sessionId);
    expect(foundSession).toBeDefined();

    const messages = await db.getMessages(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(msgId);
    expect(messages[0].content).toBe('Hello World opening narrative');

    const memories = await db.getMemories(sessionId);
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('Hello World opening narrative');
  });
});
