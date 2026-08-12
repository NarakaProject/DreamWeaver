import { FullScenario, ScenarioMeta, WorldBuilding, PersonaTemplate, CustomObject, LocationItem, PromptExample } from './types';

/**
 * Robust JSON Parser converting World-Gen / DreamGen / External Scenario JSON schemas
 * into DreamWeaver's native 12-Block FullScenario object.
 */
export function parseWorldGenJson(jsonInput: string | Record<string, any>): FullScenario {
  let raw: any = jsonInput;

  if (typeof jsonInput === 'string') {
    try {
      raw = JSON.parse(jsonInput);
    } catch (err: any) {
      throw new Error(`Invalid JSON syntax: ${err.message}`);
    }
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Imported JSON payload must be an object');
  }

  // Support nested wrappers like { scenario: { ... } } or { world: { ... } }
  const root = raw.scenario || raw.world || raw.data || raw;

  // Extract Metadata
  const title =
    root.title ||
    root.name ||
    root.meta?.title ||
    root.world_name ||
    'Imported World Scenario';

  const description =
    root.description ||
    root.summary ||
    root.meta?.description ||
    root.tagline ||
    'Imported scenario template';

  const category =
    root.category ||
    root.meta?.category ||
    root.genre ||
    'Custom Fantasy';

  const tags: string[] = Array.isArray(root.tags || root.meta?.tags)
    ? root.tags || root.meta?.tags
    : typeof root.tags === 'string'
    ? root.tags.split(',').map((t: string) => t.trim())
    : ['Imported', 'World-Gen'];

  const mode = (root.mode || root.meta?.mode || 'roleplay') === 'story' ? 'story' : 'roleplay';

  const id = root.id || root.meta?.id || `scenario-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const coverImage = root.coverImage || root.meta?.coverImage || root.images?.coverImage || '';

  const meta: ScenarioMeta = {
    id,
    title,
    description,
    category,
    tags,
    mode,
    coverImage: coverImage || undefined,
  };

  // Extract WorldBuilding 12-Blocks
  const wb = root.worldBuilding || root.world_building || root.buildingBlocks || root;

  const setting = wb.setting || wb.settingLore || wb.lore || wb.world_description || wb.environment || '';
  const plot = wb.plot || wb.plotHooks || wb.scenario_plot || wb.hooks || '';
  const style = wb.style || wb.writingStyle || wb.author_style || wb.formatting || '';
  const narrator = wb.narrator || wb.narratorDirectives || wb.directives || wb.system_prompt || '';
  const openingMessage = wb.openingMessage || wb.first_message || wb.greeting || wb.opening || '';
  const history = wb.history || wb.world_history || wb.timeline || '';
  const privateNotes = wb.privateNotes || wb.secret_notes || wb.notes || '';

  // Extract Custom Objects
  const rawObjects = wb.objects || wb.customObjects || wb.items || [];
  const objects: CustomObject[] = Array.isArray(rawObjects)
    ? rawObjects.map((obj: any, idx: number) => ({
        id: obj.id || `obj-${idx}-${Date.now()}`,
        name: obj.name || obj.item_name || `Object #${idx + 1}`,
        description: obj.description || obj.effect || '',
        trigger_rule: obj.trigger_rule || obj.rule || undefined,
      }))
    : [];

  // Extract Locations
  const rawLocations = wb.locations || wb.places || wb.map || [];
  const locations: LocationItem[] = Array.isArray(rawLocations)
    ? rawLocations.map((loc: any, idx: number) => ({
        id: loc.id || `loc-${idx}-${Date.now()}`,
        name: loc.name || loc.place_name || `Location #${idx + 1}`,
        description: loc.description || loc.details || '',
      }))
    : [];

  // Extract Few-Shot Examples
  const rawExamples = wb.examples || wb.fewShotExamples || wb.reference_examples || [];
  const examples: PromptExample[] = Array.isArray(rawExamples)
    ? rawExamples.map((ex: any, idx: number) => ({
        id: ex.id || `ex-${idx}-${Date.now()}`,
        description: ex.description || ex.purpose || '',
        user: ex.user || (ex.interactions?.[0]?.content),
        model: ex.model || (ex.interactions?.[1]?.content),
        options: ex.options || [],
        interactions: ex.interactions || [],
      }))
    : [];

  // Extract NPCs & Playable Personas
  const rawPersonas = root.suggestedPersonas || root.personas || root.characters || [];
  const suggestedPersonas: PersonaTemplate[] = Array.isArray(rawPersonas)
    ? rawPersonas.map((p: any, idx: number) => ({
        id: p.id || `persona-${idx}-${Date.now()}`,
        name: p.name || p.character_name || `Persona #${idx + 1}`,
        tagline: p.tagline || p.role || undefined,
        personality: p.personality || p.description || p.bio || '',
        avatar: p.avatar || p.avatarUrl || undefined,
        firstMessage: p.firstMessage || p.greeting || p.first_message || '',
      }))
    : [];

  // Default playable persona if none provided
  if (suggestedPersonas.length === 0) {
    suggestedPersonas.push({
      id: `persona-default-${Date.now()}`,
      name: 'Protagonist',
      tagline: 'Main Character',
      personality: 'Determined adventurer exploring this realm.',
      firstMessage: `*I look around, taking in the atmosphere of ${title}.*`,
    });
  }

  const rawNPCs = wb.scenarioNPCs || wb.npcs || [];
  const scenarioNPCs: PersonaTemplate[] = Array.isArray(rawNPCs)
    ? rawNPCs.map((npc: any, idx: number) => ({
        id: npc.id || `npc-${idx}-${Date.now()}`,
        name: npc.name || npc.character_name || `NPC #${idx + 1}`,
        tagline: npc.tagline || npc.role || undefined,
        personality: npc.personality || npc.description || '',
        avatar: npc.avatar || npc.avatarUrl || undefined,
        firstMessage: npc.firstMessage || npc.greeting || '',
      }))
    : [];

  const worldBuilding: WorldBuilding = {
    setting,
    plot,
    style,
    narrator,
    openingMessage: openingMessage || undefined,
    history: history || undefined,
    privateNotes: privateNotes || undefined,
    objects,
    locations,
    examples,
    scenarioNPCs,
    images: {
      coverImage: meta.coverImage,
    },
  };

  return {
    meta,
    worldBuilding,
    suggestedPersonas,
  };
}
