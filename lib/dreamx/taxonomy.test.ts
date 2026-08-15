import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCategoryDefinition,
  getArchetypeDefinition,
  registerCategory,
  registerArchetype,
  listCategories,
  listArchetypes,
  resetTaxonomyRegistry,
  createDefaultCategoryDefinition,
  createDefaultArchetypeDefinition,
  composeTaxonomy,
  resolveTaxonomyComposition,
  renderTaxonomyDescription,
  BUILT_IN_CATEGORIES,
  BUILT_IN_ARCHETYPES,
  DEFAULT_CATEGORY_ID
} from './taxonomy';
import { toActorFromProfile, toActorFromUserProfile } from './actors';
import type { DreamXProfile, DreamXUserProfile, CategoryDefinition, ArchetypeDefinition, ActorTaxonomy } from './types';

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

describe('Phase D6 — Archetype Composition', () => {
  beforeEach(() => {
    resetTaxonomyRegistry();
  });

  afterEach(() => {
    resetTaxonomyRegistry();
  });

  describe('composeTaxonomy()', () => {
    it('A. defaults category to "individual" and archetypes to [] when empty or missing', () => {
      expect(composeTaxonomy()).toEqual({
        category: 'individual',
        archetypes: []
      });
      expect(composeTaxonomy(null)).toEqual({
        category: 'individual',
        archetypes: []
      });
      expect(composeTaxonomy({})).toEqual({
        category: 'individual',
        archetypes: []
      });
      expect(composeTaxonomy({ category: '  ' })).toEqual({
        category: 'individual',
        archetypes: []
      });
    });

    it('B. normalizes whitespace across category, archetypes, and tags', () => {
      const result = composeTaxonomy({
        category: ' celebrity ',
        archetypes: ['  attention_seeking  ', ' commentator '],
        tags: [' famous ', ' public ']
      });

      expect(result).toEqual({
        category: 'celebrity',
        archetypes: ['attention_seeking', 'commentator'],
        tags: ['famous', 'public']
      });
    });

    it('C. deduplicates archetype IDs while preserving first-seen order', () => {
      const result = composeTaxonomy({
        category: 'media',
        archetypes: ['journalist', 'journalist', 'satirist', 'journalist']
      });

      expect(result).toEqual({
        category: 'media',
        archetypes: ['journalist', 'satirist']
      });
    });

    it('D. preserves exact original order when deduplicating', () => {
      const result = composeTaxonomy({
        category: 'individual',
        archetypes: ['z', 'a', 'z', 'b']
      });

      expect(result.archetypes).toEqual(['z', 'a', 'b']);
    });

    it('E. parses JSON array strings for archetypes and tags', () => {
      const result = composeTaxonomy({
        category: 'media',
        archetypes: '["journalist", "satirist"]',
        tags: '["breaking", "politics"]'
      });

      expect(result).toEqual({
        category: 'media',
        archetypes: ['journalist', 'satirist'],
        tags: ['breaking', 'politics']
      });
    });

    it('F. parses comma-separated strings for archetypes and tags', () => {
      const result = composeTaxonomy({
        category: 'media',
        archetypes: 'journalist, satirist, commentator',
        tags: 'news, live, analysis'
      });

      expect(result).toEqual({
        category: 'media',
        archetypes: ['journalist', 'satirist', 'commentator'],
        tags: ['news', 'live', 'analysis']
      });
    });

    it('G. normalizes tags with trimming, deduplication, and empty removal', () => {
      const result = composeTaxonomy({
        category: 'celebrity',
        archetypes: ['attention_seeking'],
        tags: 'famous, public, famous,   , trending '
      });

      expect(result.tags).toEqual(['famous', 'public', 'trending']);
    });

    it('H. preserves custom categories without rejection', () => {
      expect(composeTaxonomy('celebrity').category).toBe('celebrity');
      expect(composeTaxonomy('government').category).toBe('government');
      expect(composeTaxonomy('alien_entity').category).toBe('alien_entity');
    });

    it('K. guarantees composition purity (does not mutate input objects/arrays)', () => {
      const input = {
        category: 'media',
        archetypes: ['journalist', 'satirist'],
        tags: ['news', 'live']
      };
      const clone = JSON.parse(JSON.stringify(input));

      const composed = composeTaxonomy(input);
      expect(input).toEqual(clone);
      expect(composed.archetypes).not.toBe(input.archetypes);
      expect(composed.tags).not.toBe(input.tags);
    });
  });

  describe('resolveTaxonomyComposition()', () => {
    it('I. resolves custom archetypes with safe fallback definitions marked isCustom: true', () => {
      const customArchetypeDef = createDefaultArchetypeDefinition('attention_seeking', 'celebrity');
      expect(customArchetypeDef).toEqual({
        id: 'attention_seeking',
        label: 'Attention Seeking',
        description: 'Custom or user-defined archetype: attention_seeking',
        category_id: 'celebrity',
        metadata: { isCustom: true }
      });
    });

    it('J. resolves composite taxonomy with multiple archetypes in original order', () => {
      const taxonomy: ActorTaxonomy = {
        category: 'media',
        archetypes: ['journalist', 'satirist', 'custom_whistleblower'],
        tags: ['investigative']
      };

      const resolved = resolveTaxonomyComposition(taxonomy);

      // Category resolved from built-in
      expect(resolved.category.id).toBe('media');
      expect(resolved.category.label).toBe('Media');

      // 3 archetypes resolved in order
      expect(resolved.archetypes.length).toBe(3);
      expect(resolved.archetypes[0].id).toBe('journalist');
      expect(resolved.archetypes[0].metadata?.isCustom).toBeUndefined();

      expect(resolved.archetypes[1].id).toBe('satirist');
      expect(resolved.archetypes[1].metadata?.isCustom).toBeUndefined();

      expect(resolved.archetypes[2].id).toBe('custom_whistleblower');
      expect(resolved.archetypes[2].label).toBe('Custom Whistleblower');
      expect(resolved.archetypes[2].metadata?.isCustom).toBe(true);

      expect(resolved.tags).toEqual(['investigative']);
    });

    it('L. guarantees resolution purity (never mutates input taxonomy or aliases arrays)', () => {
      const taxonomy: ActorTaxonomy = {
        category: 'celebrity',
        archetypes: ['attention_seeking', 'commentator'],
        tags: ['public']
      };
      const clone = JSON.parse(JSON.stringify(taxonomy));

      const resolved = resolveTaxonomyComposition(taxonomy);
      expect(taxonomy).toEqual(clone);
      expect(resolved.tags).not.toBe(taxonomy.tags);
      expect(resolved.tags).toEqual(['public']);
    });
  });

  describe('renderTaxonomyDescription()', () => {
    it('M. renders clean semantic description for category, archetypes, and tags', () => {
      const taxonomy: ActorTaxonomy = {
        category: 'celebrity',
        archetypes: ['attention_seeking', 'commentator'],
        tags: ['famous', 'public']
      };

      const description = renderTaxonomyDescription(taxonomy);
      expect(description).toContain('Category: celebrity');
      expect(description).toContain('Archetypes: attention_seeking, commentator');
      expect(description).toContain('Tags: famous, public');
    });

    it('N. guarantees prompt isolation (no LLM system instructions or behavioral directives)', () => {
      const taxonomy: ActorTaxonomy = {
        category: 'novelty',
        archetypes: ['satirist'],
        tags: ['memes']
      };

      const description = renderTaxonomyDescription(taxonomy);
      expect(description).not.toContain('You are');
      expect(description).not.toContain('CRITICAL RULES');
      expect(description).not.toContain('actionProbabilities');
    });

    it('returns empty string when taxonomy is null or undefined', () => {
      expect(renderTaxonomyDescription(undefined)).toBe('');
      expect(renderTaxonomyDescription(null)).toBe('');
    });
  });

  describe('Actor Mapper Integration & Invariants (O, P, Q)', () => {
    it('O. maps AI profile using canonical composeTaxonomy', () => {
      const profile: DreamXProfile = {
        id: 'dx-prof-d6',
        display_name: 'Celebrity Bot',
        handle: '@celeb_bot',
        category: 'celebrity',
        archetypes: ['attention_seeking', 'commentator'],
        tags: ['vip', 'verified'],
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(profile);
      expect(actor.taxonomy).toEqual({
        category: 'celebrity',
        archetypes: ['attention_seeking', 'commentator'],
        tags: ['vip', 'verified']
      });
      expect(actor.identity.actor_type).toBe('ai');
    });

    it('P & Q. maps Human user profile using composeTaxonomy without behavior policy', () => {
      const userProfile: DreamXUserProfile = {
        id: 'dx-user-d6',
        display_name: 'Celebrity Human',
        handle: '@celeb_human',
        category: 'celebrity',
        archetypes: ['attention_seeking'],
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromUserProfile(userProfile);
      expect(actor.taxonomy).toEqual({
        category: 'celebrity',
        archetypes: ['attention_seeking']
      });
      expect(actor.identity.actor_type).toBe('human');
      expect(actor.behaviorPolicy).toBeUndefined();
    });
  });
});
