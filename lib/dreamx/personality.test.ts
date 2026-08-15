import { describe, it, expect } from 'vitest';
import {
  normalizePersonality,
  normalizeStringList,
  renderPersonalityDescription
} from './personality';
import { toActorFromProfile, toActorFromUserProfile } from './actors';
import type { ActorPersonality, DreamXProfile, DreamXUserProfile } from './types';

describe('Phase D3 — Personality Layer', () => {
  describe('normalizeStringList Utility', () => {
    it('returns undefined for empty, null, or undefined inputs', () => {
      expect(normalizeStringList(undefined)).toBeUndefined();
      expect(normalizeStringList(null)).toBeUndefined();
      expect(normalizeStringList('')).toBeUndefined();
      expect(normalizeStringList('   ')).toBeUndefined();
      expect(normalizeStringList([])).toBeUndefined();
    });

    it('normalizes comma-delimited strings with whitespace trimming', () => {
      const input = ' analytical , cynical,  sarcastic ';
      const normalized = normalizeStringList(input);
      expect(normalized).toEqual(['analytical', 'cynical', 'sarcastic']);
    });

    it('normalizes already-structured string arrays and filters empty items', () => {
      const input = [' AI ', '', '  coding ', 'hardware  '];
      const normalized = normalizeStringList(input);
      expect(normalized).toEqual(['AI', 'coding', 'hardware']);
    });

    it('normalizes JSON array strings safely', () => {
      const input = '["news", "politics", "economy"]';
      const normalized = normalizeStringList(input);
      expect(normalized).toEqual(['news', 'politics', 'economy']);
    });
  });

  describe('normalizePersonality', () => {
    it('maps legacy string input directly to summary', () => {
      const result = normalizePersonality('Sharp and witty commentator');
      expect(result).toEqual({
        summary: 'Sharp and witty commentator'
      });
    });

    it('returns undefined for empty object or undefined input', () => {
      expect(normalizePersonality(undefined)).toBeUndefined();
      expect(normalizePersonality(null)).toBeUndefined();
      expect(normalizePersonality({})).toBeUndefined();
      expect(normalizePersonality({ summary: '   ', traits: [], interests: '' })).toBeUndefined();
    });

    it('normalizes legacy personality property into summary', () => {
      const result = normalizePersonality({
        personality: 'Eccentric hacker',
        traits: 'cynical, brilliant',
        interests: 'cryptography, dark web',
        beliefs: 'Information wants to be free',
        background: 'Born in the 90s cyber underground'
      });

      expect(result).toEqual({
        summary: 'Eccentric hacker',
        traits: ['cynical', 'brilliant'],
        interests: ['cryptography', 'dark web'],
        beliefs: 'Information wants to be free',
        background: 'Born in the 90s cyber underground'
      });
    });

    it('prefers explicit summary when both summary and personality are present (Summary Precedence Rule)', () => {
      const result = normalizePersonality({
        summary: 'Canonical Summary',
        personality: 'Legacy Personality String'
      });

      expect(result?.summary).toBe('Canonical Summary');
    });

    it('does not mutate input objects (Purity Guarantee)', () => {
      const input = {
        summary: 'Non-mutated Persona',
        traits: ['loyal', 'brave'],
        interests: ['strategy']
      };
      const clone = JSON.parse(JSON.stringify(input));

      normalizePersonality(input);
      expect(input).toEqual(clone);
    });
  });

  describe('renderPersonalityDescription', () => {
    it('returns empty string for undefined personality', () => {
      expect(renderPersonalityDescription(undefined)).toBe('');
    });

    it('renders all populated semantic fields deterministically without prompt instructions', () => {
      const personality: ActorPersonality = {
        summary: 'Analytical and sharp',
        traits: ['logical', 'precise'],
        interests: ['AI', 'hardware'],
        beliefs: 'Technology improves life',
        background: 'Built in 2026'
      };

      const rendered = renderPersonalityDescription(personality);

      expect(rendered).toContain('Summary: Analytical and sharp');
      expect(rendered).toContain('Traits: logical, precise');
      expect(rendered).toContain('Interests: AI, hardware');
      expect(rendered).toContain('Beliefs: Technology improves life');
      expect(rendered).toContain('Background: Built in 2026');

      // Crucial: Must NOT contain LLM system prompt instructions or behavioral rules
      expect(rendered).not.toContain('CRITICAL RULES');
      expect(rendered).not.toContain('Generate ONLY');
      expect(rendered).not.toContain('actionProbabilities');
      expect(rendered).not.toContain('speaking_style');
    });

    it('renders partial personality omitting missing fields cleanly', () => {
      const partial: ActorPersonality = {
        summary: 'Simple persona',
        interests: ['novels']
      };

      const rendered = renderPersonalityDescription(partial);
      expect(rendered).toBe('Summary: Simple persona\nInterests: novels');
    });
  });

  describe('Actor Mappers with D3 Personality', () => {
    it('maps AI profile: legacy personality -> summary, traits & interests to arrays, preserves beliefs/background', () => {
      const aiProfile: DreamXProfile = {
        id: 'dx-prof-ai-1',
        display_name: 'Tech Bot',
        handle: '@techbot',
        personality: 'Analytical and sharp',
        traits: 'logical, precise',
        interests: 'AI, coding, hardware',
        beliefs: 'Technology improves life',
        background: 'Built in 2026',
        speaking_style: 'Direct and concise',
        posting_guidelines: 'Post once per day about tech',
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(aiProfile);

      expect(actor.personality).toEqual({
        summary: 'Analytical and sharp',
        traits: ['logical', 'precise'],
        interests: ['AI', 'coding', 'hardware'],
        beliefs: 'Technology improves life',
        background: 'Built in 2026'
      });

      // Assert ContentProfile fields remain outside Personality
      expect(actor.personality).not.toHaveProperty('speaking_style');
      expect(actor.personality).not.toHaveProperty('posting_guidelines');
      expect(actor.contentProfile?.style).toBe('Direct and concise');
      expect(actor.contentProfile?.guidelines).toEqual(['Post once per day about tech']);
    });

    it('maps Human user profile: legacy personality -> summary, interests to array, does not invent AI fields', () => {
      const humanProfile: DreamXUserProfile = {
        id: 'dx-user-human-1',
        display_name: 'Alice',
        handle: '@alice',
        personality: 'Friendly and curious',
        interests: 'Novels, Sci-Fi',
        writing_style: 'Narrative and descriptive',
        created_at: 500,
        updated_at: 1500
      };

      const actor = toActorFromUserProfile(humanProfile);

      expect(actor.personality).toEqual({
        summary: 'Friendly and curious',
        interests: ['Novels', 'Sci-Fi']
      });

      // Human must NOT have traits, beliefs, background invented
      expect(actor.personality?.traits).toBeUndefined();
      expect(actor.personality?.beliefs).toBeUndefined();
      expect(actor.personality?.background).toBeUndefined();

      // writing_style must remain in contentProfile, not personality
      expect(actor.personality).not.toHaveProperty('writing_style');
      expect(actor.contentProfile?.style).toBe('Narrative and descriptive');

      // Human must NOT have synthetic behaviorPolicy
      expect(actor.behaviorPolicy).toBeUndefined();
    });

    it('leaves personality undefined when profile has no semantic persona fields', () => {
      const blankAi: DreamXProfile = {
        id: 'dx-prof-blank',
        display_name: 'Blank AI',
        handle: '@blank',
        created_at: 1000,
        updated_at: 1000
      };

      const actor = toActorFromProfile(blankAi);
      expect(actor.personality).toBeUndefined();
    });
  });
});
