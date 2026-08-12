import { describe, it, expect } from 'vitest';
import {
  buildSystemInstruction,
  assembleGeminiPayload,
  ChatMessage,
  DEFAULT_GEMINI_MODEL,
} from './client';

describe('Gemini Client & Context Assembly (lib/gemini/client.ts)', () => {
  it('should construct rich system instruction with world lore & character persona', () => {
    const sysPrompt = buildSystemInstruction({
      characterName: 'Aria Silverblade',
      characterPersonality: 'Sharp, agile thief with a heart of gold.',
      worldLore: '# Eldoria World\nA dark realm filled with ancient ruins.',
      scenarioDescription: 'Trapped in the imperial dungeon.',
    });

    expect(sysPrompt).toContain('DreamWeaver');
    expect(sysPrompt).toContain('Aria Silverblade');
    expect(sysPrompt).toContain('Eldoria World');
    expect(sysPrompt).toContain('SPOKEN DIALOGUE MUST be enclosed in double quotes');
  });

  it('should default to gemini-2.5-flash model constant', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-2.5-flash');
  });

  it('should sort messages chronologically and preserve narrative order', () => {
    const messages: ChatMessage[] = [
      { id: '3', role: 'model', content: '"We are trapped," Aria whispered.', timestamp: 3000 },
      { id: '1', role: 'user', content: 'Inspect the door lock', type: 'do', timestamp: 1000 },
      { id: '2', role: 'model', content: '*scratches head* The lock is jammed.', timestamp: 2000 },
    ];

    const payload = assembleGeminiPayload({
      characterName: 'Aria',
      messages,
      maxRecentMessages: 10,
    });

    // Because consecutive 'model' turns are merged for Gemini API format:
    expect(payload.contents).toHaveLength(2);
    expect(payload.contents[0].role).toBe('user');
    expect(payload.contents[0].parts[0].text).toContain('[Action]: Inspect the door lock');

    // Second content item is the merged model turn
    expect(payload.contents[1].role).toBe('model');
    expect(payload.contents[1].parts[0].text).toContain('lock is jammed');
    expect(payload.contents[1].parts[0].text).toContain('We are trapped');
  });

  it('should limit recent messages according to maxRecentMessages parameter', () => {
    const messages: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'model',
      content: `Turn number ${i}`,
      timestamp: 1000 + i * 10,
    }));

    const payload = assembleGeminiPayload({
      messages,
      maxRecentMessages: 10,
    });

    // Should contain last 10 messages
    expect(payload.contents.length).toBeLessThanOrEqual(10);
    const lastContent = payload.contents[payload.contents.length - 1].parts[0].text;
    expect(lastContent).toContain('Turn number 49');
  });
});
