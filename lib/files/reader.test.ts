import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  saveWorldLore,
  saveCharacterCard,
  loadWorldById,
  loadAllWorlds,
  CharacterCard,
} from './reader';

const TEST_DIR = path.join(process.cwd(), 'temp_test_data');

describe('Local File Reader (lib/files/reader.ts)', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should save and load markdown world lore correctly', async () => {
    const worldId = 'test-realm';
    const lore = '# The Ancient Realm\nA land of shadows and ancient technology.';

    await saveWorldLore(worldId, lore, TEST_DIR);
    const loadedWorld = await loadWorldById(worldId, TEST_DIR);

    expect(loadedWorld).not.toBeNull();
    expect(loadedWorld?.id).toBe('test-realm');
    expect(loadedWorld?.loreContent).toBe(lore);
  });

  it('should save and load character cards JSON correctly', async () => {
    const worldId = 'test-realm';
    const character: CharacterCard = {
      id: 'aria-rogue',
      name: 'Aria Silverblade',
      tagline: 'Master Thief of Eldoria',
      personality: 'Cunning, quick-witted, fiercely loyal.',
      firstMessage: '"Keep your hands where I can see them," Aria warns.',
      scenarioDescription: 'Trapped inside the sunken vault.',
    };

    await saveWorldLore(worldId, '# Test Realm', TEST_DIR);
    await saveCharacterCard(worldId, character, TEST_DIR);

    const loadedWorld = await loadWorldById(worldId, TEST_DIR);
    expect(loadedWorld?.characters).toHaveLength(1);
    expect(loadedWorld?.characters[0].name).toBe('Aria Silverblade');
    expect(loadedWorld?.characters[0].firstMessage).toContain('Keep your hands');
  });

  it('should list all loaded worlds in directory', async () => {
    await saveWorldLore('world-1', '# World One', TEST_DIR);
    await saveWorldLore('world-2', '# World Two', TEST_DIR);

    const worlds = await loadAllWorlds(TEST_DIR);
    expect(worlds).toHaveLength(2);
    const ids = worlds.map((w) => w.id);
    expect(ids).toContain('world-1');
    expect(ids).toContain('world-2');
  });
});
