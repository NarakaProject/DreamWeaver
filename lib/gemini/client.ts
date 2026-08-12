export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  timestamp?: number;
}

export interface PromptContextParams {
  worldLore?: string;
  characterName?: string;
  characterPersonality?: string;
  characterFirstMessage?: string;
  scenarioDescription?: string;
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

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Constructs system instructions integrating World Lore, Character Persona, and DreamGen formatting rules.
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
    '4. Maintain character persona consistency at all times.',
  ];

  if (params.characterName) {
    parts.push(`\n### ACTIVE CHARACTER PERSONA:\nName: ${params.characterName}`);
    if (params.characterPersonality) {
      parts.push(`Personality & Persona: ${params.characterPersonality}`);
    }
    if (params.scenarioDescription) {
      parts.push(`Scenario Setting: ${params.scenarioDescription}`);
    }
  }

  if (params.worldLore && params.worldLore.trim().length > 0) {
    parts.push(`\n### WORLD LORE & CONTEXT:\n${params.worldLore.trim()}`);
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
