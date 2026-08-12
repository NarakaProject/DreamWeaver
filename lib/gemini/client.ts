import { PromptExample, normalizePromptExample } from '@/lib/scenarios/types';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  speaker?: string;
  timestamp?: number;
}

export interface CustomObjectContext {
  id: string;
  name: string;
  description: string;
  trigger_rule?: string;
}

export interface LocationContext {
  id: string;
  name: string;
  description: string;
}

export interface ScenarioNPCContext {
  id: string;
  name: string;
  tagline?: string;
  personality: string;
  avatar?: string;
}

export interface PromptContextParams {
  narratorDirectives?: string;
  settingLore?: string;
  plotHooks?: string;
  historyContent?: string;
  writingStyle?: string;
  locations?: LocationContext[];
  customObjects?: CustomObjectContext[];
  scenarioNPCs?: ScenarioNPCContext[];
  fewShotExamples?: PromptExample[];
  characterName?: string;
  characterPersonality?: string;
  characterTagline?: string;
  characterAvatar?: string;
  targetSpeaker?: string;
  userInstruction?: string;
  messages: ChatMessage[];
  maxRecentMessages?: number;
}

export interface GeminiPayload {
  contents: {
    role: 'user' | 'model';
    parts: { text: string }[];
  }[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  generationConfig?: {
    temperature: number;
    topP: number;
    maxOutputTokens: number;
  };
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * Synthesizes all 12 building blocks into a structured prompt payload for Gemini
 * (excluding Private Notes which remain strictly confidential to the player).
 */
export function buildSystemInstruction(params: Partial<PromptContextParams>): string {
  const userName = params.characterName || 'Player';

  const parts: string[] = [
    'You are DreamWeaver, an elite interactive AI Storyteller, Roleplay Master, and World Director inspired by DreamGen.',
    'Your goal is to co-create rich, deeply immersive, atmospheric, and highly engaging fictional roleplay narratives.',
    '',
    '### ABSOLUTE IDENTITY SEPARATION & USER AGENCY RULES:',
    `1. ABSOLUTE IDENTITY SEPARATION: You (the AI Engine) are strictly the Narrator, World Master, and NPCs. You MUST NEVER generate actions, thoughts, feelings, or spoken dialogue for the User's Persona (User Name: "${userName}").`,
    `2. ZERO AGENT OVERREACH: Stop the narrative immediately when an NPC finishes their action/dialogue or when the environment changes. NEVER decide what "${userName}" does, says, or feels next under ANY circumstances, unless explicitly directed via "Continue As" commands.`,
    `3. SUGGESTIONS ENGINE ONLY: If requested for next step suggestions, provide 3 plausible action choices for "${userName}", but DO NOT auto-execute them in the story stream. Wait for the user to select or write their own move.`,
    '4. ATTRIBUTION HEADERS: Prefix responses with explicit speaker tags if generating as a specific NPC (e.g. [Speaker: Orelia]) or format as [Narrator] when acting as the environment/plot master.',
    '',
    '### ERGONOMICS & FORMATTING RULES:',
    '1. SPOKEN DIALOGUE MUST be enclosed in double quotes (e.g. "Hold your ground!").',
    '2. PROSE NARRATION AND ACTIONS can be written naturally or enclosed in asterisks (e.g. *draws blade silently*).',
    '3. IMPORTANT TERMS OR EMPHASIS can be bolded using double asterisks (e.g. **Sunstone Relic**).',
    '4. Maintain character persona and scenario directives consistency at all times.',
    '',
    '### HIGH-PRIORITY DIALOGUE & CYOA FORMATTING INSTRUCTIONS:',
    '1. When acting as Summoned, Summoner, or any NPC, format dialogue cleanly with explicit speaker tags (e.g. [Speaker: Summoned] or [Speaker: Character Name]).',
    '2. NEVER output inline character name prefixes inside prose or dialogue (e.g. write "What the—" instead of "Rick: What the—").',
    '3. If outputting CYOA options or next step choices, ALWAYS place them at the very end of your response wrapped inside <cyoa_options> XML tags:',
    '   <cyoa_options>',
    '   - 💬 Friendly Inquiry: "What is this place?"',
    '   - ⚙️ System Command: "/Start"',
    '   </cyoa_options>',
  ];

  // User Persona
  if (params.characterName) {
    parts.push(`\n### USER PERSONA (PLAYER IDENTITY - DO NOT ROLEPLAY AS THIS USER):\nName: ${params.characterName}`);
    if (params.characterTagline) {
      parts.push(`Tagline: ${params.characterTagline}`);
    }
    if (params.characterPersonality) {
      parts.push(`Personality & Trait: ${params.characterPersonality}`);
    }
  }

  // Target Speaker Directive
  if (params.targetSpeaker) {
    parts.push(`\n### TURN SPEAKER DIRECTIVE:\nRespond specifically as: "${params.targetSpeaker}".`);
  }

  // Narrator Directives
  if (params.narratorDirectives && params.narratorDirectives.trim()) {
    parts.push(`\n### NARRATOR & GAME MASTER DIRECTIVES:\n${params.narratorDirectives.trim()}`);
  }

  // Writing Style & Perspective
  if (params.writingStyle && params.writingStyle.trim()) {
    parts.push(`\n### WRITING STYLE & PERSPECTIVE:\n${params.writingStyle.trim()}`);
  }

  // Setting & Lore
  if (params.settingLore && params.settingLore.trim()) {
    parts.push(`\n### SETTING & ENVIRONMENTAL CONTEXT:\n${params.settingLore.trim()}`);
  }

  // Grounding Locations
  if (params.locations && params.locations.length > 0) {
    const locList = params.locations
      .map((loc) => `- **${loc.name}**: ${loc.description}`)
      .join('\n');
    parts.push(`\n### KEY SCENE LOCATIONS & GROUNDING:\n${locList}`);
  }

  // Plot Hooks
  if (params.plotHooks && params.plotHooks.trim()) {
    parts.push(`\n### ACTIVE PLOT HOOKS & STORYLINE:\n${params.plotHooks.trim()}`);
  }

  // History & Backstory
  if (params.historyContent && params.historyContent.trim()) {
    parts.push(`\n### RECENT HISTORY & BACKSTORY:\n${params.historyContent.trim()}`);
  }

  // Scenario Companions & NPCs
  if (params.scenarioNPCs && params.scenarioNPCs.length > 0) {
    const npcList = params.scenarioNPCs
      .map(
        (npc) =>
          `- **${npc.name}**${npc.tagline ? ` (${npc.tagline})` : ''}: ${npc.personality}`
      )
      .join('\n');
    parts.push(`\n### SCENARIO COMPANIONS & NPCS:\n${npcList}`);
  }

  // CYOA Custom Objects & Mechanics
  if (params.customObjects && params.customObjects.length > 0) {
    const objectList = params.customObjects
      .map(
        (obj) =>
          `- **${obj.name}**: ${obj.description}${
            obj.trigger_rule ? ` (Rule: ${obj.trigger_rule})` : ''
          }`
      )
      .join('\n');
    parts.push(`\n### ACTIVE CUSTOM OBJECTS & CYOA MECHANICS:\nTrack the following entities, items, and status rules during narrative generation:\n${objectList}`);
  }

  // Few-Shot Roleplay Examples (Multi-Turn Trees)
  if (params.fewShotExamples && params.fewShotExamples.length > 0) {
    const exampleBlocks = params.fewShotExamples.map((ex, i) => {
      const normalized = normalizePromptExample(ex);
      const exParts: string[] = [];
      exParts.push(`#### EXAMPLE TREE #${i + 1}${normalized.description ? `: ${normalized.description}` : ''}`);

      if (normalized.options && normalized.options.length > 0) {
        exParts.push(`Choose The Next Step Options:`);
        normalized.options.forEach((opt) => {
          exParts.push(`- [${opt.label}]: ${opt.content}`);
        });
      }

      if (normalized.interactions && normalized.interactions.length > 0) {
        exParts.push(`Interaction Thread:`);
        normalized.interactions.forEach((it) => {
          exParts.push(`[Speaker: ${it.role}]: ${it.content}`);
        });
      }

      return exParts.join('\n');
    });

    parts.push(`\n### FEW-SHOT ROLEPLAY REFERENCE EXAMPLES:\nUse the following reference examples to mimic voice, tone, choices, and narration formatting mechanics:\n\n${exampleBlocks.join('\n\n')}`);
  }

  return parts.join('\n');
}

/**
 * Context Manager:
 * Preserves chronological order while assembling system instructions and formatting turns.
 */
export function assembleGeminiPayload(
  params: PromptContextParams,
  generationConfig?: { temperature?: number; maxOutputTokens?: number }
): GeminiPayload {
  const systemInstructionText = buildSystemInstruction(params);

  const dialogueMessages = params.messages.filter((m) => m.role === 'user' || m.role === 'model');

  const sortedMessages = [...dialogueMessages].sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB;
  });

  const maxTurns = params.maxRecentMessages || 30;
  const recentMessages = sortedMessages.slice(-maxTurns);

  const contents = recentMessages.map((msg) => {
    let formattedText = msg.content;
    const speakerPrefix = msg.speaker ? `[${msg.speaker}]: ` : '';

    if (msg.role === 'user' && msg.type) {
      if (msg.type === 'do') formattedText = `${speakerPrefix}[Action]: ${msg.content}`;
      else if (msg.type === 'say') formattedText = `${speakerPrefix}[Say]: "${msg.content}"`;
      else if (msg.type === 'story_note') formattedText = `${speakerPrefix}[Story Note]: ${msg.content}`;
      else if (msg.type === 'continue') formattedText = `${speakerPrefix}[Continue narrative naturally]`;
    }
    return {
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: formattedText }],
    };
  });

  if (params.fewShotExamples && params.fewShotExamples.length > 0 && recentMessages.length <= 1) {
    const exampleTurns: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const ex of params.fewShotExamples) {
      const normalized = normalizePromptExample(ex);
      for (const it of normalized.interactions) {
        exampleTurns.push({
          role: it.role === 'user' ? 'user' : 'model',
          parts: [{ text: `[${it.role}]: ${it.content}` }],
        });
      }
    }
    contents.unshift(...exampleTurns);
  }

  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: '[Begin story session]' }],
    });
  }

  const collapsedContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const item of contents) {
    if (collapsedContents.length > 0 && collapsedContents[collapsedContents.length - 1].role === item.role) {
      collapsedContents[collapsedContents.length - 1].parts[0].text += `\n\n${item.parts[0].text}`;
    } else {
      collapsedContents.push(item);
    }
  }

  return {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: collapsedContents,
    generationConfig: {
      temperature: generationConfig?.temperature ?? 0.8,
      topP: 0.95,
      maxOutputTokens: generationConfig?.maxOutputTokens ?? 2048,
    },
  };
}
