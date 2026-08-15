import { describe, it, expect } from 'vitest';
import {
  normalizeContentProfile,
  normalizeGuidelines,
  normalizeContentStringList,
  renderContentProfileDescription
} from './contentProfile';
import { toActorFromProfile, toActorFromUserProfile } from './actors';
import type { ActorContentProfile, DreamXProfile, DreamXUserProfile } from './types';

describe('Phase D5 — Content Profile Domain Layer', () => {
  describe('normalizeGuidelines Utility', () => {
    it('returns undefined for empty, null, or undefined inputs', () => {
      expect(normalizeGuidelines(undefined)).toBeUndefined();
      expect(normalizeGuidelines(null)).toBeUndefined();
      expect(normalizeGuidelines('')).toBeUndefined();
      expect(normalizeGuidelines('   ')).toBeUndefined();
      expect(normalizeGuidelines([])).toBeUndefined();
    });

    it('preserves single freeform natural prose without destroying comma boundaries', () => {
      const prose = 'Keep posts conversational. Ask questions. React to tech and culture news naturally.';
      const normalized = normalizeGuidelines(prose);
      expect(normalized).toEqual([
        'Keep posts conversational. Ask questions. React to tech and culture news naturally.'
      ]);
    });

    it('splits newline-separated guidelines cleanly', () => {
      const multiline = 'Keep posts conversational.\nAsk questions.\nReact to tech and culture news naturally.';
      const normalized = normalizeGuidelines(multiline);
      expect(normalized).toEqual([
        'Keep posts conversational.',
        'Ask questions.',
        'React to tech and culture news naturally.'
      ]);
    });

    it('normalizes JSON array strings safely', () => {
      const jsonArr = '["Post once daily", "Include benchmarks", "Keep under 280 chars"]';
      const normalized = normalizeGuidelines(jsonArr);
      expect(normalized).toEqual([
        'Post once daily',
        'Include benchmarks',
        'Keep under 280 chars'
      ]);
    });

    it('normalizes string arrays by trimming and removing empty items', () => {
      const arr = ['  Post once per day  ', '', '   ', 'Reply with insights '];
      const normalized = normalizeGuidelines(arr);
      expect(normalized).toEqual(['Post once per day', 'Reply with insights']);
    });
  });

  describe('normalizeContentStringList Utility', () => {
    it('normalizes comma-delimited strings for topics/patterns', () => {
      const str = ' cryptography, distributed systems , security ';
      expect(normalizeContentStringList(str)).toEqual(['cryptography', 'distributed systems', 'security']);
    });

    it('normalizes string arrays and filters empty items', () => {
      const arr = ['AI', ' ', 'Robotics'];
      expect(normalizeContentStringList(arr)).toEqual(['AI', 'Robotics']);
    });
  });

  describe('normalizeContentProfile', () => {
    it('returns undefined for empty or undefined input', () => {
      expect(normalizeContentProfile(undefined)).toBeUndefined();
      expect(normalizeContentProfile(null)).toBeUndefined();
      expect(normalizeContentProfile({})).toBeUndefined();
      expect(normalizeContentProfile({ style: '   ', guidelines: [] })).toBeUndefined();
    });

    it('maps string input directly to canonical style', () => {
      expect(normalizeContentProfile('Casual and sarcastic')).toEqual({
        style: 'Casual and sarcastic'
      });
    });

    it('respects style precedence: explicit style > speaking_style > writing_style', () => {
      const res1 = normalizeContentProfile({
        style: 'Explicit Style',
        speaking_style: 'AI Speaking Style',
        writing_style: 'Human Writing Style'
      });
      expect(res1?.style).toBe('Explicit Style');

      const res2 = normalizeContentProfile({
        speaking_style: 'AI Speaking Style',
        writing_style: 'Human Writing Style'
      });
      expect(res2?.style).toBe('AI Speaking Style');

      const res3 = normalizeContentProfile({
        writing_style: 'Human Writing Style'
      });
      expect(res3?.style).toBe('Human Writing Style');
    });

    it('respects guidelines precedence: explicit guidelines > posting_guidelines', () => {
      const res1 = normalizeContentProfile({
        guidelines: ['Explicit guideline 1', 'Explicit guideline 2'],
        posting_guidelines: 'Legacy posting guideline string'
      });
      expect(res1?.guidelines).toEqual(['Explicit guideline 1', 'Explicit guideline 2']);

      const res2 = normalizeContentProfile({
        posting_guidelines: 'Legacy posting guideline string'
      });
      expect(res2?.guidelines).toEqual(['Legacy posting guideline string']);
    });

    it('preserves all populated domain fields without mutating input', () => {
      const input = {
        style: 'Analytical',
        topics: ['AI', 'Tech'],
        patterns: ['Asks questions', 'Shares data'],
        guidelines: ['Keep under 280 chars'],
        bias: 'Pro-open-source'
      };
      const clone = JSON.parse(JSON.stringify(input));

      const normalized = normalizeContentProfile(input);
      expect(input).toEqual(clone);
      expect(normalized).toEqual(input);
    });
  });

  describe('renderContentProfileDescription', () => {
    it('returns empty string for undefined input', () => {
      expect(renderContentProfileDescription(undefined)).toBe('');
    });

    it('renders all populated fields deterministically without prompt boilerplate', () => {
      const profile: ActorContentProfile = {
        style: 'Formal and technical',
        topics: ['distributed-systems', 'consensus'],
        patterns: ['architecture reviews', 'benchmarks'],
        guidelines: ['Link to source code', 'Cite whitepapers'],
        bias: 'Decentralization-focused'
      };

      const rendered = renderContentProfileDescription(profile);

      expect(rendered).toContain('Style: Formal and technical');
      expect(rendered).toContain('Topics: distributed-systems, consensus');
      expect(rendered).toContain('Patterns: architecture reviews, benchmarks');
      expect(rendered).toContain('Guidelines: Link to source code; Cite whitepapers');
      expect(rendered).toContain('Bias: Decentralization-focused');

      // Crucial: Must NOT contain LLM system prompt instructions or behavioral rules
      expect(rendered).not.toContain('You are');
      expect(rendered).not.toContain('CRITICAL RULES');
      expect(rendered).not.toContain('actionProbabilities');
    });
  });

  describe('Actor Mappers with D5 ContentProfile', () => {
    it('maps AI profile: speaking_style -> style, posting_guidelines -> guidelines', () => {
      const aiProfile: DreamXProfile = {
        id: 'dx-prof-ai-1',
        display_name: 'Tech Bot',
        handle: '@techbot',
        speaking_style: 'Direct and concise',
        posting_guidelines: 'Post once per day about tech',
        personality: 'Sharp',
        traits: 'logical',
        interests: 'AI, coding',
        beliefs: 'Open source wins',
        background: 'Created in 2026',
        created_at: 1000,
        updated_at: 2000
      };

      const actor = toActorFromProfile(aiProfile);

      expect(actor.contentProfile).toEqual({
        style: 'Direct and concise',
        guidelines: ['Post once per day about tech']
      });

      // Semantic isolation: topics, patterns, bias must NOT be fabricated from personality
      expect(actor.contentProfile?.topics).toBeUndefined();
      expect(actor.contentProfile?.patterns).toBeUndefined();
      expect(actor.contentProfile?.bias).toBeUndefined();

      // Ensure personality remains intact and separate
      expect(actor.personality?.summary).toBe('Sharp');
      expect(actor.personality?.interests).toEqual(['AI', 'coding']);
      expect(actor.personality?.beliefs).toBe('Open source wins');

      // Actor type remains AI
      expect(actor.identity.actor_type).toBe('ai');
    });

    it('maps Human profile: writing_style -> style, leaves AI fields and autonomous behavior undefined', () => {
      const humanProfile: DreamXUserProfile = {
        id: 'dx-user-human-1',
        display_name: 'Alice Human',
        handle: '@alice',
        writing_style: 'Narrative and descriptive',
        personality: 'Curious',
        interests: 'Novels, Sci-Fi',
        created_at: 500,
        updated_at: 1500
      };

      const actor = toActorFromUserProfile(humanProfile);

      expect(actor.contentProfile).toEqual({
        style: 'Narrative and descriptive'
      });

      // Human must NOT have guidelines, topics, patterns, bias fabricated
      expect(actor.contentProfile?.guidelines).toBeUndefined();
      expect(actor.contentProfile?.topics).toBeUndefined();
      expect(actor.contentProfile?.patterns).toBeUndefined();
      expect(actor.contentProfile?.bias).toBeUndefined();

      // Human must NOT have autonomous behavior policy
      expect(actor.behaviorPolicy).toBeUndefined();

      // Actor type remains human
      expect(actor.identity.actor_type).toBe('human');
    });

    it('leaves contentProfile undefined when profile has no style or guidelines', () => {
      const minimalAi: DreamXProfile = {
        id: 'dx-prof-min',
        display_name: 'Min Bot',
        handle: '@minbot',
        created_at: 1000,
        updated_at: 1000
      };

      const actor = toActorFromProfile(minimalAi);
      expect(actor.contentProfile).toBeUndefined();
    });
  });
});
