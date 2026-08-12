import { FullScenario } from '@/lib/scenarios/reader';

export interface WizardGenerateParams {
  idea: string;
  genre: string;
  tone: string;
}

export interface LintAuditResult {
  score: number; // 0 to 100
  summary: string;
  inconsistencies: string[];
  suggestions: string[];
}

/**
 * Builds system instructions asking Gemini to act as a World Designer Meta-Engine
 * and generate all 12 building blocks in a strict JSON structure.
 */
export function buildFullScenarioPrompt(params: WizardGenerateParams): string {
  return `You are DreamWeaver's World Designer Meta-Engine inspired by DreamGen.
Your task is to procedurally design a complete, immersive RPG roleplay scenario based on the following premise:

- Premise / Idea: "${params.idea}"
- Genre: "${params.genre}"
- Tone & Perspective: "${params.tone}"

You MUST output ONLY a valid JSON object (no markdown surrounding explanation) matching this exact schema:

{
  "meta": {
    "id": "scenario-slug-id",
    "title": "Evocative Scenario Title",
    "description": "2-3 sentence engaging synopsis for the scenario card.",
    "category": "${params.genre}",
    "tags": ["Tag1", "Tag2", "CYOA"],
    "mode": "roleplay",
    "coverImage": ""
  },
  "worldBuilding": {
    "setting": "Comprehensive lore, faction history, and environmental atmosphere.",
    "plot": "Main narrative goal, active conflicts, and open-ended plot hooks.",
    "style": "Atmospheric 2nd-person roleplay prose. High tension, vivid sensory details.",
    "narrator": "Act as an experienced RPG Game Master. Maintain suspense and react dynamically to player choices.",
    "openingMessage": "*Evocative opening narration prologue introducing setting, backstory, and immediate call to action. Use {{user}} for player name.*",
    "history": "Recap of recent events leading up to this exact starting moment.",
    "privateNotes": "SECRET GM NOTE: Hidden plot twist or secret trap mechanic.",
    "locations": [
      {
        "id": "loc-1",
        "name": "Location Name",
        "description": "Architectural features, ambient lighting, entry points."
      }
    ],
    "scenarioNPCs": [
      {
        "id": "npc-1",
        "name": "Companion / Antagonist Name",
        "tagline": "Title / Role",
        "personality": "Distinct personality traits, motivations, and speaking voice.",
        "avatar": "",
        "firstMessage": "\"Optional opening dialogue speech.\""
      }
    ],
    "objects": [
      {
        "id": "obj-1",
        "name": "Key CYOA Relic / Item",
        "description": "Description of artifact or status rule.",
        "trigger_rule": "Effect when equipped or used in story."
      }
    ],
    "examples": [
      {
        "user": "[Player]: [Action]: Inspect the ancient archway",
        "model": "[Narrator]: *The runes flicker as your touch warms the cold stone.*"
      }
    ],
    "images": {
      "coverImage": "",
      "backgroundImage": ""
    }
  },
  "suggestedPersonas": [
    {
      "id": "persona-1",
      "name": "Default Hero Name",
      "tagline": "Protagonist Class / Role",
      "personality": "Protagonist skills, motivations, and background.",
      "avatar": "",
      "firstMessage": ""
    }
  ]
}

Ensure all 12 building blocks are richly populated with creative depth. Return ONLY raw valid JSON.`;
}

/**
 * Safely parses and validates generated scenario JSON from model output.
 */
export function parseScenarioWizardJson(rawText: string): FullScenario | null {
  try {
    let clean = rawText.trim();
    // Remove ```json ... ``` code fence wrappers if present
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    const parsed = JSON.parse(clean);

    if (!parsed || !parsed.meta || !parsed.worldBuilding) {
      return null;
    }

    const scenarioId = (parsed.meta.id || `wizard-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const result: FullScenario = {
      meta: {
        id: scenarioId,
        title: parsed.meta.title || 'Untitled AI Scenario',
        description: parsed.meta.description || 'An AI generated roleplay scenario.',
        category: parsed.meta.category || 'Fantasy',
        tags: Array.isArray(parsed.meta.tags) ? parsed.meta.tags : ['AI Generated'],
        mode: 'roleplay',
        coverImage: parsed.meta.coverImage || '',
      },
      worldBuilding: {
        setting: parsed.worldBuilding.setting || '',
        plot: parsed.worldBuilding.plot || '',
        style: parsed.worldBuilding.style || 'Atmospheric 2nd-person roleplay prose.',
        narrator: parsed.worldBuilding.narrator || 'Act as an interactive RPG Game Master.',
        openingMessage: parsed.worldBuilding.openingMessage || '',
        history: parsed.worldBuilding.history || '',
        privateNotes: parsed.worldBuilding.privateNotes || '',
        locations: Array.isArray(parsed.worldBuilding.locations) ? parsed.worldBuilding.locations : [],
        scenarioNPCs: Array.isArray(parsed.worldBuilding.scenarioNPCs) ? parsed.worldBuilding.scenarioNPCs : [],
        objects: Array.isArray(parsed.worldBuilding.objects) ? parsed.worldBuilding.objects : [],
        examples: Array.isArray(parsed.worldBuilding.examples) ? parsed.worldBuilding.examples : [],
        images: parsed.worldBuilding.images || {},
      },
      suggestedPersonas: Array.isArray(parsed.suggestedPersonas) ? parsed.suggestedPersonas : [
        {
          id: 'hero',
          name: 'Hero',
          tagline: 'Protagonist',
          personality: 'Brave player character.',
          avatar: '',
          firstMessage: '',
        },
      ],
    };

    return result;
  } catch (err) {
    console.error('Failed to parse Scenario Wizard JSON:', err);
    return null;
  }
}

/**
 * Builds targeted prompts for individual building block generation commands.
 */
export function buildBlockCommandPrompt(
  command: string,
  scenarioDraft: FullScenario,
  userPrompt?: string
): string {
  const contextHeader = `SCENARIO CONTEXT:
Title: ${scenarioDraft.meta.title}
Genre: ${scenarioDraft.meta.category}
Setting: ${scenarioDraft.worldBuilding.setting}
Plot: ${scenarioDraft.worldBuilding.plot}
`;

  switch (command.toUpperCase()) {
    case '/GENERATE CHARACTER':
      return `${contextHeader}
COMMAND: /GENERATE CHARACTER
Generate a new NPC companion or antagonist character for this world.
User Note: ${userPrompt || 'Create a unique, memorable companion with clear motivations.'}

OUTPUT ONLY VALID JSON:
{
  "id": "npc-${Date.now()}",
  "name": "NPC Name",
  "tagline": "Title / Role",
  "personality": "Personality traits and motivations.",
  "avatar": "",
  "firstMessage": "\\"Opening dialogue quote.\\""
}`;

    case '/GENERATE LOCATION':
      return `${contextHeader}
COMMAND: /GENERATE LOCATION
Generate a new grounding spatial location for this world.
User Note: ${userPrompt || 'Create an architectural setting with ambient atmosphere.'}

OUTPUT ONLY VALID JSON:
{
  "id": "loc-${Date.now()}",
  "name": "Location Name",
  "description": "Architectural features, ambient noise, and entry points."
}`;

    case '/GENERATE OBJECT':
      return `${contextHeader}
COMMAND: /GENERATE OBJECT
Generate a new CYOA item, status rule, or artifact.
User Note: ${userPrompt || 'Create an item with unique mechanics.'}

OUTPUT ONLY VALID JSON:
{
  "id": "obj-${Date.now()}",
  "name": "Item Name",
  "description": "Artifact description",
  "trigger_rule": "Effect rule when used or equipped."
}`;

    case '/COMPRESS':
      return `${contextHeader}
COMMAND: /COMPRESS
Apply Semantic Cascade Compression to shrink the setting lore and plot descriptions by 30-40% while preserving all critical facts, names, and rules.

OUTPUT ONLY VALID JSON:
{
  "setting": "Compressed concise setting lore...",
  "plot": "Compressed concise plot hooks..."
}`;

    default:
      return `${contextHeader}\nCOMMAND: Refine narrative lore based on: ${userPrompt || 'Enhance creative depth.'}`;
  }
}

/**
 * Builds prompt for scenario quality auditing (/LINT).
 */
export function buildLintAuditPrompt(scenarioDraft: FullScenario): string {
  return `You are DreamWeaver's Quality Auditor (/LINT).
Audit the following scenario draft for plot holes, character inconsistencies, missing links, or token redundancies:

Title: ${scenarioDraft.meta.title}
Setting: ${scenarioDraft.worldBuilding.setting}
Plot: ${scenarioDraft.worldBuilding.plot}
NPCs: ${scenarioDraft.worldBuilding.scenarioNPCs?.map((n) => n.name).join(', ')}
Locations: ${scenarioDraft.worldBuilding.locations?.map((l) => l.name).join(', ')}
Objects: ${scenarioDraft.worldBuilding.objects?.map((o) => o.name).join(', ')}

OUTPUT ONLY A VALID JSON OBJECT:
{
  "score": 92,
  "summary": "Overall assessment of scenario coherence and narrative depth.",
  "inconsistencies": [
    "List of any plot holes or character trait contradictions."
  ],
  "suggestions": [
    "Actionable recommendations to improve roleplay quality."
  ]
}`;
}
