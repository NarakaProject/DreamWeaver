import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, getRepliesTree, saveProfile, saveUserProfile, getProfilePosts } from './db';
import { extractMentions, resolveMention } from './mentions';
import { calculateCandidateWeights } from './simulation';
import type { DreamXProfile, DreamXUserProfile, DreamXPost } from './types';

describe('DreamX Deep Reply Targeting & Mention System Audit', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM dreamx_posts;
      DELETE FROM dreamx_profiles;
      DELETE FROM dreamx_user_profile;
      DELETE FROM dreamx_activity_log;
    `);
  });

  it('1. GET thread using nested child ID returns Josh root and requested target Maria', async () => {
    // Josh (root)
    const joshPost = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Balancing growth and well-being is key' });
    // Naraka replies to Josh
    const narakaReply = await savePost({ author_id: 'naraka-1', author_type: 'human', content: 'really? i don\'t think so, Josh.', reply_to_post_id: joshPost.id });
    // Maria replies to Naraka
    const mariaReply = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'Uh oh, sounds like Josh stepped in it! @Naraka', reply_to_post_id: narakaReply.id });

    // Simulate GET /api/dreamx/posts?thread_id=mariaReply.id
    const requestedPost = await getPost(mariaReply.id);
    expect(requestedPost).toBeDefined();

    let root = requestedPost!;
    let depth = 0;
    while (root.reply_to_post_id && depth < 10) {
      const parent = await getPost(root.reply_to_post_id);
      if (!parent) break;
      root = parent;
      depth++;
    }

    const replies = await getRepliesTree(root.id);

    expect(root.id).toBe(joshPost.id);
    expect(requestedPost!.id).toBe(mariaReply.id);
    expect(replies).toHaveLength(1);
    expect(replies[0].id).toBe(narakaReply.id);
    expect(replies[0].replies).toHaveLength(1);
    expect(replies[0].replies![0].id).toBe(mariaReply.id);
  });

  it('2. Preserves target semantics when submitting a deep reply to Naraka', async () => {
    const joshPost = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Root post by Josh' });
    const narakaReply = await savePost({ author_id: 'naraka-1', author_type: 'human', content: 'Naraka reply', reply_to_post_id: joshPost.id });
    const mariaReply = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'Maria reply to Naraka', reply_to_post_id: narakaReply.id });

    // User explicitly targets Naraka inside the open thread
    const newReply = await savePost({
      author_id: 'user-1',
      author_type: 'human',
      content: 'Replying directly to Naraka',
      reply_to_post_id: narakaReply.id
    });

    expect(newReply.reply_to_post_id).toBe(narakaReply.id);
    expect(newReply.reply_to_post_id).not.toBe(joshPost.id);
  });

  it('3. Supports 4th-level arbitrary-depth nested replies (Josh -> Naraka -> Maria -> Josh2)', async () => {
    const p1 = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'L1 Josh' });
    const p2 = await savePost({ author_id: 'naraka-1', author_type: 'human', content: 'L2 Naraka', reply_to_post_id: p1.id });
    const p3 = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'L3 Maria', reply_to_post_id: p2.id });
    const p4 = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'L4 Josh2', reply_to_post_id: p3.id });

    const tree = await getRepliesTree(p1.id);
    expect(tree[0].id).toBe(p2.id);
    expect(tree[0].replies![0].id).toBe(p3.id);
    expect(tree[0].replies![0].replies![0].id).toBe(p4.id);
  });

  it('4. Profile Replies tab retrieves nested reply with exact target info', async () => {
    const p1 = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Root post' });
    const p2 = await savePost({ author_id: 'naraka-1', author_type: 'human', content: 'Reply by Naraka', reply_to_post_id: p1.id });
    await saveProfile({ id: 'maria-1', display_name: 'Maria', handle: '@MariaEnoce' });
    const p3 = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'Maria reply', reply_to_post_id: p2.id });

    const mariaPosts = await getProfilePosts('maria-1', 'ai');
    const repliesTabPosts = mariaPosts.replies;

    expect(repliesTabPosts).toHaveLength(1);
    expect(repliesTabPosts[0].id).toBe(p3.id);
    expect(repliesTabPosts[0].reply_to_post_id).toBe(p2.id);

  });

  it('5. Mention parser extracts @mentions and ignores emails & handles punctuation', () => {
    expect(extractMentions('Hey @MariaEnoce!')).toEqual(['MariaEnoce']);
    expect(extractMentions('@Naraka, what\'s up?')).toEqual(['Naraka']);
    expect(extractMentions('contact user@example.com for info')).toEqual([]);
    expect(extractMentions('@MariaEnoce @MariaEnoce')).toEqual(['MariaEnoce']);
    expect(extractMentions('talking to @JoshTest.')).toEqual(['JoshTest']);
  });

  it('6. Mention resolution resolves AI and Human handles while unknown handles return null', () => {
    const aiProfiles: DreamXProfile[] = [
      { id: 'ai-1', display_name: 'Maria', handle: '@MariaEnoce', created_at: 0, updated_at: 0 }
    ];
    const humanProfile: DreamXUserProfile = {
      id: 'human-1', display_name: 'Naraka', handle: '@Naraka', created_at: 0, updated_at: 0
    };

    const resAi = resolveMention('@MariaEnoce', aiProfiles, humanProfile);
    expect(resAi).toEqual({ type: 'ai', profile: aiProfiles[0] });

    const resHuman = resolveMention('Naraka', aiProfiles, humanProfile);
    expect(resHuman).toEqual({ type: 'human', profile: humanProfile });

    const resUnknown = resolveMention('@GhostUser', aiProfiles, humanProfile);
    expect(resUnknown).toBeNull();
  });

  it('7. Mention candidate weighting boosts mentioned AI profile selection priority', () => {
    const profiles: DreamXProfile[] = [
      { id: 'ai-1', display_name: 'Josh', handle: '@JoshTest', created_at: 0, updated_at: 0 },
      { id: 'ai-2', display_name: 'Maria', handle: '@MariaEnoce', created_at: 0, updated_at: 0 }
    ];

    const feedPosts: DreamXPost[] = [
      { id: 'post-1', author_id: 'human-1', author_type: 'human', content: 'What do you think @MariaEnoce?', likes_count: 0, reposts_count: 0, created_at: 0 }
    ];

    const weighted = calculateCandidateWeights(profiles, feedPosts);
    const joshWeight = weighted.find(w => w.profile.id === 'ai-1')?.weight;
    const mariaWeight = weighted.find(w => w.profile.id === 'ai-2')?.weight;

    expect(joshWeight).toBe(1.0);
    expect(mariaWeight).toBe(2.5);
  });
});
