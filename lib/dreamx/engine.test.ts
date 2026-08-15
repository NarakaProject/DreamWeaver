import { describe, it, expect } from 'vitest';
import { normalizeSocialOutput, validateSocialOutput, buildDreamXSystemInstruction } from './engine';
import type { Actor, DreamXProfile } from './types';

describe('DreamX Social Output Validation & Quality Guards', () => {
  it('normalizes reasoning tags, markdown fences, and quotes', () => {
    const raw = '<think>I should post something witty</think> "Definitely key! Now, if only I could find a better way to balance both."';
    const cleaned = normalizeSocialOutput(raw);
    expect(cleaned).toBe('Definitely key! Now, if only I could find a better way to balance both.');
  });

  it('approves complete valid AI generation', () => {
    const raw = 'Definitely key! Now, if only I could find a better way to balance both.';
    const result = validateSocialOutput(raw, 'stop');
    expect(result.isValid).toBe(true);
    expect(result.normalizedText).toBe('Definitely key! Now, if only I could find a better way to balance both.');
  });

  it('rejects provider max_tokens / length truncation', () => {
    const raw = 'Definitely key! Now, if only I could find a better way to balance both.';
    const result = validateSocialOutput(raw, 'length');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Truncated by provider max_tokens limit');
  });

  it('rejects empty or whitespace-only generation', () => {
    const result = validateSocialOutput('   ', 'stop');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Empty response');
  });

  it('rejects generation ending in dangling prepositions/words', () => {
    const raw = 'Definitely key! Now, if only I could find';
    const result = validateSocialOutput(raw, 'stop');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Incomplete sentence ending in dangling word');
  });

  it('rejects generation ending in dangling punctuation', () => {
    const raw = 'Definitely key! Now, if only I could-';
    const result = validateSocialOutput(raw, 'stop');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Incomplete sentence ending in dangling punctuation');
  });

  it('rejects generation with unclosed quotation marks', () => {
    const raw = 'Definitely key! "Now, if only I could find a better way to balance both.';
    const result = validateSocialOutput(raw, 'stop');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Unclosed quotation mark');
  });
});

describe('DreamX System Instruction Composition (D7)', () => {
  it('builds system instruction from compositional Actor domain layers', () => {
    const actor: Actor = {
      identity: {
        id: 'dx-actor-1',
        handle: '@techcritic',
        display_name: 'Tech Critic',
        actor_type: 'ai',
        verification_type: 'gold',
        bio: 'Dissecting software paradigms.',
        created_at: 1000,
        updated_at: 2000
      },
      taxonomy: {
        category: 'media',
        archetypes: ['journalist', 'commentator'],
        tags: ['tech', 'analysis']
      },
      personality: {
        summary: 'Analytical and sharp',
        traits: ['skeptical', 'precise'],
        interests: ['distributed systems', 'compilers'],
        beliefs: 'Open standards ensure resilience',
        background: 'Veteran systems engineer'
      },
      contentProfile: {
        style: 'Concise, dry wit, technical bullet points',
        topics: ['rust', 'databases'],
        patterns: ['architecture reviews', 'benchmarks'],
        guidelines: ['Cite sources', 'Keep under 280 characters'],
        bias: 'Pro-open-source'
      },
      behaviorPolicy: {
        actionProbabilities: { like: 0.3, reply: 0.5, post: 0.1, no_action: 0.1 },
        engagementSelectivity: 0.8
      }
    };

    const instruction = buildDreamXSystemInstruction(actor);

    // Identity
    expect(instruction).toContain('You are @techcritic');
    expect(instruction).toContain('Name: Tech Critic');
    expect(instruction).toContain('Bio: Dissecting software paradigms.');

    // Taxonomy (D2/D6)
    expect(instruction).toContain('Category: media');
    expect(instruction).toContain('Archetypes: journalist, commentator');

    // Personality (D3)
    expect(instruction).toContain('Summary: Analytical and sharp');
    expect(instruction).toContain('Traits: skeptical, precise');
    expect(instruction).toContain('Interests: distributed systems, compilers');
    expect(instruction).toContain('Beliefs: Open standards ensure resilience');

    // Content Profile (D5)
    expect(instruction).toContain('Style: Concise, dry wit, technical bullet points');
    expect(instruction).toContain('Topics: rust, databases');
    expect(instruction).toContain('Guidelines: Cite sources; Keep under 280 characters');

    // Rules
    expect(instruction).toContain('CRITICAL RULES:');

    // Behavior policy must NOT be leaked into prompt
    expect(instruction).not.toContain('actionProbabilities');
    expect(instruction).not.toContain('engagementSelectivity');
  });

  it('builds system instruction from legacy DreamXProfile with seamless normalization', () => {
    const legacyProfile: DreamXProfile = {
      id: 'dx-prof-legacy',
      handle: '@legacy_bot',
      display_name: 'Legacy Bot',
      bio: 'Old bot',
      personality: 'Humorous',
      traits: 'witty, fast',
      interests: 'memes, code',
      speaking_style: 'Casual lowercase',
      posting_guidelines: 'Post once daily',
      created_at: 1000,
      updated_at: 2000
    };

    const instruction = buildDreamXSystemInstruction(legacyProfile);

    expect(instruction).toContain('You are @legacy_bot');
    expect(instruction).toContain('Name: Legacy Bot');
    expect(instruction).toContain('Bio: Old bot');
    expect(instruction).toContain('Summary: Humorous');
    expect(instruction).toContain('Style: Casual lowercase');
    expect(instruction).toContain('Guidelines: Post once daily');
  });

  it('(LOW-01) normalizes objects with malformed or empty identity objects gracefully', () => {
    const malformed = {
      identity: {},
      id: 'dx-prof-malformed',
      handle: '@malformed_bot',
      display_name: 'Malformed Bot',
      created_at: 1000,
      updated_at: 2000
    } as any;

    const instruction = buildDreamXSystemInstruction(malformed);
    expect(instruction).toContain('You are @malformed_bot');
    expect(instruction).toContain('Name: Malformed Bot');
  });
});
