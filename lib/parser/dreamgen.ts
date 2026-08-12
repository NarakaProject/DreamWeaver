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
      i += 2; // skip opening **
      let text = '';
      let closed = false;
      while (i < content.length) {
        if (content.startsWith('**', i)) {
          closed = true;
          i += 2; // skip closing **
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
      i++; // skip opening delimiter
      let text = '';
      let closed = false;
      while (i < content.length) {
        if (content[i] === delimiter) {
          closed = true;
          i++; // skip closing delimiter
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
 * Separates spoken dialogue ("...") from prose/action narration.
 * Dialogue is non-italic warm gold by default; prose/actions are italic soft purple.
 */
export function parseDreamGenText(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let index = 0;
  let tokenCounter = 0;

  while (index < text.length) {
    const char = text[index];

    // Spoken Dialogue: Double quotes "..." or curly double quotes “...”
    if (char === '"' || char === '“') {
      index++; // skip initial quote
      let content = '';
      let closed = false;

      while (index < text.length) {
        const c = text[index];
        if (c === '"' || c === '”') {
          closed = true;
          index++; // skip closing quote
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
