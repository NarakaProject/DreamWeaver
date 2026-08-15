import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCategoryDefinition,
  getArchetypeDefinition,
  registerCategory,
  registerArchetype,
  listCategories,
  listArchetypes,
  resetTaxonomyRegistry,
  BUILT_IN_CATEGORIES,
  BUILT_IN_ARCHETYPES,
  DEFAULT_CATEGORY_ID
} from './taxonomy';
import { toActorFromProfile, toActorFromUserProfile } from './actors';
import type { DreamXProfile, DreamXUserProfile, CategoryDefinition, ArchetypeDefinition } from './types';

describe('Phase D2 — Open Actor Taxonomy', () => {
  beforeEach(() => {
    resetTaxonomyRegistry();
  });

  afterEach(() => {
    resetTaxonomyRegistry();
  });

  describe('Built-in Taxonomy Registry', () => {
    it('resolves all built-in categories with metadata', () => {
      const individual = getCategoryDefinition('individual');
      expect(individual).toBeDefined();
      expect(individual.id).toBe('individual');
      expect(individual.label).toBe('Individual');

      const institution = getCategoryDefinition('institution');
      expect(institution.id).toBe('institution');

      const media = getCategoryDefinition('media');
      expect(media.id).toBe('media');

      const novelty = getCategoryDefinition('novelty');
      expect(novelty.id).toBe('novelty');
    });

    it('resolves all built-in archetypes', () => {
      const commentator = getArchetypeDefinition('commentator');
      expect(commentator).toBeDefined();
      expect(commentator?.id).toBe('commentator');
      expect(commentator?.category_id).toBe('individual');

      const journalist = getArchetypeDefinition('journalist');
      expect(journalist?.id).toBe('journalist');
      expect(journalist?.category_id).toBe('media');

      const satirist = getArchetypeDefinition('satirist');
      expect(satirist?.id).toBe('satirist');
      expect(satirist?.category_id).toBe('novelty');

      const spokesperson = getArchetypeDefinition('spokesperson');
      expect(spokesperson?.id).toBe('spokesperson');
      expect(spokesperson?.category_id).toBe('institution');

      const enthusiast = getArchetypeDefinition('enthusiast');
      expect(enthusiast?.id).toBe('enthusiast');
      expect(enthusiast?.category_id).toBe('individual');
    });

    it('lists all registered categories and archetypes', () => {
      const categories = listCategories();
      expect(categories.length).toBe(BUILT_IN_CATEGORIES.length);
      expect(categories.map(c => c.id)).toContain('individual');

      const archetypes = listArchetypes();
      expect(archetypes.length).toBe(BUILT_IN_ARCHETYPES.length);
      expect(archetypes.map(a => a.id)).toContain('commentator');
    });
  });

  describe('Open Taxonomy & Safe Fallbacks (Non-Breaking Custom Identifiers)', () => {
    it('returns a safe fallback definition for unknown category IDs without throwing', () => {
      const customCategory = getCategoryDefinition('crypto_analyst');
      expect(customCategory).toBeDefined();
      expect(customCategory.id).toBe('crypto_analyst');
      expect(customCategory.label).toBe('Crypto Analyst');
      expect(customCategory.metadata?.isCustom).toBe(true);

      const alienCategory = getCategoryDefinition('alien_entity');
      expect(alienCategory.id).toBe('alien_entity');
      expect(alienCategory.label).toBe('Alien Entity');
    });

    it('returns undefined for unknown archetype IDs without throwing', () => {
      const unknownArchetype = getArchetypeDefinition('shitposter');
      expect(unknownArchetype).toBeUndefined();

      const alienObserver = getArchetypeDefinition('non_human_observer');
      expect(alienObserver).toBeUndefined();
    });

    it('allows dynamic registration of new categories and archetypes without code changes', () => {
      const newCategory: CategoryDefinition = {
        id: 'academic_institution',
        label: 'Academic Institution',
        description: 'University, research lab, or think tank',
        metadata: { tier: 'higher_ed' }
      };

      registerCategory(newCategory);
      expect(getCategoryDefinition('academic_institution')).toEqual(newCategory);
      expect(listCategories().map(c => c.id)).toContain('academic_institution');

      const newArchetype: ArchetypeDefinition = {
        id: 'peer_reviewer',
        label: 'Peer Reviewer',
        description: 'Critiques scientific methodology and findings',
        category_id: 'academic_institution'
      };

      registerArchetype(newArchetype);
      expect(getArchetypeDefinition('peer_reviewer')).toEqual(newArchetype);
      expect(listArchetypes().map(a => a.id)).toContain('peer_reviewer');
    });
  });

  describe('Actor Domain Mapping with Taxonomy', () => {
    it('defaults AI profiles to individual category and empty archetypes when unspecified', () => {
      const aiProfile: DreamXProfile = {
        id: 'dx-prof-default',
        display_name: 'Generic AI',
        handle: '@generic',
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(aiProfile);
      expect(actor.taxonomy).toEqual({
        category: DEFAULT_CATEGORY_ID,
        archetypes: []
      });
      expect(actor.identity.actor_type).toBe('ai');
    });

    it('defaults Human user profiles to individual category and empty archetypes when unspecified', () => {
      const humanProfile: DreamXUserProfile = {
        id: 'dx-user-default',
        display_name: 'Regular Human',
        handle: '@regular',
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromUserProfile(humanProfile);
      expect(actor.taxonomy).toEqual({
        category: DEFAULT_CATEGORY_ID,
        archetypes: []
      });
      expect(actor.identity.actor_type).toBe('human');
    });

    it('preserves arbitrary/custom taxonomy on AI actors', () => {
      const customAi: DreamXProfile = {
        id: 'dx-prof-custom',
        display_name: 'Crypto Analyst Bot',
        handle: '@crypto_bot',
        category: 'crypto_analyst',
        archetypes: ['satirist', 'shitposter'],
        tags: ['web3', 'defi'],
        created_at: 1000,
        updated_at: 2000
      };

      const clone = JSON.parse(JSON.stringify(customAi));
      const actor = toActorFromProfile(customAi);

      // Verify non-mutation
      expect(customAi).toEqual(clone);

      expect(actor.taxonomy).toEqual({
        category: 'crypto_analyst',
        archetypes: ['satirist', 'shitposter'],
        tags: ['web3', 'defi']
      });
      expect(actor.identity.actor_type).toBe('ai');
    });

    it('preserves arbitrary/custom taxonomy on Human actors (alien_entity scenario)', () => {
      const customHuman: DreamXUserProfile = {
        id: 'dx-user-alien',
        display_name: 'Alien Observer',
        handle: '@alien',
        category: 'alien_entity',
        archetypes: ['non_human_observer'],
        tags: ['cosmic'],
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromUserProfile(customHuman);

      expect(actor.taxonomy).toEqual({
        category: 'alien_entity',
        archetypes: ['non_human_observer'],
        tags: ['cosmic']
      });
      expect(actor.identity.actor_type).toBe('human');
    });

    it('handles JSON string serialized archetypes gracefully', () => {
      const serializedProfile: any = {
        id: 'dx-prof-json',
        display_name: 'Serialized Bot',
        handle: '@serialized',
        category: 'institution',
        archetypes: JSON.stringify(['spokesperson', 'commentator']),
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(serializedProfile);
      expect(actor.taxonomy?.category).toBe('institution');
      expect(actor.taxonomy?.archetypes).toEqual(['spokesperson', 'commentator']);
    });

    it('does NOT infer or conflate verification badges with taxonomy categories', () => {
      // Gold badge does NOT mean celebrity or institution
      const goldUser: DreamXUserProfile = {
        id: 'dx-user-gold',
        display_name: 'Gold Human',
        handle: '@goldie',
        verification_type: 'gold',
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromUserProfile(goldUser);
      expect(actor.identity.verification_type).toBe('gold');
      expect(actor.taxonomy?.category).toBe('individual');
      expect(actor.taxonomy?.archetypes).toEqual([]);

      // Gray badge does NOT mean government
      const grayAi: DreamXProfile = {
        id: 'dx-prof-gray',
        display_name: 'Gray AI',
        handle: '@grayai',
        verification_type: 'gray',
        created_at: 1000,
        updated_at: 2000
      };

      const aiActor = toActorFromProfile(grayAi);
      expect(aiActor.identity.verification_type).toBe('gray');
      expect(aiActor.taxonomy?.category).toBe('individual');
    });

    it('preserves independent BehaviorPolicy when taxonomy is present', () => {
      const complexAi: DreamXProfile = {
        id: 'dx-prof-full',
        display_name: 'Full AI',
        handle: '@full',
        category: 'media',
        archetypes: ['journalist'],
        behavior_policy: JSON.stringify({
          actionProbabilities: { like: 0.2, reply: 0.5, post: 0.2, no_action: 0.1 },
          engagementSelectivity: 0.8
        }),
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(complexAi);
      expect(actor.taxonomy?.category).toBe('media');
      expect(actor.taxonomy?.archetypes).toEqual(['journalist']);
      expect(actor.behaviorPolicy?.actionProbabilities).toEqual({
        like: 0.2,
        reply: 0.5,
        post: 0.2,
        no_action: 0.1
      });
      expect(actor.behaviorPolicy?.engagementSelectivity).toBe(0.8);
    });
  });
});
