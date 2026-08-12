import { describe, it, expect } from 'vitest';
import {
  buildSystemInstruction,
  assembleGeminiPayload,
  ChatMessage,
  DEFAULT_GEMINI_MODEL,
} from './client';

describe('Gemini Client & Identity Rules (lib/gemini/client.ts)', () => {
  it('should enforce strict User Agency and Identity Separation rules', () => {
    const sysPrompt = buildSystemInstruction({
      characterName: 'Naraka',
      characterPersonality: 'Captured soldier seeking escape.',
      settingLore: 'Obsidian dungeon cell.',
      plotHooks: 'Bribe guard or pick lock.',
    });

    expect(sysPrompt).toContain('ABSOLUTE IDENTITY SEPARATION & USER AGENCY RULES');
    expect(sysPrompt).toContain('You MUST NEVER generate actions, thoughts, feelings, or spoken dialogue for the User\'s Persona (User Name: "Naraka")');
    expect(sysPrompt).toContain('ZERO AGENT OVERREACH');
    expect(sysPrompt).toContain('USER PERSONA (PLAYER IDENTITY - DO NOT ROLEPLAY AS THIS USER)');
  });

  it('should synthesize all 12 building blocks into structured prompt payload', () => {
    const sysPrompt = buildSystemInstruction({
      characterName: 'Valerius',
      characterPersonality: 'Shadow infiltrator.',
      settingLore: 'Twilight continent of Eldoria.',
      plotHooks: 'Infiltrate Obsidian Citadel vault.',
      historyContent: ' Cultists stole the Sunstone 3 days ago.',
      narratorDirectives: 'Maintain suspense and track movement.',
      writingStyle: '2nd-person present POV dark prose.',
      locations: [
        { id: 'vault', name: 'Obsidian Citadel Vault', description: 'Underground volcanic chamber.' },
      ],
      scenarioNPCs: [
        { id: 'aria', name: 'Aria Shadowstep', tagline: 'Master Scout', personality: 'Quick-witted scout.' },
      ],
      customObjects: [
        { id: 'sunstone', name: 'Sunstone Relic', description: 'Thermal rune stone.', trigger_rule: 'Illuminates room.' },
      ],
    });

    expect(sysPrompt).toContain('KEY SCENE LOCATIONS & GROUNDING:');
    expect(sysPrompt).toContain('Obsidian Citadel Vault');
    expect(sysPrompt).toContain('RECENT HISTORY & BACKSTORY:');
    expect(sysPrompt).toContain('SCENARIO COMPANIONS & NPCS:');
    expect(sysPrompt).toContain('Aria Shadowstep');
    expect(sysPrompt).toContain('ACTIVE CUSTOM OBJECTS & CYOA MECHANICS:');
    expect(sysPrompt).not.toContain('privateNotes');
  });

  it('should default to gemini-3.6-flash model constant', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.6-flash');
  });

  it('should include target speaker directive when specified', () => {
    const sysPrompt = buildSystemInstruction({
      characterName: 'Naraka',
      targetSpeaker: 'Orelia Windborn',
    });

    expect(sysPrompt).toContain('TURN SPEAKER DIRECTIVE:');
    expect(sysPrompt).toContain('Respond specifically as: "Orelia Windborn"');
  });

  it('should sort messages chronologically and preserve narrative order', () => {
    const messages: ChatMessage[] = [
      { id: '3', role: 'model', content: '"We are trapped," Aria whispered.', timestamp: 3000, speaker: 'Aria' },
      { id: '1', role: 'user', content: 'Inspect the door lock', type: 'do', timestamp: 1000, speaker: 'Naraka' },
      { id: '2', role: 'model', content: '*scratches head* The lock is jammed.', timestamp: 2000, speaker: 'Narrator' },
    ];

    const payload = assembleGeminiPayload({
      characterName: 'Naraka',
      messages,
      maxRecentMessages: 10,
    });

    expect(payload.contents).toHaveLength(2);
    expect(payload.contents[0].role).toBe('user');
    expect(payload.contents[0].parts[0].text).toContain('[Naraka]: [Action]: Inspect the door lock');

    expect(payload.contents[1].role).toBe('model');
    expect(payload.contents[1].parts[0].text).toContain('lock is jammed');
  });
});
