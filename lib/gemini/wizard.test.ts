import { describe, it, expect } from 'vitest';
import {
  buildFullScenarioPrompt,
  parseScenarioWizardJson,
  buildBlockCommandPrompt,
  buildLintAuditPrompt,
} from './wizard';

describe('Scenario Wizard & Meta-Designer Engine (lib/gemini/wizard.ts)', () => {
  it('should compile full scenario generation prompt containing premise and 12-block JSON schema', () => {
    const prompt = buildFullScenarioPrompt({
      idea: 'Deep sea submarine horror',
      genre: 'Sci-Fi Horror',
      tone: 'Grim, claustrophobic',
    });

    expect(prompt).toContain('Deep sea submarine horror');
    expect(prompt).toContain('Sci-Fi Horror');
    expect(prompt).toContain('"worldBuilding"');
    expect(prompt).toContain('"openingMessage"');
    expect(prompt).toContain('"scenarioNPCs"');
  });

  it('should parse valid JSON model output into FullScenario object', () => {
    const rawModelJson = `\`\`\`json
{
  "meta": {
    "id": "sub-horror",
    "title": "Submarine Abyss",
    "description": "Survive the deep ocean trench.",
    "category": "Horror",
    "tags": ["Sci-Fi", "Horror"],
    "mode": "roleplay"
  },
  "worldBuilding": {
    "setting": "An abyss station flooding with icy water.",
    "plot": "Fix the air scrubbers before oxygen depletes.",
    "style": "Claustrophobic 2nd person prose.",
    "narrator": "Game master.",
    "openingMessage": "*Sirens blare as water drips onto {{user}}'s collar.*",
    "history": "Station lost radio contact 1 hour ago.",
    "privateNotes": "SECRET: Hull rupture near reactor.",
    "locations": [
      { "id": "loc-1", "name": "Control Bridge", "description": "Blasted consoles and flashing red lights." }
    ],
    "scenarioNPCs": [
      { "id": "npc-1", "name": "Engineer Vance", "tagline": "Chief Engineer", "personality": "Panicked technician.", "avatar": "", "firstMessage": "\\\"The pumps are failing!\\\"" }
    ],
    "objects": [
      { "id": "obj-1", "name": "Oxygen Respirator", "description": "Emergency air tank.", "trigger_rule": "Provides 10 minutes of breathable air." }
    ],
    "examples": [],
    "images": {}
  },
  "suggestedPersonas": [
    { "id": "persona-1", "name": "Captain Miller", "tagline": "Sub Commander", "personality": "Resilient officer.", "avatar": "", "firstMessage": "" }
  ]
}
\`\`\``;

    const parsed = parseScenarioWizardJson(rawModelJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.meta.title).toBe('Submarine Abyss');
    expect(parsed?.worldBuilding.openingMessage).toContain('Sirens blare');
    expect(parsed?.worldBuilding.locations).toHaveLength(1);
    expect(parsed?.worldBuilding.scenarioNPCs).toHaveLength(1);
    expect(parsed?.worldBuilding.scenarioNPCs?.[0].name).toBe('Engineer Vance');
    expect(parsed?.worldBuilding.objects).toHaveLength(1);
    expect(parsed?.suggestedPersonas[0].name).toBe('Captain Miller');
  });

  it('should compile modular command prompts', () => {
    const dummyScenario: any = {
      meta: { title: 'Submarine Abyss', category: 'Horror' },
      worldBuilding: { setting: 'Flooded station', plot: 'Fix air scrubbers' },
    };

    const npcCmd = buildBlockCommandPrompt('/GENERATE CHARACTER', dummyScenario, 'Creepy mechanic NPC');
    expect(npcCmd).toContain('/GENERATE CHARACTER');
    expect(npcCmd).toContain('Submarine Abyss');
    expect(npcCmd).toContain('Creepy mechanic NPC');

    const compressCmd = buildBlockCommandPrompt('/COMPRESS', dummyScenario);
    expect(compressCmd).toContain('/COMPRESS');
  });

  it('should compile lint audit prompt', () => {
    const dummyScenario: any = {
      meta: { title: 'Submarine Abyss' },
      worldBuilding: {
        setting: 'Flooded station',
        plot: 'Fix air scrubbers',
        scenarioNPCs: [{ name: 'Vance' }],
        locations: [{ name: 'Bridge' }],
        objects: [{ name: 'Respirator' }],
      },
    };

    const lintPrompt = buildLintAuditPrompt(dummyScenario);
    expect(lintPrompt).toContain('Quality Auditor (/LINT)');
    expect(lintPrompt).toContain('Submarine Abyss');
    expect(lintPrompt).toContain('Vance');
  });
});
