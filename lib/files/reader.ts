import fs from 'fs/promises';
import path from 'path';

export interface CharacterCard {
  id: string;
  name: string;
  avatar?: string;
  tagline?: string;
  personality: string;
  firstMessage: string;
  scenarioDescription?: string;
}

export interface WorldData {
  id: string;
  name: string;
  description: string;
  loreContent: string;
  characters: CharacterCard[];
}

const BASE_DATA_PATH = path.join(process.cwd(), 'data', 'worlds');

/**
 * Ensures the base worlds directory exists on local disk.
 */
export async function ensureDataDirectories(): Promise<void> {
  await fs.mkdir(BASE_DATA_PATH, { recursive: true });
}

/**
 * Reads all world directories, returning their metadata, lore markdown, and character cards.
 */
export async function loadAllWorlds(baseDir: string = BASE_DATA_PATH): Promise<WorldData[]> {
  try {
    await fs.mkdir(baseDir, { recursive: true });
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const worldDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const worlds: WorldData[] = [];
    for (const dirName of worldDirs) {
      const world = await loadWorldById(dirName, baseDir);
      if (world) {
        worlds.push(world);
      }
    }
    return worlds;
  } catch (err) {
    console.error('Error loading worlds:', err);
    return [];
  }
}

/**
 * Load a single world directory by ID/foldername.
 */
export async function loadWorldById(
  worldId: string,
  baseDir: string = BASE_DATA_PATH
): Promise<WorldData | null> {
  const worldPath = path.join(baseDir, worldId);
  try {
    const stats = await fs.stat(worldPath);
    if (!stats.isDirectory()) return null;

    // Load world_info.md lore
    let loreContent = '';
    let description = 'Custom Story World';
    const lorePath = path.join(worldPath, 'world_info.md');
    try {
      loreContent = await fs.readFile(lorePath, 'utf-8');
      const lines = loreContent.split('\n');
      const titleLine = lines.find((l) => l.startsWith('# '));
      if (titleLine) {
        description = titleLine.replace('# ', '').trim();
      }
    } catch {
      loreContent = '# ' + worldId + '\nA mysterious land full of secrets.';
    }

    // Load character cards from characters/ subdirectory or root of world folder
    const characters: CharacterCard[] = [];
    const charDir = path.join(worldPath, 'characters');
    try {
      const charEntries = await fs.readdir(charDir);
      for (const charFile of charEntries) {
        if (charFile.endsWith('.json')) {
          const charJson = await fs.readFile(path.join(charDir, charFile), 'utf-8');
          const parsed = JSON.parse(charJson);
          characters.push({
            id: parsed.id || path.basename(charFile, '.json'),
            name: parsed.name || 'Unnamed Character',
            avatar: parsed.avatar || '',
            tagline: parsed.tagline || '',
            personality: parsed.personality || '',
            firstMessage: parsed.firstMessage || '',
            scenarioDescription: parsed.scenarioDescription || '',
          });
        }
      }
    } catch {
      // no characters directory or empty
    }

    return {
      id: worldId,
      name: worldId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description,
      loreContent,
      characters,
    };
  } catch {
    return null;
  }
}

/**
 * Saves or updates a world's markdown lore content.
 */
export async function saveWorldLore(
  worldId: string,
  loreContent: string,
  baseDir: string = BASE_DATA_PATH
): Promise<void> {
  const worldPath = path.join(baseDir, worldId);
  await fs.mkdir(worldPath, { recursive: true });
  await fs.writeFile(path.join(worldPath, 'world_info.md'), loreContent, 'utf-8');
}

/**
 * Saves or updates a character JSON card.
 */
export async function saveCharacterCard(
  worldId: string,
  character: CharacterCard,
  baseDir: string = BASE_DATA_PATH
): Promise<void> {
  const charDir = path.join(baseDir, worldId, 'characters');
  await fs.mkdir(charDir, { recursive: true });
  const filename = `${character.id || character.name.toLowerCase().replace(/\s+/g, '_')}.json`;
  await fs.writeFile(path.join(charDir, filename), JSON.stringify(character, null, 2), 'utf-8');
}
