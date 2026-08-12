export type TokenType = 'dialogue' | 'prose';

export interface TextSpan {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface TextToken {
  id: string;
  type: TokenType;
  content: string;
  spans: TextSpan[];
  isUnclosed?: boolean;
}

export interface SpeakerSection {
  speaker: string;
  content: string;
}

export interface CyoaOption {
  id: string;
  label: string;
  content: string;
}

export interface CyoaParseResult {
  cleanText: string;
  options: CyoaOption[];
}

/**
 * Extracts CYOA option blocks from narrative text.
 * Robustly strips <cyoa_options>, <cyoaoptions>, <cyoa-options>, opening/unclosed and closing tags completely.
 */
export function extractCyoaOptions(rawText: string): CyoaParseResult {
  if (!rawText) return { cleanText: '', options: [] };

  const options: CyoaOption[] = [];
  let cleanText = rawText;

  // 1. Match XML tags: <cyoa_options>...</cyoa_options>, <cyoaoptions>...</cyoaoptions>, or unclosed <cyoaoptions>...
  const xmlMatch = rawText.match(/<cyoa[_-]?options>([\s\S]*?)(?:<\/cyoa[_-]?options>|$)/i);
  if (xmlMatch) {
    const rawOptionsBlock = xmlMatch[1];
    cleanText = rawText.replace(/<cyoa[_-]?options>[\s\S]*?(?:<\/cyoa[_-]?options>|$)/gi, '').trim();

    const lines = rawOptionsBlock.split('\n');
    let optId = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const lineMatch = trimmed.match(/^(?:[-*•]|\d+\.)?\s*(?:\[([^\]]+)\]|([^:]+)):\s*(.*)$/);
      if (lineMatch) {
        const label = (lineMatch[1] || lineMatch[2] || `Option #${optId}`).trim();
        const content = (lineMatch[3] || label).replace(/^["']|["']$/g, '').trim();
        options.push({
          id: `cyoa-${optId++}`,
          label,
          content: content || label,
        });
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        const cleanLine = trimmed.replace(/^[-*•]|\d+\.\s*/, '').trim();
        options.push({
          id: `cyoa-${optId++}`,
          label: cleanLine.slice(0, 35),
          content: cleanLine,
        });
      }
    }
  } else {
    // 2. Check for "Choose The Next Step Options:" header
    const chooseMatch = rawText.match(/(\*?\*?Choose The Next Step Options:?\*?\*?[\s\S]*)$/i);
    if (chooseMatch) {
      const rawOptionsBlock = chooseMatch[1];
      cleanText = rawText.substring(0, chooseMatch.index).trim();

      const lines = rawOptionsBlock.split('\n');
      let optId = 1;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.toLowerCase().includes('choose the next step options')) continue;

        const lineMatch = trimmed.match(/^(?:[-*•]|\d+\.)?\s*(?:\[([^\]]+)\]|([^:]+)):\s*(.*)$/);
        if (lineMatch) {
          const label = (lineMatch[1] || lineMatch[2] || `Option #${optId}`).trim();
          const content = (lineMatch[3] || label).replace(/^["']|["']$/g, '').trim();
          options.push({
            id: `cyoa-${optId++}`,
            label,
            content: content || label,
          });
        } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
          const cleanLine = trimmed.replace(/^[-*•]|\d+\.\s*/, '').trim();
          options.push({
            id: `cyoa-${optId++}`,
            label: cleanLine.slice(0, 35),
            content: cleanLine,
          });
        }
      }
    }
  }

  // Strip ALL leftover raw XML tags (e.g. </cyoaoptions>, <cyoaoptions>, etc.) completely from cleanText
  cleanText = cleanText.replace(/<\/?cyoa[_-]?options>/gi, '').trim();

  return { cleanText, options };
}

/**
 * Strips character prefixes like "Rick:", "Rick Sanchez:", "Summoned:" across ALL lines/paragraphs.
 */
export function stripSpeakerPrefix(content: string, speakerName?: string): string {
  if (!content) return '';
  let cleaned = content;

  if (speakerName && speakerName.trim()) {
    const esc = speakerName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<=^|\\n)\\s*(?:\\[${esc}\\]|${esc}):\\s*`, 'gim');
    cleaned = cleaned.replace(regex, '');
  }

  // Strip generic "CharacterName:" or "[Speaker: CharacterName]" prefix at the start of ANY line
  cleaned = cleaned.replace(/(?<=^|\n)\s*(?:\[(?:Speaker:\s*)?[^\]]+\]|[A-Z][a-zA-Z0-9_\s]{1,20}):\s*/gm, '');

  return cleaned.trim();
}

/**
 * Ensures AI model response turns NEVER get assigned to the User Persona.
 */
function sanitizeSpeakerName(speaker: string, defaultSpeaker: string, userPersonaName?: string): string {
  if (!speaker || speaker.trim().toLowerCase() === 'model') {
    return defaultSpeaker;
  }
  if (userPersonaName && speaker.toLowerCase() === userPersonaName.toLowerCase()) {
    return defaultSpeaker.toLowerCase() !== userPersonaName.toLowerCase() ? defaultSpeaker : 'Narrator';
  }
  return speaker;
}

/**
 * Splits narrative text into distinct speaker sections if multi-speaker tags are present
 * (e.g. [Speaker: Ignis Emberheart], [Narrator], [Aria Shadowstep], or "Rick:").
 */
export function splitMultiSpeakerText(
  text: string,
  defaultSpeaker: string = 'Narrator',
  userPersonaName?: string
): SpeakerSection[] {
  if (!text || !text.trim()) return [];

  // Match speaker tags: [Speaker: Name], [Narrator], or [Name]:
  const tagRegex = /\[(?:Speaker:\s*)?([^\]]+)\]:?/gi;
  const sections: SpeakerSection[] = [];

  let lastIndex = 0;
  let currentSpeaker = defaultSpeaker;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const rawTag = match[0];
    const extractedSpeaker = match[1].trim();

    // Text before this tag
    const priorText = text.slice(lastIndex, matchIndex).trim();
    if (priorText) {
      sections.push({
        speaker: sanitizeSpeakerName(currentSpeaker, defaultSpeaker, userPersonaName),
        content: stripSpeakerPrefix(priorText, currentSpeaker),
      });
    }

    currentSpeaker = extractedSpeaker.toLowerCase() === 'narrator' ? 'Narrator' : extractedSpeaker;
    lastIndex = matchIndex + rawTag.length;
  }

  // Remaining text after last tag
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    sections.push({
      speaker: sanitizeSpeakerName(currentSpeaker, defaultSpeaker, userPersonaName),
      content: stripSpeakerPrefix(remainingText, currentSpeaker),
    });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      speaker: sanitizeSpeakerName(defaultSpeaker, defaultSpeaker, userPersonaName),
      content: stripSpeakerPrefix(text, defaultSpeaker),
    });
  }

  return sections;
}

/**
 * Helper to parse bold (**...**) and explicit italic (*...* or _..._) within a token string.
 */
export function parseSpans(content: string): TextSpan[] {
  if (!content) return [];
  const spans: TextSpan[] = [];
  let i = 0;

  while (i < content.length) {
    // Bold syntax: **text**
    if (content.startsWith('**', i)) {
      i += 2;
      let text = '';
      while (i < content.length) {
        if (content.startsWith('**', i)) {
          i += 2;
          break;
        }
        text += content[i];
        i++;
      }
      if (text) {
        spans.push({ text, isBold: true });
      }
      continue;
    }

    // Explicit Italic syntax: *text* or _text_
    if (content[i] === '*' || content[i] === '_') {
      const delimiter = content[i];
      i++;
      let text = '';
      while (i < content.length) {
        if (content[i] === delimiter) {
          i++;
          break;
        }
        text += content[i];
        i++;
      }
      if (text) {
        spans.push({ text, isItalic: true });
      }
      continue;
    }

    // Plain text until next markdown delimiter
    let plainText = '';
    while (i < content.length) {
      if (content.startsWith('**', i) || content[i] === '*' || content[i] === '_') {
        break;
      }
      plainText += content[i];
      i++;
    }

    if (plainText) {
      spans.push({ text: plainText });
    }
  }

  return spans;
}

/**
 * Parses raw narrative text into structured tokens for DreamGen rendering.
 * Strips any leftover raw speaker tags (e.g. [Speaker: Name]) and separates dialogue ("...") from prose.
 */
export function parseDreamGenText(rawText: string): TextToken[] {
  if (!rawText) return [];

  // Strip stray raw speaker tags from visible prose
  const text = rawText.replace(/\[(?:Speaker:\s*)?[^\]]+\]:?/gi, '').trim();

  const tokens: TextToken[] = [];
  let index = 0;
  let tokenCounter = 0;

  while (index < text.length) {
    const char = text[index];

    // Spoken Dialogue: Double quotes "..." or curly double quotes “...”
    if (char === '"' || char === '“') {
      index++;
      let content = '';
      let closed = false;

      while (index < text.length) {
        const c = text[index];
        if (c === '"' || c === '”') {
          closed = true;
          index++;
          break;
        }
        content += c;
        index++;
      }

      tokens.push({
        id: `token-${tokenCounter++}`,
        type: 'dialogue',
        content,
        spans: parseSpans(content),
        isUnclosed: !closed,
      });
      continue;
    }

    // Prose / Narration / Action: Plain text outside double quotes
    let proseContent = '';
    while (index < text.length) {
      const c = text[index];
      if (c === '"' || c === '“') {
        break;
      }
      proseContent += c;
      index++;
    }

    if (proseContent.length > 0) {
      tokens.push({
        id: `token-${tokenCounter++}`,
        type: 'prose',
        content: proseContent,
        spans: parseSpans(proseContent),
      });
    }
  }

  return tokens;
}
