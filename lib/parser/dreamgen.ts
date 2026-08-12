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

/**
 * Splits narrative text into distinct speaker sections if multi-speaker tags are present
 * (e.g. [Speaker: Ignis Emberheart] or [Narrator] or [Aria Shadowstep]).
 */
export function splitMultiSpeakerText(
  text: string,
  defaultSpeaker: string = 'Narrator'
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
        speaker: currentSpeaker,
        content: priorText,
      });
    }

    currentSpeaker = extractedSpeaker.toLowerCase() === 'narrator' ? 'Narrator' : extractedSpeaker;
    lastIndex = matchIndex + rawTag.length;
  }

  // Remaining text after last tag
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    sections.push({
      speaker: currentSpeaker,
      content: remainingText,
    });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      speaker: defaultSpeaker,
      content: text.trim(),
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
