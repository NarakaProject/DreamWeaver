import { describe, it, expect } from 'vitest';
import { parseWorldGenJson } from './importer';

describe('World-Gen JSON Importer Parser', () => {
  it('parses raw JSON string with World-Gen schema into 12 building blocks', () => {
    const rawJson = JSON.stringify({
      world_name: 'Naruto: Hidden Leaf Era',
      summary: 'A world of ninjas and jutsu.',
      genre: 'Anime Fantasy',
      lore: 'Konohagakure village under the Third Hokage.',
      scenario_plot: 'Investigate rogue ninja threats.',
      author_style: 'Descriptive anime action style.',
      directives: 'Focus on chakra battles and ninja code.',
      greeting: '*Naruto leaps onto the Hokage monument.*',
      items: [
        { name: 'Kunai', description: 'Standard ninja knife' },
      ],
      characters: [
        { name: 'Naruto Uzumaki', description: 'Nine-Tails Jinchuriki', greeting: 'I will be Hokage!' },
      ],
    });

    const parsed = parseWorldGenJson(rawJson);

    expect(parsed.meta.title).toBe('Naruto: Hidden Leaf Era');
    expect(parsed.meta.description).toBe('A world of ninjas and jutsu.');
    expect(parsed.meta.category).toBe('Anime Fantasy');
    expect(parsed.worldBuilding.setting).toBe('Konohagakure village under the Third Hokage.');
    expect(parsed.worldBuilding.plot).toBe('Investigate rogue ninja threats.');
    expect(parsed.worldBuilding.style).toBe('Descriptive anime action style.');
    expect(parsed.worldBuilding.narrator).toBe('Focus on chakra battles and ninja code.');
    expect(parsed.worldBuilding.openingMessage).toBe('*Naruto leaps onto the Hokage monument.*');
    expect(parsed.worldBuilding.objects).toHaveLength(1);
    expect(parsed.worldBuilding.objects[0].name).toBe('Kunai');
    expect(parsed.suggestedPersonas).toHaveLength(1);
    expect(parsed.suggestedPersonas[0].name).toBe('Naruto Uzumaki');
  });

  it('handles deeply nested World-Gen schema (Naruto JSON)', () => {
    const complexSchema = {
      scenario: {
        plot: {
          role: 'Game Master',
          purpose: 'Navigate Naruto through D-rank missions.',
          rules: ['Maintain chakra limits'],
        },
        setting: {
          world_state: 'Post Nine-Tails attack era.',
          time_period: 'Pre-Chunin Exams',
        },
        writing_style: {
          narrative_voice: '2nd Person Present',
          pacing: 'Dynamic action',
        },
        history: {
          previous_events: ['Nine-Tails attack 12 years ago', 'Graduation from Academy'],
        },
        characters: {
          player_character: {
            name: 'Naruto Uzumaki',
            role: 'Genin Ninja',
            personality: 'Energetic, determined, loud.',
            greeting: 'I will become Hokage!',
          },
          npcs: [
            { name: 'Kakashi Hatake', role: 'Team 7 Sensei', personality: 'Laid back genius.' },
          ],
        },
      },
    };

    const parsed = parseWorldGenJson(complexSchema);

    expect(parsed.meta.title).toBe('Naruto: Hidden Leaf Era');
    expect(parsed.worldBuilding.setting).toContain('Post Nine-Tails attack era');
    expect(parsed.worldBuilding.plot).toContain('Navigate Naruto through D-rank missions');
    expect(parsed.worldBuilding.style).toContain('2nd Person Present');
    expect(parsed.worldBuilding.history).toContain('Graduation from Academy');
    expect(parsed.suggestedPersonas[0].name).toBe('Naruto Uzumaki');
    expect(parsed.worldBuilding.scenarioNPCs).toHaveLength(1);
    expect(parsed.worldBuilding.scenarioNPCs![0].name).toBe('Kakashi Hatake');
  });

  it('handles nested scenario wrappers gracefully', () => {
    const raw = {
      scenario: {
        title: 'Cyberpunk 2099',
        description: 'Neon metropolis.',
        setting: 'Night City lower districts.',
        personas: [
          { name: 'V', personality: 'Mercenary' },
        ],
      },
    };

    const parsed = parseWorldGenJson(raw);
    expect(parsed.meta.title).toBe('Cyberpunk 2099');
    expect(parsed.worldBuilding.setting).toBe('Night City lower districts.');
    expect(parsed.suggestedPersonas[0].name).toBe('V');
  });
});
