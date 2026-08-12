import { describe, it, expect } from 'vitest';
import { enhanceImagePrompt } from './image-prompt';

describe('Smart Image Prompt Enhancer (lib/gemini/image-prompt.ts)', () => {
  it('should enhance avatar character portrait prompts', () => {
    const prompt = enhanceImagePrompt('Aria Shadowstep rogue scout', 'avatar');
    expect(prompt).toContain('close-up character portrait');
    expect(prompt).toContain('Aria Shadowstep rogue scout');
    expect(prompt).toContain('dark cinematic lighting');
  });

  it('should enhance cover art prompts', () => {
    const prompt = enhanceImagePrompt('Shadows over Eldoria citadel', 'cover');
    expect(prompt).toContain('wide view cover art');
    expect(prompt).toContain('Shadows over Eldoria citadel');
    expect(prompt).toContain('8k resolution');
  });

  it('should enhance location environment prompts', () => {
    const prompt = enhanceImagePrompt('Obsidian Citadel Vault', 'location');
    expect(prompt).toContain('environmental concept art');
    expect(prompt).toContain('Obsidian Citadel Vault');
  });

  it('should enhance object artifact prompts', () => {
    const prompt = enhanceImagePrompt('Sunstone Relic', 'object');
    expect(prompt).toContain('centered item artifact');
    expect(prompt).toContain('Sunstone Relic');
  });

  it('should fallback gracefully when description is empty', () => {
    const prompt = enhanceImagePrompt('', 'avatar');
    expect(prompt).toContain('close-up character portrait');
    expect(prompt).toContain('heroic roleplay adventurer');
  });
});
