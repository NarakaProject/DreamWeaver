import { describe, it, expect } from 'vitest';
import { extractCyoaOptions, stripSpeakerPrefix, splitMultiSpeakerText } from './dreamgen';

describe('CYOA Options Parser & NPC Role Parsing', () => {
  it('extracts CYOA options wrapped inside <cyoa_options> or <cyoaoptions> XML tags without leaving raw tags', () => {
    const rawInput = `Rick looks around in confusion. "Where am I?"
<cyoaoptions>
- 💬 Friendly Inquiry: "What is this place?"
- ⚙️ System Command: "/Start"
</cyoaoptions>`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('Rick looks around in confusion. "Where am I?"');
    expect(result.cleanText).not.toContain('<cyoaoptions>');
    expect(result.cleanText).not.toContain('</cyoaoptions>');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe('💬 Friendly Inquiry');
    expect(result.options[0].content).toBe('What is this place?');
    expect(result.options[1].label).toBe('⚙️ System Command');
    expect(result.options[1].content).toBe('/Start');
  });

  it('handles unclosed <cyoaoptions> tags gracefully', () => {
    const rawInput = `Rick steps through the portal.
<cyoaoptions>
- 💬 Ask Rick: "Are you okay?"`;

    const result = extractCyoaOptions(rawInput);
    expect(result.cleanText).toBe('Rick steps through the portal.');
    expect(result.cleanText).not.toContain('<cyoaoptions>');
    expect(result.options).toHaveLength(1);
    expect(result.options[0].label).toBe('💬 Ask Rick');
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
});
