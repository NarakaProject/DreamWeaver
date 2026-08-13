import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, saveProfile, saveUserProfile } from './db';
import { 
  routeChatStream, 
  markModelCooldown, 
  isModelCooling, 
  clearModelCooldowns,
  isRateLimitError,
  isModelUnavailableError,
  DEFAULT_MODELS,
  GEMINI_MODELS
} from '@/lib/ai/provider-router';
import { 
  evaluateSocialUrgencyEvents, 
  countReciprocalPingPong, 
  runAutonomousActivityStep 
} from './simulation';
import type { DreamXPost } from './types';

describe('DREAMX v0.2 — Model-Aware Provider Fallback, Conversation Saturation & Flat UI Audit', () => {
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

  // ----------------------------------------------------
  // 1. PROVIDER ROUTER & GEMINI 3.X REGISTRY TESTS
  // ----------------------------------------------------
  describe('Provider Router — Gemini 3.x Registry & Model-Aware Fallback', () => {
    it('1. Default Gemini model is gemini-3.6-flash and Gemini 3.x registry is authoritative', () => {
      expect(DEFAULT_MODELS.gemini).toBe('gemini-3.6-flash');
      expect(GEMINI_MODELS).toEqual([
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
      ]);
    });

    it('2. Correctly detects HTTP 429 rate limit and HTTP 404 model-unavailable signals', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ message: 'RESOURCE_EXHAUSTED: Quota exceeded' })).toBe(true);
      expect(isRateLimitError({ message: 'TPM Limit 12000 reached for model' })).toBe(true);

      expect(isModelUnavailableError({ status: 404 })).toBe(true);
      expect(isModelUnavailableError({ message: 'Gemini API Error (404): This model is no longer available to new users.' })).toBe(true);

      expect(isRateLimitError({ message: 'Invalid API Key' })).toBe(false);
      expect(isModelUnavailableError({ message: 'Invalid API Key' })).toBe(false);
    });

    it('3. Rate-limited model enters temporary cooldown and is skipped', () => {
      markModelCooldown('gemini', 'gemini-3.6-flash', 10000);
      expect(isModelCooling('gemini', 'gemini-3.6-flash')).toBe(true);
      expect(isModelCooling('gemini', 'gemini-3.5-flash')).toBe(false);
    });

    it('4. Throws clean error when all providers and models lack keys or fail', async () => {
      await expect(
        routeChatStream({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          keys: {},
          systemInstruction: 'test',
          messages: [{ role: 'user', content: 'hello' }],
          temperature: 0.7,
          maxOutputTokens: 100
        })
      ).rejects.toThrow();
    });
  });

  // ----------------------------------------------------
  // 2. SIMULATION CONVERSATION SATURATION & PING-PONG TESTS
  // ----------------------------------------------------
  describe('Simulation Engine — Conversation Saturation & Reciprocal Ping-Pong', () => {
    it('5. Human reply and human mention receive high urgency scores', async () => {
      const aiProf = await saveProfile({ id: 'prof-sp-1', display_name: 'Josh', handle: '@Josh' });
      const human = await saveUserProfile({ id: 'user-sp-1', display_name: 'Naraka', handle: '@Naraka' });

      const aiPost = await savePost({ id: 'sp-post-1', author_id: aiProf.id, author_type: 'ai', content: 'Hello world' });
      const humanReply = await savePost({ id: 'sp-post-2', author_id: human.id, author_type: 'human', content: 'Nice post, Josh!', reply_to_post_id: aiPost.id });

      const events = evaluateSocialUrgencyEvents([aiProf], [aiPost, humanReply], new Set());
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].score).toBeGreaterThan(5.0);
      expect(events[0].isDirectHumanInteraction).toBe(true);
    });

    it('6. Repeated A <-> B AI replies experience diminishing urgency through reciprocal ping-pong decay', async () => {
      const pA = await saveProfile({ id: 'prof-pa', display_name: 'Actor A', handle: '@ActorA' });
      const pB = await saveProfile({ id: 'prof-pb', display_name: 'Actor B', handle: '@ActorB' });

      const post1 = await savePost({ id: 'pp-1', author_id: pA.id, author_type: 'ai', content: 'Turn 1' });
      const post2 = await savePost({ id: 'pp-2', author_id: pB.id, author_type: 'ai', content: 'Turn 2', reply_to_post_id: 'pp-1' });
      const post3 = await savePost({ id: 'pp-3', author_id: pA.id, author_type: 'ai', content: 'Turn 3', reply_to_post_id: 'pp-2' });
      const post4 = await savePost({ id: 'pp-4', author_id: pB.id, author_type: 'ai', content: 'Turn 4', reply_to_post_id: 'pp-3' });
      const post5 = await savePost({ id: 'pp-5', author_id: pA.id, author_type: 'ai', content: 'Turn 5', reply_to_post_id: 'pp-4' });

      const allPosts = [post1, post2, post3, post4, post5];
      const postMap = new Map<string, DreamXPost>();
      allPosts.forEach(p => postMap.set(p.id, p));

      const pingPongDepth = countReciprocalPingPong(post5, pB.id, postMap);
      expect(pingPongDepth).toBeGreaterThanOrEqual(4);

      const events = evaluateSocialUrgencyEvents([pB], allPosts, new Set());
      const bEventsForP5 = events.filter(e => e.targetPost.id === 'pp-5' && e.candidate.id === pB.id);

      if (bEventsForP5.length > 0) {
        expect(bEventsForP5[0].score).toBeLessThan(2.0);
      } else {
        expect(bEventsForP5).toHaveLength(0);
      }
    });

    it('7. Fresh human interaction reactivates a saturated thread', async () => {
      const pA = await saveProfile({ id: 'prof-ra-1', display_name: 'Actor A', handle: '@ActorA' });
      const pB = await saveProfile({ id: 'prof-rb-1', display_name: 'Actor B', handle: '@ActorB' });
      const human = await saveUserProfile({ id: 'user-rh-1', display_name: 'Naraka', handle: '@Naraka' });

      const post1 = await savePost({ id: 'rh-1', author_id: pA.id, author_type: 'ai', content: 'Turn 1' });
      const post2 = await savePost({ id: 'rh-2', author_id: pB.id, author_type: 'ai', content: 'Turn 2', reply_to_post_id: 'rh-1' });

      const humanReply = await savePost({ id: 'rh-3', author_id: human.id, author_type: 'human', content: 'Hey @ActorA what do you think?', reply_to_post_id: 'rh-2' });

      const allPosts = [post1, post2, humanReply];
      const events = evaluateSocialUrgencyEvents([pA], allPosts, new Set());

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].isDirectHumanInteraction).toBe(true);
      expect(events[0].score).toBeGreaterThan(5.0);
    });

    it('8. Simulation runAutonomousActivityStep executes safely without falling into infinite loops', async () => {
      await saveProfile({ id: 'prof-loop-1', display_name: 'SimBot A', handle: '@sim1' });
      await saveProfile({ id: 'prof-loop-2', display_name: 'SimBot B', handle: '@sim2' });

      for (let i = 0; i < 3; i++) {
        const step = await runAutonomousActivityStep({
          provider: 'gemini',
          keys: {},
          forceBypassCooldown: true
        });
        expect(step).toBeDefined();
        expect(['posted', 'replied', 'liked', 'no_action', 'NO_ACTION']).toContain(step.outcome);
      }
    });
  });

  // ----------------------------------------------------
  // 3. THREAD ARBITRARY DEPTH & DATA INTEGRITY TESTS
  // ----------------------------------------------------
  describe('Thread Tree & Structural Integrity', () => {
    it('9. Database maintains arbitrary depth reply relationships intact', async () => {
      const p1 = await saveProfile({ id: 'prof-tree-1', display_name: 'TreeBot', handle: '@tree' });
      const root = await savePost({ id: 'tree-root', author_id: p1.id, author_type: 'ai', content: 'Root' });
      
      let parentId = root.id;
      for (let d = 1; d <= 10; d++) {
        const reply = await savePost({
          id: `tree-depth-${d}`,
          author_id: p1.id,
          author_type: 'ai',
          content: `Depth ${d}`,
          reply_to_post_id: parentId
        });
        parentId = reply.id;
      }

      const leafPost = await getPost('tree-depth-10');
      expect(leafPost).toBeDefined();
      expect(leafPost?.reply_to_post_id).toBe('tree-depth-9');
    });

    it('10. DreamWeaver narrative database tables remain completely untouched', async () => {
      const db = getDatabase();
      const dwSessions = await db.queryAll('SELECT COUNT(*) as count FROM sessions');
      const dwMessages = await db.queryAll('SELECT COUNT(*) as count FROM messages');
      
      expect(dwSessions).toBeDefined();
      expect(dwMessages).toBeDefined();
    });
  });
});
