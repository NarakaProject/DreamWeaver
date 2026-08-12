import { describe, it, expect } from 'vitest';
import { extractCyoaOptions, stripSpeakerPrefix, splitMultiSpeakerText } from './dreamgen';

describe('CYOA Options Parser & NPC Role Parsing', () => {
  it('extracts CYOA options wrapped inside <cyoa_options> XML tags', () => {
    const rawInput = `Rick looks around in confusion. "Where am I?"
<cyoa_options>
- 💬 Friendly Inquiry: "What is this place?"
- ⚙️ System Command: "/Start"
</cyoa_options>`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('Rick looks around in confusion. "Where am I?"');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe('💬 Friendly Inquiry');
    expect(result.options[0].content).toBe('What is this place?');
    expect(result.options[1].label).toBe('⚙️ System Command');
    expect(result.options[1].content).toBe('/Start');
  });

  it('extracts CYOA options under "Choose The Next Step Options:" header', () => {
    const rawInput = `The guards approach with arms raised.

Choose The Next Step Options:
1. ⚔️ Attack: "Draw your sword and charge."
2. 🛡️ Defend: "Hold position behind shield."`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('The guards approach with arms raised.');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe('⚔️ Attack');
    expect(result.options[0].content).toBe('Draw your sword and charge.');
  });

  it('strips character speaker prefixes from text body', () => {
    expect(stripSpeakerPrefix('Rick: "What the— where am I?"', 'Rick')).toBe('"What the— where am I?"');
    expect(stripSpeakerPrefix('[Speaker: Picard]: Make it so.', 'Picard')).toBe('Make it so.');
    expect(stripSpeakerPrefix('Summoned: *stumbles out*', 'Summoned')).toBe('*stumbles out*');
  });

  it('prevents AI model responses from falling back to User Persona', () => {
    const sections = splitMultiSpeakerText('I step out of the portal.', 'Summoned', 'Naraka');
    expect(sections).toHaveLength(1);
    expect(sections[0].speaker).toBe('Summoned');
    expect(sections[0].speaker).not.toBe('Naraka');
  });
});
