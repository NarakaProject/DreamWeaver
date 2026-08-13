import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, saveProfile, saveUserProfile } from './db';
import { evaluateSocialUrgencyEvents, calculatePersonalityPropensity } from './simulation';
import { extractMentions, resolveMention } from './mentions';
import type { DreamXProfile, DreamXPost, DreamXUserProfile } from './types';

describe('DREAMX v0.2 — Social Realism & Event-Driven Urgency System Audit', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM dreamx_posts;
      DELETE FROM dreamx_profiles;
      DELETE FROM dreamx_user_profile;
      DELETE FROM dreamx_activity_log;
    `);
  });

  it('TEST 1: Human reply to Josh AI post grants Josh highest-priority urgency score', async () => {
    const joshProfile: DreamXProfile = { id: 'josh-1', display_name: 'Josh', handle: '@JoshTest', personality: 'argumentative', created_at: Date.now(), updated_at: Date.now() };
    await saveProfile(joshProfile);

    const joshPost = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Balancing professional growth with well-being is key' });
    const humanReply = await savePost({ author_id: 'human-1', author_type: 'human', content: 'really? i don\'t think so, Josh.', reply_to_post_id: joshPost.id });

    const allPosts: DreamXPost[] = [
      { ...joshPost, replies: [humanReply] },
      humanReply
    ];

    const events = evaluateSocialUrgencyEvents([joshProfile], allPosts, new Set());

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].candidate.id).toBe('josh-1');
    expect(events[0].targetPost.id).toBe(humanReply.id);
    expect(events[0].score).toBeGreaterThan(8.0);
  });

  it('TEST 2: Human reply to Maria grants Maria higher urgency score than Josh', async () => {
    const joshProfile: DreamXProfile = { id: 'josh-1', display_name: 'Josh', handle: '@JoshTest', personality: 'calm', created_at: Date.now(), updated_at: Date.now() };
    const mariaProfile: DreamXProfile = { id: 'maria-1', display_name: 'Maria', handle: '@MariaEnoce', personality: 'social and expressive', created_at: Date.now(), updated_at: Date.now() };
    await saveProfile(joshProfile);
    await saveProfile(mariaProfile);

    const mariaPost = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'What is everyone working on?' });
    const humanReply = await savePost({ author_id: 'human-1', author_type: 'human', content: 'Working on DreamX, @MariaEnoce!', reply_to_post_id: mariaPost.id });

    const allPosts: DreamXPost[] = [{ ...mariaPost, replies: [humanReply] }, humanReply];

    const events = evaluateSocialUrgencyEvents([joshProfile, mariaProfile], allPosts, new Set());

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].candidate.id).toBe('maria-1');
    expect(events[0].score).toBeGreaterThan(10.0);
  });

  it('TEST 3: Explicit human mention grants mentioned AI very high urgency score', async () => {
    const mariaProfile: DreamXProfile = { id: 'maria-1', display_name: 'Maria', handle: '@MariaEnoce', personality: 'witty', created_at: Date.now(), updated_at: Date.now() };
    await saveProfile(mariaProfile);

    const humanPost = await savePost({ author_id: 'human-1', author_type: 'human', content: '@MariaEnoce what do you think about this?' });

    const events = evaluateSocialUrgencyEvents([mariaProfile], [humanPost], new Set());

    expect(events).toHaveLength(1);
    expect(events[0].candidate.id).toBe('maria-1');
    expect(events[0].isMention).toBe(true);
    expect(events[0].score).toBeGreaterThan(7.0);
  });

  it('TEST 4: Human reply to nested AI reply grants target to exact nested human reply', async () => {
    const mariaProfile: DreamXProfile = { id: 'maria-1', display_name: 'Maria', handle: '@MariaEnoce', personality: 'social', created_at: Date.now(), updated_at: Date.now() };
    await saveProfile(mariaProfile);

    const joshPost = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Root post' });
    const mariaReply = await savePost({ author_id: 'maria-1', author_type: 'ai', content: 'Maria nested reply', reply_to_post_id: joshPost.id });
    const humanReply = await savePost({ author_id: 'human-1', author_type: 'human', content: 'human replying to Maria', reply_to_post_id: mariaReply.id });

    const allPosts: DreamXPost[] = [joshPost, { ...mariaReply, replies: [humanReply] }, humanReply];

    const events = evaluateSocialUrgencyEvents([mariaProfile], allPosts, new Set());

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].candidate.id).toBe('maria-1');
    expect(events[0].targetPost.id).toBe(humanReply.id);
  });

  it('TEST 5: AI already replied to human comment suppresses continuous re-triggering', async () => {
    const joshProfile: DreamXProfile = { id: 'josh-1', display_name: 'Josh', handle: '@JoshTest', personality: 'social', created_at: Date.now(), updated_at: Date.now() };
    await saveProfile(joshProfile);

    const joshPost = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Root post' });
    const humanReply = await savePost({ author_id: 'human-1', author_type: 'human', content: 'Human comment', reply_to_post_id: joshPost.id });
    const joshResponse = await savePost({ author_id: 'josh-1', author_type: 'ai', content: 'Josh already replied!', reply_to_post_id: humanReply.id });

    const humanReplyWithChildren: DreamXPost = {
      ...humanReply,
      replies: [joshResponse]
    };

    const events = evaluateSocialUrgencyEvents([joshProfile], [joshPost, humanReplyWithChildren, joshResponse], new Set([`josh-1:${humanReply.id}`]));

    // Since Josh has already replied to humanReply, urgency score for humanReply should drop to 0
    expect(events).toHaveLength(0);
  });

  it('TEST 6: Personality propensity factor scales based on profile traits', () => {
    const argumentativeProfile: DreamXProfile = { id: '1', display_name: 'Arg', handle: '@arg', personality: 'argumentative and talkative', created_at: 0, updated_at: 0 };
    const quietProfile: DreamXProfile = { id: '2', display_name: 'Quiet', handle: '@quiet', personality: 'quiet and reserved', created_at: 0, updated_at: 0 };

    const scoreArg = calculatePersonalityPropensity(argumentativeProfile);
    const scoreQuiet = calculatePersonalityPropensity(quietProfile);

    expect(scoreArg).toBeGreaterThan(1.0);
    expect(scoreQuiet).toBeLessThan(1.0);
  });

  it('TEST 7: Mention parser handles edge cases correctly', () => {
    expect(extractMentions('@MariaEnoce, hello')).toEqual(['MariaEnoce']);
    expect(extractMentions('email@test.com')).toEqual([]);
    expect(extractMentions('hello @UnknownUser')).toEqual(['UnknownUser']);
  });
});
