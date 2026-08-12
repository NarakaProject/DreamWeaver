import { describe, it, expect } from 'vitest';
import { formatOpenAIMessages, DEFAULT_MODELS } from './provider-router';

describe('Multi-Provider Router Helpers', () => {
  it('formats system instruction and user/model messages into OpenAI format', () => {
    const system = 'You are a Game Master.';
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'model' as const, content: 'Welcome to the realm.' },
    ];

    const formatted = formatOpenAIMessages(system, messages);
    expect(formatted).toHaveLength(3);
    expect(formatted[0]).toEqual({ role: 'system', content: 'You are a Game Master.' });
    expect(formatted[1]).toEqual({ role: 'user', content: 'Hello' });
    expect(formatted[2]).toEqual({ role: 'assistant', content: 'Welcome to the realm.' });
  });

  it('defines default models for all 3 supported AI providers', () => {
    expect(DEFAULT_MODELS.gemini).toContain('gemini');
    expect(DEFAULT_MODELS.groq).toBe('llama-3.3-70b-versatile');
    expect(DEFAULT_MODELS.openrouter).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });
});
