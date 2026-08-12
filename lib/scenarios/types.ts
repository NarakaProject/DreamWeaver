export interface CustomObject {
  id: string;
  name: string;
  description: string;
  trigger_rule?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  description: string;
}

export interface ExampleOption {
  id: string;
  label: string;
  content: string;
}

export interface ExampleInteraction {
  id: string;
  role: string;
  avatarUrl?: string;
  content: string;
}

export interface PromptExample {
  id?: string;
  description?: string;
  options?: ExampleOption[];
  interactions?: ExampleInteraction[];
  // Legacy fields for backward compatibility
  user?: string;
  model?: string;
}

/**
 * Normalizes any PromptExample (legacy simple pair or new multi-turn tree) to a unified structure.
 */
export function normalizePromptExample(ex: PromptExample): Required<Pick<PromptExample, 'id' | 'description' | 'options' | 'interactions'>> & PromptExample {
  const id = ex.id || `ex-${Math.random().toString(36).substring(2, 9)}`;
  const description = ex.description || '';
  const options: ExampleOption[] = (ex.options || []).map((opt, i) => ({
    id: opt.id || `opt-${i}-${Date.now()}`,
    label: opt.label || `Option #${i + 1}`,
    content: opt.content || '',
  }));

  let interactions: ExampleInteraction[] = [];
  if (ex.interactions && ex.interactions.length > 0) {
    interactions = ex.interactions.map((it, i) => ({
      id: it.id || `it-${i}-${Date.now()}`,
      role: it.role || 'user',
      avatarUrl: it.avatarUrl || '',
      content: it.content || '',
    }));
  } else {
    // Convert legacy user & model pair into interaction turns
    if (ex.user) {
      interactions.push({
        id: `it-legacy-user-${Date.now()}`,
        role: 'user',
        content: ex.user,
      });
    }
    if (ex.model) {
      interactions.push({
        id: `it-legacy-model-${Date.now()}`,
        role: 'Narrator',
        content: ex.model,
      });
    }
  }

  return {
    ...ex,
    id,
    description,
    options,
    interactions,
  };
}

export interface PersonaTemplate {
  id: string;
  name: string;
  tagline?: string;
  personality: string;
  avatar?: string;
  firstMessage: string;
}

export interface ImageAssets {
  coverImage?: string;
  backgroundImage?: string;
}

export interface WorldBuilding {
  setting: string;
  plot: string;
  style: string;
  narrator: string;
  openingMessage?: string;
  history?: string;
  privateNotes?: string;
  objects: CustomObject[];
  locations?: LocationItem[];
  examples: PromptExample[];
  scenarioNPCs?: PersonaTemplate[];
  images?: ImageAssets;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  mode: 'roleplay' | 'story';
  coverImage?: string;
}

export interface FullScenario {
  meta: ScenarioMeta;
  worldBuilding: WorldBuilding;
  suggestedPersonas: PersonaTemplate[];
}
