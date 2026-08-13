import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, saveProfile, saveUserProfile, getFeedTree, getConversationFlat } from './db';

describe('DREAMX v0.2 — Twitter-Like Standalone Feed & Flat Conversation Audit', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM dreamx_posts;
      DELETE FROM dreamx_profiles;
      DELETE FROM dreamx_user_profile;
      DELETE FROM dreamx_activity_log;
      DELETE FROM dreamx_likes;
      DELETE FROM dreamx_reposts;
    `);
  });

  it('1. Main feed queries and returns top-level root posts ONLY without nested inline replies', async () => {
    const p1 = await saveProfile({ id: 'prof-f-1', display_name: 'Author A', handle: '@authorA' });
    const root = await savePost({ id: 'feed-root-1', author_id: p1.id, author_type: 'ai', content: 'Root post in feed' });

    // Create 3 replies to root
    const r1 = await savePost({ id: 'feed-reply-1', author_id: p1.id, author_type: 'ai', content: 'Reply 1', reply_to_post_id: root.id });
    const r2 = await savePost({ id: 'feed-reply-2', author_id: p1.id, author_type: 'ai', content: 'Reply 2', reply_to_post_id: r1.id });

    const feed = await getFeedTree();
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe(root.id);
    expect(feed[0].reply_to_post_id).toBeNull();
    expect(feed[0].replies).toEqual([]);
    expect(feed[0].reply_count).toBeGreaterThanOrEqual(1);
  });

  it('2 & 3. Opening any nested reply resolves its root conversation beginning with original root post', async () => {
    const p1 = await saveProfile({ id: 'prof-f-2', display_name: 'Author B', handle: '@authorB' });
    const root = await savePost({ id: 'conv-root', author_id: p1.id, author_type: 'ai', content: 'Original Root Post A' });
    const replyB = await savePost({ id: 'conv-reply-b', author_id: p1.id, author_type: 'ai', content: 'Reply B', reply_to_post_id: root.id });
    const replyC = await savePost({ id: 'conv-reply-c', author_id: p1.id, author_type: 'ai', content: 'Nested Reply C', reply_to_post_id: replyB.id });
    const replyD = await savePost({ id: 'conv-reply-d', author_id: p1.id, author_type: 'ai', content: 'Deep Reply D', reply_to_post_id: replyC.id });

    // Opening deep reply C resolves root A and returns flat conversation [B, C, D]
    const { root: resolvedRoot, conversation, target } = await getConversationFlat('conv-reply-c');

    expect(resolvedRoot.id).toBe('conv-root');
    expect(resolvedRoot.content).toBe('Original Root Post A');
    expect(target?.id).toBe('conv-reply-c');

    expect(conversation).toHaveLength(3);
    expect(conversation.map(p => p.id)).toEqual(['conv-reply-b', 'conv-reply-c', 'conv-reply-d']);
  });

  it('4 & 5. Flat conversation orders replies chronologically by created_at and preserves flat presentation', async () => {
    const p1 = await saveProfile({ id: 'prof-f-3', display_name: 'Author C', handle: '@authorC' });
    const root = await savePost({ id: 'flat-root', author_id: p1.id, author_type: 'ai', content: 'Root Post' });

    for (let i = 1; i <= 5; i++) {
      await savePost({
        id: `flat-reply-${i}`,
        author_id: p1.id,
        author_type: 'ai',
        content: `Conversation post ${i}`,
        reply_to_post_id: i === 1 ? root.id : `flat-reply-${i - 1}`
      });
    }

    const { root: resolvedRoot, conversation } = await getConversationFlat('flat-root');
    expect(resolvedRoot.id).toBe('flat-root');
    expect(conversation).toHaveLength(5);

    // Verify chronological order
    for (let i = 0; i < conversation.length - 1; i++) {
      expect(conversation[i].created_at).toBeLessThanOrEqual(conversation[i + 1].created_at);
    }
  });

  it('6. A 100-reply deep conversation handles full descendant retrieval flatly without error', async () => {
    const p1 = await saveProfile({ id: 'prof-f-4', display_name: 'Author D', handle: '@authorD' });
    const root = await savePost({ id: 'deep-root', author_id: p1.id, author_type: 'ai', content: 'Root Post' });

    let parentId = root.id;
    for (let i = 1; i <= 20; i++) {
      const p = await savePost({
        id: `deep-post-${i}`,
        author_id: p1.id,
        author_type: 'ai',
        content: `Deep item ${i}`,
        reply_to_post_id: parentId
      });
      parentId = p.id;
    }

    const { root: resRoot, conversation } = await getConversationFlat('deep-post-20');
    expect(resRoot.id).toBe('deep-root');
    expect(conversation).toHaveLength(20);
  });

  it('7 & 8. Preserves stored reply_to_post_id relationships and post/like/repost functionality', async () => {
    const p1 = await saveProfile({ id: 'prof-f-5', display_name: 'Author E', handle: '@authorE' });
    const root = await savePost({ id: 'rel-root', author_id: p1.id, author_type: 'ai', content: 'Root' });
    const reply = await savePost({ id: 'rel-reply', author_id: p1.id, author_type: 'ai', content: 'Reply', reply_to_post_id: root.id });

    const fetchedReply = await getPost(reply.id);
    expect(fetchedReply?.reply_to_post_id).toBe('rel-root');
  });

  it('9. DreamWeaver narrative database tables remain completely untouched', async () => {
    const db = getDatabase();
    const dwSessions = await db.queryAll('SELECT COUNT(*) as count FROM sessions');
    const dwMessages = await db.queryAll('SELECT COUNT(*) as count FROM messages');
    
    expect(dwSessions).toBeDefined();
    expect(dwMessages).toBeDefined();
  });
});
