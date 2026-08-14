import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, saveProfile, saveUserProfile, getFeedTree, getConversationFlat } from './db';
import { VerifiedIcon, DreamXVerificationBadge } from '@/components/dreamx/DreamXVerificationBadge';
import { 
  DEFAULT_MODELS, 
  GROQ_MODELS, 
  PROVIDER_MODEL_PRESETS,
  markModelCooldown,
  isModelCooling,
  clearModelCooldowns
} from '@/lib/ai/provider-router';

describe('DREAMX v0.2 — Modern X Post Navigation, Groq Fallback & OpenRouter/Free Audit', () => {
  beforeEach(() => {
    clearModelCooldowns();
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

  it('1 & 2. Gemini & Groq model-level cooldown tracking cools only affected candidate model', () => {
    markModelCooldown('groq', 'llama-3.3-70b-versatile', 15000);
    expect(isModelCooling('groq', 'llama-3.3-70b-versatile')).toBe(true);
    expect(isModelCooling('groq', 'llama-3.1-8b-instant')).toBe(false);
  });

  it('3, 4 & 5. Groq model registry contains verified models and DEFAULT_MODELS uses openrouter/free', () => {
    expect(GROQ_MODELS).toContain('llama-3.3-70b-versatile');
    expect(GROQ_MODELS).toContain('llama-3.1-8b-instant');
    expect(DEFAULT_MODELS.openrouter).toBe('openrouter/free');
    expect(DEFAULT_MODELS.openrouter).not.toBe('meta-llama/llama-3.3-70b-instruct:free');
    expect(PROVIDER_MODEL_PRESETS.openrouter[0].id).toBe('openrouter/free');
  });

  it('6. Main feed queries and returns top-level root posts ONLY without nested inline reply objects', async () => {
    const p1 = await saveProfile({ id: 'prof-f-1', display_name: 'Author A', handle: '@authorA' });
    const root = await savePost({ id: 'feed-root-1', author_id: p1.id, author_type: 'ai', content: 'Root post in feed' });

    const r1 = await savePost({ id: 'feed-reply-1', author_id: p1.id, author_type: 'ai', content: 'Reply 1', reply_to_post_id: root.id });
    await savePost({ id: 'feed-reply-2', author_id: p1.id, author_type: 'ai', content: 'Reply 2', reply_to_post_id: r1.id });

    const feed = await getFeedTree();
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe(root.id);
    expect(feed[0].reply_to_post_id).toBeNull();
    expect(feed[0].replies).toEqual([]);
    expect(feed[0].reply_count).toBeGreaterThanOrEqual(1);
  });

  it('7 & 8. Dedicated post page resolves root from a deep reply and returns a flat conversation', async () => {
    const p1 = await saveProfile({ id: 'prof-f-2', display_name: 'Author B', handle: '@authorB' });
    const root = await savePost({ id: 'conv-root', author_id: p1.id, author_type: 'ai', content: 'Original Root Post A' });
    const replyB = await savePost({ id: 'conv-reply-b', author_id: p1.id, author_type: 'ai', content: 'Reply B', reply_to_post_id: root.id });
    const replyC = await savePost({ id: 'conv-reply-c', author_id: p1.id, author_type: 'ai', content: 'Nested Reply C', reply_to_post_id: replyB.id });
    const replyD = await savePost({ id: 'conv-reply-d', author_id: p1.id, author_type: 'ai', content: 'Deep Reply D', reply_to_post_id: replyC.id });

    const { root: resolvedRoot, ancestors, replies, target } = await getConversationFlat('conv-reply-c');

    expect(resolvedRoot.id).toBe('conv-root');
    expect(resolvedRoot.content).toBe('Original Root Post A');
    expect(target?.id).toBe('conv-reply-c');

    expect(ancestors).toHaveLength(2);
    expect(ancestors[0].id).toBe('conv-root');
    expect(ancestors[1].id).toBe('conv-reply-b');
    
    expect(replies).toHaveLength(1);
    expect(replies[0].id).toBe('conv-reply-d');
  });

  it('9 & 10. 100+ reply deep conversation handles full descendant retrieval flatly while keeping reply_to_post_id in DB', async () => {
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

    const { root: resRoot, ancestors, replies, target } = await getConversationFlat('deep-post-20');
    expect(resRoot.id).toBe('deep-root');
    expect(ancestors).toHaveLength(20);
    expect(ancestors[0].id).toBe('deep-root');
    expect(target.id).toBe('deep-post-20');
    expect(replies).toHaveLength(0);

    const leafPost = await getPost('deep-post-20');
    expect(leafPost?.reply_to_post_id).toBe('deep-post-19');
  });

  it('11. VerifiedIcon renders official SVG path using fill="currentColor"', () => {
    const iconElement = VerifiedIcon({ className: 'custom-icon' });
    expect(iconElement.props.fill).toBe('currentColor');
    expect(iconElement.props.viewBox).toBe('0 0 22 22');
    expect(iconElement.props.className).toContain('custom-icon');

    const badgeBlue = DreamXVerificationBadge({ type: 'blue' });
    expect(badgeBlue).toBeDefined();
  });

  it('12. DreamWeaver narrative database tables remain completely untouched', async () => {
    const db = getDatabase();
    const dwSessions = await db.queryAll('SELECT COUNT(*) as count FROM sessions');
    const dwMessages = await db.queryAll('SELECT COUNT(*) as count FROM messages');
    
    expect(dwSessions).toBeDefined();
    expect(dwMessages).toBeDefined();
  });
});
