import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  saveScenario,
  loadScenarioById,
  loadAllScenarios,
  FullScenario,
} from './reader';

const TEST_SCENARIOS_DIR = path.join(process.cwd(), 'temp_test_scenarios');

describe('Scenario Reader & 12 Building Blocks (lib/scenarios/reader.ts)', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_SCENARIOS_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_SCENARIOS_DIR, { recursive: true, force: true });
  });

  it('should save and load all 12 building blocks', async () => {
    const scenario: FullScenario = {
      meta: {
        id: 'test-12-blocks',
        title: 'Cyberpunk Heist 2077',
        description: 'Hack into Arasaka mainframe.',
        category: 'Cyberpunk',
        tags: ['Sci-Fi', 'Action', 'CYOA'],
        mode: 'roleplay',
        coverImage: '/assets/covers/cyberpunk.jpg',
      },
      worldBuilding: {
        setting: 'Night City neon streets.',
        plot: 'Retrieve the encrypted datachip.',
        style: 'Gritty, fast-paced 2nd-person cyberpunk dialogue.',
        narrator: 'Act as a Cyberpunk Game Master.',
        history: 'Yesterday the netrunner infiltrated squad 4.',
        privateNotes: 'SECRET: Trap inside the server room.',
        locations: [
          {
            id: 'arasaka_tower',
            name: 'Arasaka Tower Server Subfloor',
            description: 'Coolant tubes and glowing fiber cables.',
          },
        ],
        scenarioNPCs: [
          {
            id: 'alt',
            name: 'Alt Cunningham',
            tagline: 'Legendary Netrunner',
            personality: 'Brilliant, transcendent, mysterious.',
            avatar: '/assets/avatars/alt.jpg',
            firstMessage: '"You should not have come here."',
          },
        ],
        objects: [
          {
            id: 'cyberdeck',
            name: 'Militech Cyberdeck',
            description: 'High-end hacking deck.',
            trigger_rule: 'Grants quickhacks during combat.',
          },
        ],
        examples: [
          {
            user: '[Action]: Jack into terminal',
            model: 'Data streams past your retinas.',
          },
        ],
        images: {
          coverImage: '/assets/covers/cyberpunk.jpg',
          backgroundImage: '/assets/bg/neon.jpg',
        },
      },
      suggestedPersonas: [
        {
          id: 'v_netrunner',
          name: 'V',
          tagline: 'Solo Netrunner',
          personality: 'Cynical, skilled, loyal.',
          avatar: '/assets/avatars/v.jpg',
          firstMessage: '"Jack in before security responds."',
        },
      ],
    };

    await saveScenario(scenario, TEST_SCENARIOS_DIR);
    const loaded = await loadScenarioById('test-12-blocks', TEST_SCENARIOS_DIR);

    expect(loaded).not.toBeNull();
    expect(loaded?.meta.title).toBe('Cyberpunk Heist 2077');
    expect(loaded?.worldBuilding.history).toContain('infiltrated squad 4');
    expect(loaded?.worldBuilding.privateNotes).toContain('Trap inside the server room');
    expect(loaded?.worldBuilding.locations).toHaveLength(1);
    expect(loaded?.worldBuilding.locations?.[0].name).toBe('Arasaka Tower Server Subfloor');
    expect(loaded?.worldBuilding.scenarioNPCs).toHaveLength(1);
    expect(loaded?.worldBuilding.scenarioNPCs?.[0].name).toBe('Alt Cunningham');
    expect(loaded?.worldBuilding.objects).toHaveLength(1);
    expect(loaded?.worldBuilding.objects[0].name).toBe('Militech Cyberdeck');
    expect(loaded?.suggestedPersonas).toHaveLength(1);
    expect(loaded?.suggestedPersonas[0].name).toBe('V');
  });

  it('should list all loaded scenarios', async () => {
    const s1: FullScenario = {
      meta: { id: 's1', title: 'Scenario 1', description: 'Desc 1', category: 'General', tags: [], mode: 'roleplay' },
      worldBuilding: { setting: '', plot: '', style: '', narrator: '', objects: [], examples: [] },
      suggestedPersonas: [],
    };
    const s2: FullScenario = {
      meta: { id: 's2', title: 'Scenario 2', description: 'Desc 2', category: 'General', tags: [], mode: 'story' },
      worldBuilding: { setting: '', plot: '', style: '', narrator: '', objects: [], examples: [] },
      suggestedPersonas: [],
    };

    await saveScenario(s1, TEST_SCENARIOS_DIR);
    await saveScenario(s2, TEST_SCENARIOS_DIR);

    const dummyLegacy = path.join(process.cwd(), 'temp_dummy_legacy');
    const scenarios = await loadAllScenarios(TEST_SCENARIOS_DIR, dummyLegacy);
    expect(scenarios).toHaveLength(2);
  });
});
