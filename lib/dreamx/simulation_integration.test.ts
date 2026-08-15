import { describe, it, expect } from 'vitest';
import {
  calculatePersonalityPropensity,
  calculateCandidateWeights,
  selectWeightedCandidate,
  evaluateSocialUrgencyEvents
} from './simulation';
import { toActorFromProfile, toActorFromUserProfile } from './actors';
import { deriveEffectiveBehavior, DEFAULT_BEHAVIOR_POLICY } from './behaviorPolicy';
import { buildDreamXSystemInstruction } from './engine';
import type { Actor, DreamXProfile, DreamXUserProfile, DreamXPost, BehaviorPolicy } from './types';

describe('Phase D7 — Simulation & Engine Domain Integration', () => {
  describe('1 & 10. Profile to Actor Conversion and Backward Compatibility', () => {
    it('converts legacy DreamXProfile to Actor aggregate before domain execution', () => {
      const profile: DreamXProfile = {
        id: 'prof-oracle-1',
        display_name: 'Oracle of Delphi',
        handle: '@oracle',
        avatar_url: 'https://img.com/oracle.png',
        bio: 'Ancient seer',
        personality: 'Enigmatic and talkative',
        traits: 'mystic, wise',
        interests: 'futures, prophecy',
        speaking_style: 'Poetic, cryptic verses',
        beliefs: 'Fate is immutable',
        background: 'Temple keeper',
        posting_guidelines: 'Speak in riddles',
        verification_type: 'gold',
        category: 'media',
        archetypes: ['commentator'],
        created_at: 100,
        updated_at: 200
      };

      const actor = toActorFromProfile(profile);
      expect(actor.identity.id).toBe('prof-oracle-1');
      expect(actor.identity.handle).toBe('@oracle');
      expect(actor.identity.actor_type).toBe('ai');
      expect(actor.taxonomy?.category).toBe('media');
      expect(actor.taxonomy?.archetypes).toEqual(['commentator']);
      expect(actor.personality?.summary).toBe('Enigmatic and talkative');
      expect(actor.personality?.traits).toEqual(['mystic', 'wise']);
      expect(actor.contentProfile?.style).toBe('Poetic, cryptic verses');
      expect(actor.contentProfile?.guidelines).toEqual(['Speak in riddles']);

      // Calculate propensity using normalized actor
      const score = calculatePersonalityPropensity(actor);
      expect(score).toBeGreaterThan(1.0);
    });
  });

  describe('2 & 3. Actor Personality Propensity and Content Relevance', () => {
    it('calculates propensity correctly from Actor personality and contentProfile', () => {
      const socialActor: Actor = {
        identity: {
          id: 'act-social',
          handle: '@social_bot',
          display_name: 'Social Bot',
          actor_type: 'ai',
          verification_type: 'none',
          created_at: 1000,
          updated_at: 1000
        },
        personality: {
          summary: 'Very social and talkative',
          traits: ['bold', 'witty']
        },
        contentProfile: {
          style: 'Expressive and passionate'
        }
      };

      const quietActor: Actor = {
        identity: {
          id: 'act-quiet',
          handle: '@quiet_bot',
          display_name: 'Quiet Bot',
          actor_type: 'ai',
          verification_type: 'none',
          created_at: 1000,
          updated_at: 1000
        },
        personality: {
          summary: 'Quiet and reserved',
          traits: ['introverted', 'calm']
        }
      };

      const socialScore = calculatePersonalityPropensity(socialActor);
      const quietScore = calculatePersonalityPropensity(quietActor);

      expect(socialScore).toBeGreaterThan(1.0);
      expect(quietScore).toBeLessThan(1.0);
    });
  });

  describe('4 & 5. Canonical deriveEffectiveBehavior & Runtime Context Integration', () => {
    it('derives effective behavior from Actor basePolicy with urgency and mention runtime context', () => {
      const basePolicy: BehaviorPolicy = {
        actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
        engagementSelectivity: 0.6
      };

      const normalContext = deriveEffectiveBehavior(basePolicy, { isUrgencyEvent: false, isMentioned: false });
      expect(normalContext).toEqual(basePolicy);

      const mentionContext = deriveEffectiveBehavior(basePolicy, { isUrgencyEvent: false, isMentioned: true });
      expect(mentionContext.actionProbabilities.reply).toBe(0.65);
      expect(mentionContext.engagementSelectivity).toBe(0.8);

      const urgencyContext = deriveEffectiveBehavior(basePolicy, { isUrgencyEvent: true, isMentioned: false });
      expect(urgencyContext.actionProbabilities.reply).toBe(0.70);
      expect(urgencyContext.actionProbabilities.like).toBe(0.15);
      expect(urgencyContext.engagementSelectivity).toBe(1.0);
    });
  });

  describe('6. AI-only Autonomous Execution Boundary', () => {
    it('preserves actor_type execution boundary (human actors have undefined behaviorPolicy)', () => {
      const humanProfile: DreamXUserProfile = {
        id: 'user-alice',
        display_name: 'Alice',
        handle: '@alice',
        created_at: 1000,
        updated_at: 1000
      };

      const humanActor = toActorFromUserProfile(humanProfile);
      expect(humanActor.identity.actor_type).toBe('human');
      expect(humanActor.behaviorPolicy).toBeUndefined();
    });
  });

  describe('7, 8, 9 & 11. Engine Prompt Composition from D1–D6 Domain Layers', () => {
    it('composes system prompt from Actor domain layers without account-type branching', () => {
      const actor: Actor = {
        identity: {
          id: 'act-unified',
          handle: '@unified_voice',
          display_name: 'Unified Voice',
          actor_type: 'ai',
          bio: 'Synthesizing knowledge.',
          created_at: 1000,
          updated_at: 1000
        },
        taxonomy: {
          category: 'individual',
          archetypes: ['enthusiast', 'satirist'],
          tags: ['knowledge']
        },
        personality: {
          summary: 'Inquisitive and playful',
          traits: ['curious', 'witty'],
          interests: ['quantum physics', 'literature']
        },
        contentProfile: {
          style: 'Engaging, lucid, occasional metaphors',
          topics: ['science', 'art'],
          guidelines: ['Be welcoming', 'Keep under 280 chars']
        }
      };

      const prompt = buildDreamXSystemInstruction(actor);

      expect(prompt).toContain('You are @unified_voice');
      expect(prompt).toContain('Name: Unified Voice');
      expect(prompt).toContain('Bio: Synthesizing knowledge.');
      expect(prompt).toContain('Category: individual');
      expect(prompt).toContain('Archetypes: enthusiast, satirist');
      expect(prompt).toContain('Summary: Inquisitive and playful');
      expect(prompt).toContain('Traits: curious, witty');
      expect(prompt).toContain('Interests: quantum physics, literature');
      expect(prompt).toContain('Style: Engaging, lucid, occasional metaphors');
      expect(prompt).toContain('Topics: science, art');
      expect(prompt).toContain('Guidelines: Be welcoming; Keep under 280 chars');
      expect(prompt).toContain('CRITICAL RULES:');
    });
  });

  describe('12. Immutability of Domain Objects', () => {
    it('does not mutate input Actor or BehaviorPolicy during simulation scoring or weighting', () => {
      const post: DreamXPost = {
        id: 'post-immut',
        author_id: 'user-1',
        author_type: 'human',
        content: 'Hello @immut_bot',
        likes_count: 0,
        reposts_count: 0,
        created_at: Date.now()
      };

      const originalPolicy: BehaviorPolicy = {
        actionProbabilities: { like: 0.25, reply: 0.25, post: 0.25, no_action: 0.25 },
        engagementSelectivity: 0.5
      };

      const actor: Actor = {
        identity: {
          id: 'act-immut',
          handle: '@immut_bot',
          display_name: 'Immut Bot',
          actor_type: 'ai',
          created_at: 1000,
          updated_at: 1000
        },
        personality: {
          summary: 'Steady'
        },
        behaviorPolicy: originalPolicy
      };

      const actorSnapshot = JSON.stringify(actor);

      calculatePersonalityPropensity(actor);
      calculateCandidateWeights([actor], [post]);
      evaluateSocialUrgencyEvents([actor], [post], new Set());
      deriveEffectiveBehavior(actor.behaviorPolicy!, { isUrgencyEvent: true, isMentioned: true });

      expect(JSON.stringify(actor)).toBe(actorSnapshot);
      expect(actor.behaviorPolicy).toEqual(originalPolicy);
    });
  });
});
