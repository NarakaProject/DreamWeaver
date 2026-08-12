export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  timestamp?: number;
}

export interface CustomObjectContext {
  id: string;
  name: string;
  description: string;
  trigger_rule?: string;
}

export interface PromptExampleContext {
  user: string;
  model: string;
}

export interface PromptContextParams {
  narratorDirectives?: string;
  settingLore?: string;
  plotHooks?: string;
  writingStyle?: string;
  customObjects?: CustomObjectContext[];
  fewShotExamples?: PromptExampleContext[];
  characterName?: string;
  characterPersonality?: string;
  characterTagline?: string;
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
 * Synthesizes Narrator Directives, Setting & Lore, Plot Hooks, CYOA Custom Objects,
 * Writing Style, Active Persona, and DreamGen Formatting Rules into a single system instruction.
 */
export function buildSystemInstruction(params: Partial<PromptContextParams>): string {
  const parts: string[] = [
    'You are DreamWeaver, an elite interactive AI Storyteller, Roleplay Master, and World Director inspired by DreamGen.',
    'Your goal is to co-create rich, deeply immersive, atmospheric, and highly engaging fictional roleplay narratives.',
    '',
    '### ERGONOMICS & FORMATTING RULES:',
    '1. SPOKEN DIALOGUE MUST be enclosed in double quotes (e.g. "Hold your ground!").',
    '2. ACTIONS, PHYSICAL MOVEMENTS, AND EXPRESSIONS MUST be enclosed in asterisks (e.g. *draws blade silently*).',
    '3. PROSE AND NARRATION must be written outside quotes/asterisks in evocative, engaging text.',
    '4. Maintain character persona and scenario directives consistency at all times.',
  ];

  // Narrator Directives
  if (params.narratorDirectives && params.narratorDirectives.trim()) {
    parts.push(`\n### NARRATOR & GAME MASTER DIRECTIVES:\n${params.narratorDirectives.trim()}`);
  }

  // Active Persona
  if (params.characterName) {
    parts.push(`\n### ACTIVE CHARACTER PERSONA:\nName: ${params.characterName}`);
    if (params.characterTagline) {
      parts.push(`Tagline: ${params.characterTagline}`);
    }
    if (params.characterPersonality) {
      parts.push(`Personality & Trait: ${params.characterPersonality}`);
    }
  }

  // Setting & Lore
  if (params.settingLore && params.settingLore.trim()) {
    parts.push(`\n### SETTING & ENVIRONMENTAL CONTEXT:\n${params.settingLore.trim()}`);
  }

  // Plot Hooks
  if (params.plotHooks && params.plotHooks.trim()) {
    parts.push(`\n### ACTIVE PLOT HOOKS & STORYLINE:\n${params.plotHooks.trim()}`);
  }

  // Writing Style & Perspective
  if (params.writingStyle && params.writingStyle.trim()) {
    parts.push(`\n### WRITING STYLE & PERSPECTIVE:\n${params.writingStyle.trim()}`);
  }

  // CYOA Custom Objects Tracking
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

  return parts.join('\n');
}

/**
 * Sophisticated Context Manager:
 * Preserves chronological order (oldest to newest) while intelligently slicing recent turns
 * to ensure narrative coherence without exceeding token limits as sessions grow long.
 */
export function assembleGeminiPayload(params: PromptContextParams): GeminiPayload {
  const systemInstructionText = buildSystemInstruction(params);

  // Filter out pure system messages from the conversational history
  const dialogueMessages = params.messages.filter((m) => m.role === 'user' || m.role === 'model');

  // Sort strictly by timestamp if available, ensuring chronological narrative integrity
  const sortedMessages = [...dialogueMessages].sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB;
  });

  // Keep up to maxRecentMessages (default: 30 turns)
  const maxTurns = params.maxRecentMessages || 30;
  const recentMessages = sortedMessages.slice(-maxTurns);

  // Map to Gemini API format
  const contents = recentMessages.map((msg) => {
    let formattedText = msg.content;
    if (msg.role === 'user' && msg.type) {
      if (msg.type === 'do') formattedText = `[Action]: ${msg.content}`;
      else if (msg.type === 'say') formattedText = `[Say]: "${msg.content}"`;
      else if (msg.type === 'story_note') formattedText = `[Story Note / Guidance]: ${msg.content}`;
      else if (msg.type === 'continue') formattedText = `[Continue the story naturally from where it left off]`;
    }
    return {
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: formattedText }],
    };
  });

  // Prepend Few-shot Examples if present and conversation history is short (< 2 turns)
  if (params.fewShotExamples && params.fewShotExamples.length > 0 && recentMessages.length <= 1) {
    const exampleTurns: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const ex of params.fewShotExamples) {
      exampleTurns.push({ role: 'user', parts: [{ text: ex.user }] });
      exampleTurns.push({ role: 'model', parts: [{ text: ex.model }] });
    }
    contents.unshift(...exampleTurns);
  }

  // Ensure Gemini API contents starts with a 'user' role message if not empty
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: '[Begin story session]' }],
    });
  }

  // Ensure Gemini API contents doesn't end with two consecutive messages from the same role
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
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };
}
