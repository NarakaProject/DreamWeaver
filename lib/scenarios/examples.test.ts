import { describe, it, expect } from 'vitest';
import { normalizePromptExample, PromptExample } from './reader';
import { buildSystemInstruction } from '../gemini/client';

describe('DreamGen Multi-Turn Interaction Tree Examples', () => {
  it('normalizes legacy user/model pair to multi-turn interactions tree', () => {
    const legacy: PromptExample = {
      user: 'I demand entry to the castle.',
      model: 'The guards cross their spears with a sharp clang.',
    };

    const normalized = normalizePromptExample(legacy);
    expect(normalized.id).toBeDefined();
    expect(normalized.description).toBe('');
    expect(normalized.options).toHaveLength(0);
    expect(normalized.interactions).toHaveLength(2);
    expect(normalized.interactions[0].role).toBe('user');
    expect(normalized.interactions[0].content).toBe('I demand entry to the castle.');
    expect(normalized.interactions[1].role).toBe('Narrator');
    expect(normalized.interactions[1].content).toBe('The guards cross their spears with a sharp clang.');
  });

  it('preserves multi-turn interaction trees with CYOA options', () => {
    const fullTree: PromptExample = {
      id: 'ex-101',
      description: 'Demonstration of stealth infiltration and distraction choices',
      options: [
        { id: 'opt-1', label: '🪨 Throw Rock', content: 'I toss a small stone into the bushes.' },
        { id: 'opt-2', label: '🗡️ Silent Takedown', content: 'I creep up behind the sentry.' },
      ],
      interactions: [
        { id: 'it-1', role: 'user', content: 'I throw a stone into the bushes to distract the guard.' },
        { id: 'it-2', role: 'Narrator', content: 'The sentry turns towards the rustling foliage, hand resting on sword hilt.' },
        { id: 'it-3', role: 'Sentry Guard', content: '"Who goes there? Show yourself!"' },
      ],
    };

    const normalized = normalizePromptExample(fullTree);
    expect(normalized.id).toBe('ex-101');
    expect(normalized.description).toContain('stealth infiltration');
    expect(normalized.options).toHaveLength(2);
    expect(normalized.interactions).toHaveLength(3);
    expect(normalized.interactions[2].role).toBe('Sentry Guard');
  });

  it('compiles multi-turn example trees into Gemini system prompt payload', () => {
    const example: PromptExample = {
      id: 'ex-202',
      description: 'Combat spellcasting tutorial',
      options: [{ id: 'o1', label: '🔥 Cast Fireball', content: 'I chant the incantation for Fireball.' }],
      interactions: [
        { id: 'i1', role: 'user', content: 'I cast Fireball at the shadow beast.' },
        { id: 'i2', role: 'Narrator', content: 'Flames burst from your hands, illuminating the obsidian chamber.' },
      ],
    };

    const promptText = buildSystemInstruction({
      fewShotExamples: [example],
    });

    expect(promptText).toContain('FEW-SHOT ROLEPLAY REFERENCE EXAMPLES');
    expect(promptText).toContain('Combat spellcasting tutorial');
    expect(promptText).toContain('[🔥 Cast Fireball]');
    expect(promptText).toContain('[Speaker: user]: I cast Fireball at the shadow beast.');
    expect(promptText).toContain('[Speaker: Narrator]: Flames burst from your hands');
  });
});
