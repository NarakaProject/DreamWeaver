import { describe, it, expect } from 'vitest';
import { extractCyoaOptions, stripSpeakerPrefix, splitMultiSpeakerText } from './dreamgen';

describe('Narrator Text Sanitization & NPC Role Parsing', () => {
  it('strips any lingering <cyoa_options> or <cyoaoptions> XML tags from narrative text', () => {
    const rawInput = `Rick looks around in confusion. "Where am I?"
<cyoaoptions>
- 💬 Friendly Inquiry: "What is this place?"
- ⚙️ System Command: "/Start"
</cyoaoptions>`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('Rick looks around in confusion. "Where am I?"');
    expect(result.cleanText).not.toContain('<cyoaoptions>');
    expect(result.cleanText).not.toContain('</cyoaoptions>');
  });

  it('handles unclosed <cyoaoptions> tags by stripping them completely', () => {
    const rawInput = `Rick steps through the portal.
<cyoaoptions>
- 💬 Ask Rick: "Are you okay?"`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('Rick steps through the portal.');
    expect(result.cleanText).not.toContain('<cyoaoptions>');
  });

  it('strips speaker prefixes across ALL lines in a multi-line response payload', () => {
    const multilineInput = `Rick: "What the— where am I?"
Rick: *looks around the lab in disbelief*
Rick: "This isn't my dimension."`;

    const cleaned = stripSpeakerPrefix(multilineInput, 'Rick');
    expect(cleaned).not.toContain('Rick:');
    expect(cleaned).toContain('"What the— where am I?"');
    expect(cleaned).toContain('*looks around the lab in disbelief*');
    expect(cleaned).toContain('"This isn\'t my dimension."');
  });

  it('prevents AI model responses from falling back to User Persona', () => {
    const sections = splitMultiSpeakerText('I step out of the portal.', 'Rick Sanchez', 'Naraka');
    expect(sections).toHaveLength(1);
    expect(sections[0].speaker).toBe('Rick Sanchez');
    expect(sections[0].speaker).not.toBe('Naraka');
  });

  it('sanitizes template placeholder names like npc_name_or_description to canonical NPC or Narrator', () => {
    const sections = splitMultiSpeakerText('Greetings traveler.', 'Koro-sensei', 'Naraka');
    expect(sections[0].speaker).toBe('Koro-sensei');

    const placeholderSections = splitMultiSpeakerText('[Speaker: npc_name_or_description]: Hello', 'Koro-sensei', 'Naraka');
    expect(placeholderSections[0].speaker).toBe('Koro-sensei');
    expect(placeholderSections[0].speaker).not.toBe('npc_name_or_description');
  });
});
