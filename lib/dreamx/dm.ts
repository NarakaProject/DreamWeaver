import { getDreamXDb, generateId } from './db';

// Enforces canonical conversation identity
function getConversationId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `dm::${sorted.join('::')}`;
}

export async function getOrCreateConversation(userA: string, userB: string) {
  if (userA === userB) {
    throw new Error('Self-conversations are not permitted.');
  }

  const db = getDreamXDb();

  // Validate users exist
  const profiles = await db.queryAll<{ id: string }>(
    `SELECT id FROM (
       SELECT id FROM dreamx_user_profile WHERE id IN (?, ?)
       UNION
       SELECT id FROM dreamx_profiles WHERE id IN (?, ?)
     )`,
    [userA, userB, userA, userB]
  );

  const foundIds = new Set(profiles.map(p => p.id));
  if (!foundIds.has(userA)) throw new Error(`User ${userA} not found.`);
  if (!foundIds.has(userB)) throw new Error(`User ${userB} not found.`);

  const conversationId = getConversationId(userA, userB);
  const now = Date.now();

  const statements = [
    {
      sql: `INSERT OR IGNORE INTO dreamx_conversations (id, created_at, updated_at) VALUES (?, ?, ?)`,
      args: [conversationId, now, now]
    },
    {
      sql: `INSERT OR IGNORE INTO dreamx_conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
      args: [conversationId, userA, now]
    },
    {
      sql: `INSERT OR IGNORE INTO dreamx_conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`,
      args: [conversationId, userB, now]
    }
  ];

  await db.batchExecute(statements);

  const conversation = await db.queryFirst<any>('SELECT * FROM dreamx_conversations WHERE id = ?', [conversationId]);
  return conversation;
}

export async function createDirectMessage(params: { conversationId: string; senderId: string; body: string }) {
  const { conversationId, senderId, body } = params;
  if (!body.trim()) throw new Error('Message body cannot be empty.');

  const db = getDreamXDb();

  // Validate membership
  const participant = await db.queryFirst<{ user_id: string }>(
    'SELECT user_id FROM dreamx_conversation_participants WHERE conversation_id = ? AND user_id = ?',
    [conversationId, senderId]
  );
  if (!participant) {
    throw new Error('Sender is not a participant in this conversation.');
  }

  const messageId = generateId('dx-msg');
  const now = Date.now();

  // Atomically insert message, update conversation latest message, and update sender's read cursor.
  // The subquery ensures last_message_id explicitly points to the max rowid message.
  const statements = [
    {
      sql: `INSERT INTO dreamx_messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [messageId, conversationId, senderId, body, now]
    },
    {
      sql: `UPDATE dreamx_conversations 
            SET last_message_id = (
              SELECT id FROM dreamx_messages WHERE conversation_id = ? ORDER BY rowid DESC LIMIT 1
            ), 
            updated_at = ? 
            WHERE id = ?`,
      args: [conversationId, now, conversationId]
    },
    {
      sql: `UPDATE dreamx_conversation_participants 
            SET last_read_message_rowid = MAX(last_read_message_rowid, (
              SELECT rowid FROM dreamx_messages WHERE id = ?
            ))
            WHERE conversation_id = ? AND user_id = ?`,
      args: [messageId, conversationId, senderId]
    }
  ];

  await db.batchExecute(statements);

  const message = await db.queryFirst<any>('SELECT rowid, * FROM dreamx_messages WHERE id = ?', [messageId]);
  return message;
}

export async function markConversationRead(params: { conversationId: string; userId: string; messageRowid: number }) {
  const db = getDreamXDb();
  
  await db.execute(
    `UPDATE dreamx_conversation_participants 
     SET last_read_message_rowid = MAX(last_read_message_rowid, ?)
     WHERE conversation_id = ? AND user_id = ?`,
    [params.messageRowid, params.conversationId, params.userId]
  );
}
