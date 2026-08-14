import { describe, it, expect, beforeEach } from 'vitest';
import { getDreamXDb, resetSimulationState, saveProfile } from './db';
import { getOrCreateConversation, createDirectMessage, markConversationRead } from './dm';

describe('DreamX Phase C4 - DM Foundation', () => {
  beforeEach(async () => {
    await resetSimulationState();
    await saveProfile({ id: 'user_1', display_name: 'Human', handle: '@human' });
    await saveProfile({ id: 'prof_A', display_name: 'Alice', handle: '@alice' });
    await saveProfile({ id: 'prof_B', display_name: 'Bob', handle: '@bob' });
  });

  it('1. A can create conversation with B', async () => {
    const conv = await getOrCreateConversation('user_1', 'prof_A');
    expect(conv.id).toBe('dm::prof_A::user_1'); // sorted
  });

  it('2. Repeated A/B conversation creation returns the same conversation', async () => {
    const conv1 = await getOrCreateConversation('user_1', 'prof_A');
    const conv2 = await getOrCreateConversation('prof_A', 'user_1');
    expect(conv1.id).toBe(conv2.id);
  });

  it('3. Concurrent A/B creation returns exactly one conversation', async () => {
    const db = getDreamXDb();
    await Promise.all([
      getOrCreateConversation('user_1', 'prof_A'),
      getOrCreateConversation('user_1', 'prof_A'),
      getOrCreateConversation('prof_A', 'user_1')
    ]);
    const convs = await db.queryAll('SELECT * FROM dreamx_conversations');
    expect(convs.length).toBe(1);
  });

  it('4. A cannot send to a conversation where A is not a participant', async () => {
    const conv = await getOrCreateConversation('prof_A', 'prof_B');
    await expect(createDirectMessage({ conversationId: conv.id, senderId: 'user_1', body: 'hello' })).rejects.toThrow();
  });

  it('7. Self-conversation is rejected', async () => {
    await expect(getOrCreateConversation('user_1', 'user_1')).rejects.toThrow('Self-conversations are not permitted.');
  });

  it('10 & 11. Sender does not receive unread state from own message, but recipient does', async () => {
    const db = getDreamXDb();
    const conv = await getOrCreateConversation('user_1', 'prof_A');
    
    // user_1 sends a message
    const msg = await createDirectMessage({ conversationId: conv.id, senderId: 'user_1', body: 'hello alice' });
    
    const parts = await db.queryAll<any>('SELECT * FROM dreamx_conversation_participants WHERE conversation_id = ?', [conv.id]);
    const pUser1 = parts.find(p => p.user_id === 'user_1');
    const pAlice = parts.find(p => p.user_id === 'prof_A');
    
    // Sender read cursor should automatically advance to message rowid
    expect(pUser1.last_read_message_rowid).toBe(msg.rowid);
    
    // Recipient read cursor remains 0 (unread)
    expect(pAlice.last_read_message_rowid).toBe(0);
  });

  it('12 & 13. Mark-read clears unread state and is idempotent', async () => {
    const db = getDreamXDb();
    const conv = await getOrCreateConversation('user_1', 'prof_A');
    const msg = await createDirectMessage({ conversationId: conv.id, senderId: 'user_1', body: 'hello alice' });
    
    // Alice marks as read
    await markConversationRead({ conversationId: conv.id, userId: 'prof_A', messageRowid: msg.rowid });
    
    let pAlice = await db.queryFirst<any>('SELECT * FROM dreamx_conversation_participants WHERE conversation_id = ? AND user_id = ?', [conv.id, 'prof_A']);
    expect(pAlice.last_read_message_rowid).toBe(msg.rowid);
    
    // Mark read again with older rowid shouldn't reverse it (MAX logic)
    await markConversationRead({ conversationId: conv.id, userId: 'prof_A', messageRowid: msg.rowid - 1 });
    pAlice = await db.queryFirst<any>('SELECT * FROM dreamx_conversation_participants WHERE conversation_id = ? AND user_id = ?', [conv.id, 'prof_A']);
    expect(pAlice.last_read_message_rowid).toBe(msg.rowid);
  });

  it('Brutal Concurrency Test: 50 concurrent messages', async () => {
    const db = getDreamXDb();
    const conv = await getOrCreateConversation('user_1', 'prof_A');
    const N = 50;
    
    // Fire N messages concurrently interleaved
    const promises = [];
    for (let i = 0; i < N; i++) {
      const sender = i % 2 === 0 ? 'user_1' : 'prof_A';
      promises.push(createDirectMessage({ conversationId: conv.id, senderId: sender, body: `msg ${i}` }));
    }
    
    await Promise.all(promises);
    
    const messages = await db.queryAll<any>('SELECT rowid, * FROM dreamx_messages WHERE conversation_id = ? ORDER BY rowid ASC', [conv.id]);
    
    // exactly N messages
    expect(messages.length).toBe(N);
    
    // rowids are unique and deterministically ordered
    const rowids = messages.map(m => m.rowid);
    const uniqueRowids = new Set(rowids);
    expect(uniqueRowids.size).toBe(N);
    
    const maxRowid = Math.max(...rowids);
    const maxMessage = messages.find(m => m.rowid === maxRowid);
    
    // last_message_id === id WHERE rowid = MAX(rowid)
    const updatedConv = await db.queryFirst<any>('SELECT * FROM dreamx_conversations WHERE id = ?', [conv.id]);
    expect(updatedConv.last_message_id).toBe(maxMessage.id);
    
    // check participant cursors
    const parts = await db.queryAll<any>('SELECT * FROM dreamx_conversation_participants WHERE conversation_id = ?', [conv.id]);
    for (const p of parts) {
      // The cursor MUST be <= MAX(rowid)
      expect(p.last_read_message_rowid).toBeLessThanOrEqual(maxRowid);
      
      // The cursor should be equal to the max rowid of the messages they sent!
      const userMaxSent = Math.max(...messages.filter(m => m.sender_id === p.user_id).map(m => m.rowid));
      expect(p.last_read_message_rowid).toBeGreaterThanOrEqual(userMaxSent);
    }
  });

  it('Isolation: DM operations do not mutate crowd or event ledger', async () => {
    const db = getDreamXDb();
    const conv = await getOrCreateConversation('user_1', 'prof_A');
    await createDirectMessage({ conversationId: conv.id, senderId: 'user_1', body: 'isolation test' });
    
    const logs = await db.queryAll('SELECT * FROM dreamx_activity_log');
    expect(logs.length).toBe(0); // DM must not pollute ledger
    
    const states = await db.queryAll('SELECT * FROM dreamx_crowd_state');
    expect(states.length).toBe(0); // DM must not fabricate crowd
  });
});
