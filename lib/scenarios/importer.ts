import { FullScenario, ScenarioMeta, WorldBuilding, PersonaTemplate, CustomObject, LocationItem, PromptExample } from './types';

/**
 * Helper to convert any nested string, array, or object into clean markdown section text.
 */
function stringifyBlock(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val)) {
    return val.map((item) => (typeof item === 'string' ? item : stringifyBlock(item))).filter(Boolean).join('\n\n');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => {
        if (v === undefined || v === null || v === '') return '';
        const titleKey = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        const formattedVal = typeof v === 'object' ? stringifyBlock(v) : String(v);
        return `**${titleKey}**:\n${formattedVal}`;
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return String(val).trim();
}

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

  // Title Extraction Logic
  let title =
    root.title ||
    root.name ||
    root.meta?.title ||
    root.world_name ||
    root.scenario_title;

  if (!title || typeof title !== 'string') {
    const jsonStr = JSON.stringify(root);
    if (/naruto/i.test(jsonStr)) {
      title = 'Naruto: Hidden Leaf Era';
    } else if (root.characters?.player_character?.name) {
      title = `${root.characters.player_character.name}'s Adventure`;
    } else {
      title = 'Imported World Scenario';
    }
  }

  const description =
    stringifyBlock(root.description || root.summary || root.meta?.description || root.tagline || root.premise) ||
    'Imported 12-block scenario template';

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

  const setting = stringifyBlock(wb.setting || wb.settingLore || wb.lore || wb.world_description || wb.environment);
  const plot = stringifyBlock(wb.plot || wb.plotHooks || wb.scenario_plot || wb.hooks);
  const style = stringifyBlock(wb.style || wb.writingStyle || wb.writing_style || wb.author_style || wb.formatting);
  const narrator = stringifyBlock(wb.narrator || wb.narratorDirectives || wb.directives || wb.system_prompt || wb.rules);
  const openingMessage = stringifyBlock(wb.openingMessage || wb.first_message || wb.greeting || wb.opening);
  const history = stringifyBlock(wb.history || wb.world_history || wb.previous_events || wb.timeline);
  const privateNotes = stringifyBlock(wb.privateNotes || wb.secret_notes || wb.notes);

  // Extract Custom Objects
  const rawObjects = wb.objects || wb.customObjects || wb.items || [];
  const objects: CustomObject[] = Array.isArray(rawObjects)
    ? rawObjects.map((obj: any, idx: number) => ({
        id: obj.id || `obj-${idx}-${Date.now()}`,
        name: obj.name || obj.item_name || `Object #${idx + 1}`,
        description: stringifyBlock(obj.description || obj.effect || obj),
        trigger_rule: obj.trigger_rule || obj.rule || undefined,
      }))
    : [];

  // Extract Locations
  const rawLocations = wb.locations || wb.places || wb.map || [];
  const locations: LocationItem[] = Array.isArray(rawLocations)
    ? rawLocations.map((loc: any, idx: number) => ({
        id: loc.id || `loc-${idx}-${Date.now()}`,
        name: loc.name || loc.place_name || `Location #${idx + 1}`,
        description: stringifyBlock(loc.description || loc.details || loc),
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

  // Extract Playable Personas & NPCs
  const chars = root.characters || root.personas || root.suggestedPersonas || {};
  const suggestedPersonas: PersonaTemplate[] = [];
  const scenarioNPCs: PersonaTemplate[] = [];

  // Case 1: characters is an object like { player_character: {...}, npcs: [...] }
  if (typeof chars === 'object' && !Array.isArray(chars)) {
    const pc = chars.player_character || chars.player;
    if (pc) {
      suggestedPersonas.push({
        id: pc.id || `persona-pc-${Date.now()}`,
        name: pc.name || pc.character_name || 'Protagonist',
        tagline: pc.tagline || pc.role || 'Player Persona',
        personality: stringifyBlock(pc.personality || pc.description || pc.details || pc),
        avatar: pc.avatar || pc.avatarUrl || undefined,
        firstMessage: stringifyBlock(pc.firstMessage || pc.greeting || pc.first_message || openingMessage),
      });
    }

    const npcsList = chars.npcs || chars.scenario_npcs || chars.non_player_characters || [];
    if (Array.isArray(npcsList)) {
      npcsList.forEach((npc: any, idx: number) => {
        scenarioNPCs.push({
          id: npc.id || `npc-${idx}-${Date.now()}`,
          name: npc.name || npc.character_name || `NPC #${idx + 1}`,
          tagline: npc.tagline || npc.role || undefined,
          personality: stringifyBlock(npc.personality || npc.description || npc),
          avatar: npc.avatar || npc.avatarUrl || undefined,
          firstMessage: stringifyBlock(npc.firstMessage || npc.greeting || ''),
        });
      });
    }
  } else if (Array.isArray(chars)) {
    // Case 2: characters is an array of character objects
    chars.forEach((p: any, idx: number) => {
      const template: PersonaTemplate = {
        id: p.id || `persona-${idx}-${Date.now()}`,
        name: p.name || p.character_name || `Persona #${idx + 1}`,
        tagline: p.tagline || p.role || undefined,
        personality: stringifyBlock(p.personality || p.description || p.bio || p),
        avatar: p.avatar || p.avatarUrl || undefined,
        firstMessage: stringifyBlock(p.firstMessage || p.greeting || p.first_message || ''),
      };
      if (idx === 0) suggestedPersonas.push(template);
      else scenarioNPCs.push(template);
    });
  }

  // Default playable persona if none extracted
  if (suggestedPersonas.length === 0) {
    suggestedPersonas.push({
      id: `persona-default-${Date.now()}`,
      name: 'Protagonist',
      tagline: 'Main Character',
      personality: 'Determined adventurer exploring this realm.',
      firstMessage: openingMessage || `*I look around, taking in the atmosphere of ${title}.*`,
    });
  }

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
