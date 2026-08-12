import { describe, it, expect } from 'vitest';
import { parseDreamGenText, splitMultiSpeakerText } from './dreamgen';

describe('DreamGen Parser & Typography (lib/parser/dreamgen.ts)', () => {
  it('should parse plain prose narration correctly', () => {
    const input = 'The wind whispered softly through the ancient pines.';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('prose');
    expect(tokens[0].content).toBe('The wind whispered softly through the ancient pines.');
  });

  it('should extract spoken dialogue in quotes', () => {
    const input = '"We must proceed with caution," she whispered.';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('dialogue');
    expect(tokens[0].content).toBe('We must proceed with caution,');
    expect(tokens[0].isUnclosed).toBe(false);

    expect(tokens[1].type).toBe('prose');
    expect(tokens[1].content).toBe(' she whispered.');
  });

  it('should parse bold syntax inside prose and dialogue', () => {
    const input = 'She held the **Sunstone Relic**. "Watch out for **shadows**!"';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('prose');
    const proseBoldSpan = tokens[0].spans.find((s) => s.isBold);
    expect(proseBoldSpan?.text).toBe('Sunstone Relic');

    expect(tokens[1].type).toBe('dialogue');
    const dialogueBoldSpan = tokens[1].spans.find((s) => s.isBold);
    expect(dialogueBoldSpan?.text).toBe('shadows');
  });

  it('should parse explicit italic inside dialogue', () => {
    const input = '"Did you hear *that* noise?" Aria asked.';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('dialogue');
    const italicSpan = tokens[0].spans.find((s) => s.isItalic);
    expect(italicSpan?.text).toBe('that');
  });

  it('should split multi-speaker AI responses into distinct sections', () => {
    const rawAiText = `[Speaker: Ignis Emberheart] *Ignis grins.* "Let us proceed."

[Narrator] The ancient iron gates swing open with a sharp groan.`;

    const sections = splitMultiSpeakerText(rawAiText, 'Narrator');

    expect(sections).toHaveLength(2);
    expect(sections[0].speaker).toBe('Ignis Emberheart');
    expect(sections[0].content).toBe('*Ignis grins.* "Let us proceed."');

    expect(sections[1].speaker).toBe('Narrator');
    expect(sections[1].content).toBe('The ancient iron gates swing open with a sharp groan.');
  });

  it('should strip raw speaker tags from parsed tokens', () => {
    const inputWithTag = '[Speaker: Aria Shadowstep] "Stay low," Aria whispers.';
    const tokens = parseDreamGenText(inputWithTag);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('dialogue');
    expect(tokens[0].content).toBe('Stay low,');
    expect(tokens[1].type).toBe('prose');
    expect(tokens[1].content).toBe(' Aria whispers.');
  });

  it('should handle unclosed quotes during streaming gracefully', () => {
    const streamingInput = '"Wait for me, I am coming';
    const tokens = parseDreamGenText(streamingInput);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('dialogue');
    expect(tokens[0].content).toBe('Wait for me, I am coming');
    expect(tokens[0].isUnclosed).toBe(true);
  });
});
