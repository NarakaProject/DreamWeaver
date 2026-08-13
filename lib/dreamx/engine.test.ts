import { describe, it, expect } from 'vitest';
import { normalizeSocialOutput, validateSocialOutput } from './engine';

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
