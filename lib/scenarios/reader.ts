import fs from 'fs/promises';
import path from 'path';
import {
  FullScenario,
  ScenarioMeta,
  WorldBuilding,
  PersonaTemplate,
} from './types';

export * from './types';

const BASE_SCENARIOS_PATH = path.join(process.cwd(), 'data', 'scenarios');
const LEGACY_WORLDS_PATH = path.join(process.cwd(), 'data', 'worlds');

/**
 * Loads all scenarios from /data/scenarios/ with fallback migration for legacy /data/worlds/
 */
export async function loadAllScenarios(
  scenariosDir: string = BASE_SCENARIOS_PATH,
  legacyDir: string = LEGACY_WORLDS_PATH
): Promise<FullScenario[]> {
  const scenarios: FullScenario[] = [];

  try {
    await fs.mkdir(scenariosDir, { recursive: true });
    const entries = await fs.readdir(scenariosDir, { withFileTypes: true });
    const scenarioDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const dirName of scenarioDirs) {
      const scenario = await loadScenarioById(dirName, scenariosDir);
      if (scenario) {
        scenarios.push(scenario);
      }
    }
  } catch (err) {
    console.error('Error loading scenarios:', err);
  }

  // Fallback migration: check if legacy worlds exist and convert them on-the-fly
  try {
    const legacyExists = await fs.stat(legacyDir).then((s) => s.isDirectory()).catch(() => false);
    if (legacyExists) {
      const legacyEntries = await fs.readdir(legacyDir, { withFileTypes: true });
      const legacyDirs = legacyEntries.filter((e) => e.isDirectory()).map((e) => e.name);

      for (const dirName of legacyDirs) {
        if (!scenarios.some((s) => s.meta.id === dirName)) {
          const converted = await convertLegacyWorldToScenario(dirName, legacyDir);
          if (converted) {
            scenarios.push(converted);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error migrating legacy worlds:', err);
  }

  return scenarios;
}

/**
 * Loads a single scenario by ID/folder name.
 */
export async function loadScenarioById(
  scenarioId: string,
  baseDir: string = BASE_SCENARIOS_PATH
): Promise<FullScenario | null> {
  const scenarioFolder = path.join(baseDir, scenarioId);
  try {
    const stats = await fs.stat(scenarioFolder);
    if (!stats.isDirectory()) return null;

    // Load scenario.json
    const metaPath = path.join(scenarioFolder, 'scenario.json');
    const metaRaw = await fs.readFile(metaPath, 'utf-8');
    const metaJson = JSON.parse(metaRaw);

    const meta: ScenarioMeta = {
      id: metaJson.id || scenarioId,
      title: metaJson.title || scenarioId,
      description: metaJson.description || 'No description provided.',
      category: metaJson.category || 'General',
      tags: Array.isArray(metaJson.tags) ? metaJson.tags : [],
      mode: metaJson.mode === 'story' ? 'story' : 'roleplay',
      coverImage: metaJson.coverImage || '',
    };

    // Load world_building.json
    let worldBuilding: WorldBuilding = {
      setting: '',
      plot: '',
      style: 'Atmospheric, evocative prose.',
      narrator: 'Act as an interactive RPG Game Master.',
      history: '',
      privateNotes: '',
      objects: [],
      locations: [],
      examples: [],
      scenarioNPCs: [],
      images: {},
    };
    try {
      const wbPath = path.join(scenarioFolder, 'world_building.json');
      const wbRaw = await fs.readFile(wbPath, 'utf-8');
      const wbJson = JSON.parse(wbRaw);
      worldBuilding = {
        setting: wbJson.setting || '',
        plot: wbJson.plot || '',
        style: wbJson.style || 'Atmospheric, evocative prose.',
        narrator: wbJson.narrator || 'Act as an interactive RPG Game Master.',
        openingMessage: wbJson.openingMessage || '',
        history: wbJson.history || '',
        privateNotes: wbJson.privateNotes || '',
        objects: Array.isArray(wbJson.objects) ? wbJson.objects : [],
        locations: Array.isArray(wbJson.locations) ? wbJson.locations : [],
        examples: Array.isArray(wbJson.examples) ? wbJson.examples : [],
        scenarioNPCs: Array.isArray(wbJson.scenarioNPCs) ? wbJson.scenarioNPCs : [],
        images: wbJson.images || {},
      };
    } catch {
      // default world building if missing
    }

    // Load suggested_personas.json
    let suggestedPersonas: PersonaTemplate[] = [];
    try {
      const personasPath = path.join(scenarioFolder, 'suggested_personas.json');
      const personasRaw = await fs.readFile(personasPath, 'utf-8');
      suggestedPersonas = JSON.parse(personasRaw);
    } catch {
      // empty if missing
    }

    return { meta, worldBuilding, suggestedPersonas };
  } catch {
    return null;
  }
}

/**
 * Saves or updates a complete scenario to disk.
 */
export async function saveScenario(
  scenario: FullScenario,
  baseDir: string = BASE_SCENARIOS_PATH
): Promise<void> {
  const scenarioFolder = path.join(baseDir, scenario.meta.id);
  await fs.mkdir(scenarioFolder, { recursive: true });

  await fs.writeFile(
    path.join(scenarioFolder, 'scenario.json'),
    JSON.stringify(scenario.meta, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(scenarioFolder, 'world_building.json'),
    JSON.stringify(scenario.worldBuilding, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(scenarioFolder, 'suggested_personas.json'),
    JSON.stringify(scenario.suggestedPersonas, null, 2),
    'utf-8'
  );
}

/**
 * Deletes a scenario folder from disk by ID.
 */
export async function deleteScenario(
  scenarioId: string,
  baseDir: string = BASE_SCENARIOS_PATH
): Promise<void> {
  const scenarioFolder = path.join(baseDir, scenarioId);
  try {
    await fs.rm(scenarioFolder, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to delete scenario directory ${scenarioFolder}:`, err);
  }
}

/**
 * Legacy World Converter: Converts old /data/worlds/ structure on the fly.
 */
async function convertLegacyWorldToScenario(
  worldId: string,
  legacyDir: string
): Promise<FullScenario | null> {
  const worldPath = path.join(legacyDir, worldId);
  try {
    let loreContent = '';
    try {
      loreContent = await fs.readFile(path.join(worldPath, 'world_info.md'), 'utf-8');
    } catch {}

    const personas: PersonaTemplate[] = [];
    const charDir = path.join(worldPath, 'characters');
    try {
      const charFiles = await fs.readdir(charDir);
      for (const cf of charFiles) {
        if (cf.endsWith('.json')) {
          const raw = await fs.readFile(path.join(charDir, cf), 'utf-8');
          personas.push(JSON.parse(raw));
        }
      }
    } catch {}

    return {
      meta: {
        id: worldId,
        title: worldId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: 'Migrated from legacy world store',
        category: 'Fantasy',
        tags: ['Migrated'],
        mode: 'roleplay',
      },
      worldBuilding: {
        setting: loreContent,
        plot: 'Exploration and discovery.',
        style: 'Evocative roleplay prose.',
        narrator: 'Act as an engaging RPG narrator.',
        objects: [],
        locations: [],
        examples: [],
        scenarioNPCs: [],
      },
      suggestedPersonas: personas,
    };
  } catch {
    return null;
  }
}
