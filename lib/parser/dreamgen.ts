export type TokenType = 'dialogue' | 'action' | 'prose';

export interface TextToken {
  id: string;
  type: TokenType;
  content: string;
  isUnclosed?: boolean;
}

/**
 * Parses raw narrative text into structured tokens for DreamGen rendering.
 * Separates spoken dialogue ("..."), actions (*...*), and prose narration.
 * Robustly handles streaming/partial text with unclosed quotes or asterisks.
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
      const openQuoteIndex = index;
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
        isUnclosed: !closed,
      });
      continue;
    }

    // Action / Pacing: Asterisks *...*
    if (char === '*') {
      index++; // skip initial asterisk
      let content = '';
      let closed = false;

      while (index < text.length) {
        const c = text[index];
        if (c === '*') {
          closed = true;
          index++; // skip closing asterisk
          break;
        }
        content += c;
        index++;
      }

      tokens.push({
        id: `token-${tokenCounter++}`,
        type: 'action',
        content,
        isUnclosed: !closed,
      });
      continue;
    }

    // Prose / Narration: Accumulate plain text until next quote or asterisk
    let proseContent = '';
    while (index < text.length) {
      const c = text[index];
      if (c === '"' || c === '“' || c === '*') {
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
      });
    }
  }

  return tokens;
}
