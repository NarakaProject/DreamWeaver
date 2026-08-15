import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  toActorFromProfile, 
  toActorFromUserProfile, 
  getActorById, 
  getActorsByIds, 
  getActorByHandle 
} from './actors';
import type { DreamXProfile, DreamXUserProfile } from './types';
import { getDatabase, closeDatabase, reconnectDatabase } from '@/lib/db';
import { DEFAULT_BEHAVIOR_POLICY } from './behaviorPolicy';

describe('Phase D1 — Actor Domain Model & Resolver', () => {
  beforeEach(() => {
    reconnectDatabase();
  });

  afterEach(() => {
    closeDatabase();
    vi.restoreAllMocks();
  });

  describe('Pure Mapping Functions', () => {
    it('maps AI profile to Actor domain model with all components', () => {
      const aiProfile: DreamXProfile = {
        id: 'dx-prof-1',
        display_name: 'Tech Bot',
        handle: '@techbot',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Just a bot talking tech',
        personality: 'Analytical and sharp',
        traits: 'logical, precise',
        interests: 'AI, coding, hardware',
        speaking_style: 'Direct and concise',
        beliefs: 'Technology improves life',
        background: 'Built in 2026',
        posting_guidelines: 'Post once per day about tech',
        verification_type: 'gold',
        behavior_policy: JSON.stringify({
          actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
          engagementSelectivity: 0.7
        }),
        created_at: 1000,
        updated_at: 2000
      };

      const clone = JSON.parse(JSON.stringify(aiProfile));
      const actor = toActorFromProfile(aiProfile);

      // Verify purity (no mutation)
      expect(aiProfile).toEqual(clone);

      // Verify Identity
      expect(actor.identity).toEqual({
        id: 'dx-prof-1',
        handle: '@techbot',
        display_name: 'Tech Bot',
        actor_type: 'ai',
        verification_type: 'gold',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Just a bot talking tech',
        created_at: 1000,
        updated_at: 2000
      });

      // Verify Personality
      expect(actor.personality).toEqual({
        personality: 'Analytical and sharp',
        traits: 'logical, precise',
        interests: 'AI, coding, hardware',
        beliefs: 'Technology improves life',
        background: 'Built in 2026'
      });

      // Verify Content Profile
      expect(actor.contentProfile).toEqual({
        speaking_style: 'Direct and concise',
        posting_guidelines: 'Post once per day about tech'
      });

      // Verify Behavior Policy
      expect(actor.behaviorPolicy).toEqual({
        actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
        engagementSelectivity: 0.7
      });
    });

    it('maps minimal AI profile omitting optional component blocks', () => {
      const minimalAi: DreamXProfile = {
        id: 'dx-prof-min',
        display_name: 'Minimal AI',
        handle: '@minimal',
        created_at: 1000,
        updated_at: 1000
      };

      const actor = toActorFromProfile(minimalAi);

      expect(actor.identity.id).toBe('dx-prof-min');
      expect(actor.identity.actor_type).toBe('ai');
      expect(actor.identity.verification_type).toBe('none');
      expect(actor.personality).toBeUndefined();
      expect(actor.contentProfile).toBeUndefined();
      expect(actor.behaviorPolicy).toBeUndefined();
    });

    it('maps Human user profile to Actor domain model without autonomous policy', () => {
      const userProfile: DreamXUserProfile = {
        id: 'dx-user-1',
        display_name: 'Alice User',
        handle: '@alice',
        avatar_url: 'https://example.com/alice.png',
        bio: 'Human writer',
        personality: 'Friendly and curious',
        interests: 'Novels, Sci-Fi',
        writing_style: 'Narrative and descriptive',
        verification_type: 'blue',
        created_at: 500,
        updated_at: 1500
      };

      const clone = JSON.parse(JSON.stringify(userProfile));
      const actor = toActorFromUserProfile(userProfile);

      // Verify purity
      expect(userProfile).toEqual(clone);

      // Verify Identity
      expect(actor.identity).toEqual({
        id: 'dx-user-1',
        handle: '@alice',
        display_name: 'Alice User',
        actor_type: 'human',
        verification_type: 'blue',
        avatar_url: 'https://example.com/alice.png',
        bio: 'Human writer',
        created_at: 500,
        updated_at: 1500
      });

      // Verify Personality
      expect(actor.personality).toEqual({
        personality: 'Friendly and curious',
        interests: 'Novels, Sci-Fi'
      });

      // Verify Content Profile
      expect(actor.contentProfile).toEqual({
        writing_style: 'Narrative and descriptive'
      });

      // Crucial: Human actors must NOT have a synthetic autonomous BehaviorPolicy
      expect(actor.behaviorPolicy).toBeUndefined();
    });

    it('maps minimal Human user profile omitting empty component blocks', () => {
      const minimalUser: DreamXUserProfile = {
        id: 'dx-user-min',
        display_name: 'Min Human',
        handle: '@minhuman',
        created_at: 500,
        updated_at: 500
      };

      const actor = toActorFromUserProfile(minimalUser);

      expect(actor.identity.id).toBe('dx-user-min');
      expect(actor.identity.actor_type).toBe('human');
      expect(actor.identity.verification_type).toBe('none');
      expect(actor.personality).toBeUndefined();
      expect(actor.contentProfile).toBeUndefined();
      expect(actor.behaviorPolicy).toBeUndefined();
    });
  });

  describe('Unified Actor Resolution', () => {
    beforeEach(async () => {
      const db = getDatabase();
      // Insert human user
      await db.execute(`
        INSERT OR REPLACE INTO dreamx_user_profile (
          id, display_name, handle, avatar_url, bio, personality, interests, writing_style, verification_type, created_at, updated_at
        ) VALUES (
          'dx-user-bob', 'Bob Smith', '@bob', 'https://avatar.com/bob.jpg', 'Software Dev', 'Humorous', 'Tech', 'Casual', 'blue', 100, 200
        )
      `);

      // Insert AI profile
      await db.execute(`
        INSERT OR REPLACE INTO dreamx_profiles (
          id, display_name, handle, avatar_url, bio, personality, traits, interests, 
          speaking_style, beliefs, background, posting_guidelines, verification_type, behavior_policy, created_at, updated_at
        ) VALUES (
          'dx-prof-oracle', 'The Oracle', '@oracle', 'https://avatar.com/oracle.jpg', 'Prophet', 'Mysterious', 'cryptic', 'Futures',
          'Enigmatic', 'Destiny is real', 'Ancient AI', 'Speak in riddles', 'gold',
          '{"actionProbabilities":{"like":0.5,"reply":0.3,"post":0.1,"no_action":0.1},"engagementSelectivity":0.9}', 300, 400
        )
      `);
    });

    it('getActorById resolves human actor', async () => {
      const actor = await getActorById('dx-user-bob');
      expect(actor).toBeDefined();
      expect(actor?.identity.id).toBe('dx-user-bob');
      expect(actor?.identity.handle).toBe('@bob');
      expect(actor?.identity.display_name).toBe('Bob Smith');
      expect(actor?.identity.actor_type).toBe('human');
      expect(actor?.identity.verification_type).toBe('blue');
      expect(actor?.personality?.personality).toBe('Humorous');
      expect(actor?.contentProfile?.writing_style).toBe('Casual');
      expect(actor?.behaviorPolicy).toBeUndefined();
    });

    it('getActorById resolves AI actor', async () => {
      const actor = await getActorById('dx-prof-oracle');
      expect(actor).toBeDefined();
      expect(actor?.identity.id).toBe('dx-prof-oracle');
      expect(actor?.identity.handle).toBe('@oracle');
      expect(actor?.identity.display_name).toBe('The Oracle');
      expect(actor?.identity.actor_type).toBe('ai');
      expect(actor?.identity.verification_type).toBe('gold');
      expect(actor?.personality?.personality).toBe('Mysterious');
      expect(actor?.personality?.traits).toBe('cryptic');
      expect(actor?.contentProfile?.speaking_style).toBe('Enigmatic');
      expect(actor?.behaviorPolicy?.actionProbabilities.like).toBe(0.5);
    });

    it('getActorById returns undefined for unknown actor', async () => {
      const actor = await getActorById('non-existent-id');
      expect(actor).toBeUndefined();
    });

    it('getActorByHandle resolves both @-prefixed and non-prefixed handles case-insensitively', async () => {
      const human1 = await getActorByHandle('@bob');
      const human2 = await getActorByHandle('bob');
      const human3 = await getActorByHandle('@BOB');

      expect(human1).toBeDefined();
      expect(human1?.identity.id).toBe('dx-user-bob');
      expect(human2?.identity.id).toBe('dx-user-bob');
      expect(human3?.identity.id).toBe('dx-user-bob');

      const ai1 = await getActorByHandle('@oracle');
      const ai2 = await getActorByHandle('ORACLE');

      expect(ai1).toBeDefined();
      expect(ai1?.identity.id).toBe('dx-prof-oracle');
      expect(ai2?.identity.id).toBe('dx-prof-oracle');

      const missing = await getActorByHandle('@unknown_handle');
      expect(missing).toBeUndefined();
    });

    it('getActorsByIds performs bulk resolution preserving mixed actor types and identities', async () => {
      const actors = await getActorsByIds([
        'dx-user-bob',
        'dx-prof-oracle',
        'dx-nonexistent',
        'dx-user-bob' // test deduplication
      ]);

      expect(actors.length).toBe(2);
      const bob = actors.find(a => a.identity.id === 'dx-user-bob');
      const oracle = actors.find(a => a.identity.id === 'dx-prof-oracle');

      expect(bob).toBeDefined();
      expect(bob?.identity.actor_type).toBe('human');

      expect(oracle).toBeDefined();
      expect(oracle?.identity.actor_type).toBe('ai');
    });

    it('getActorsByIds returns empty array for empty input', async () => {
      const actors = await getActorsByIds([]);
      expect(actors).toEqual([]);
    });
  });
});
