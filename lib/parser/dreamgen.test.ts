import { describe, it, expect } from 'vitest';
import { parseDreamGenText } from './dreamgen';

describe('DreamGen Parser (lib/parser/dreamgen.ts)', () => {
  it('should parse plain prose correctly', () => {
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

  it('should extract action text wrapped in asterisks', () => {
    const input = '*draws sword slowly* Stand your ground!';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe('action');
    expect(tokens[0].content).toBe('draws sword slowly');
    expect(tokens[0].isUnclosed).toBe(false);

    expect(tokens[1].type).toBe('prose');
    expect(tokens[1].content).toBe(' Stand your ground!');
  });

  it('should parse mixed dialogue, actions, and prose seamlessly', () => {
    const input = 'Aria looked back. *smiles gently* "Are you ready?" she asked.';
    const tokens = parseDreamGenText(input);

    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toMatchObject({ type: 'prose', content: 'Aria looked back. ' });
    expect(tokens[1]).toMatchObject({ type: 'action', content: 'smiles gently' });
    expect(tokens[2]).toMatchObject({ type: 'prose', content: ' ' });
    expect(tokens[3]).toMatchObject({ type: 'dialogue', content: 'Are you ready?' });
    expect(tokens[4]).toMatchObject({ type: 'prose', content: ' she asked.' });
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
