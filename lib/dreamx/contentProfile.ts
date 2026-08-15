import type { ActorContentProfile } from './types';

export interface RawContentProfileInput {
  style?: string;
  speaking_style?: string;
  writing_style?: string;
  topics?: string[] | string;
  patterns?: string[] | string;
  guidelines?: string[] | string;
  posting_guidelines?: string[] | string;
  bias?: string;
}

export type ContentProfileInput =
  | RawContentProfileInput
  | string
  | undefined
  | null;

/**
 * Normalizes guidelines conservatively:
 * - string[] -> trims, filters empty
 * - JSON string array -> parses array, trims, filters empty
 * - Newline-separated string -> splits on '\n', trims, filters empty
 * - Single plain string -> returns [trimmedString]
 * - DOES NOT blindly split on commas to avoid destroying prose semantics.
 */
export function normalizeGuidelines(input: string | string[] | undefined | null): string[] | undefined {
  if (!input) return undefined;

  let items: string[] = [];

  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else {
          items = [trimmed];
        }
      } catch {
        items = trimmed.includes('\n') ? trimmed.split('\n') : [trimmed];
      }
    } else if (trimmed.includes('\n')) {
      items = trimmed.split('\n');
    } else {
      items = [trimmed];
    }
  }

  const cleaned = items
    .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
    .filter(item => item.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Normalizes string lists (topics, patterns) from arrays, comma-delimited strings, or JSON arrays.
 */
export function normalizeContentStringList(input: string | string[] | undefined | null): string[] | undefined {
  if (!input) return undefined;

  let items: string[] = [];

  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else {
          items = [trimmed];
        }
      } catch {
        items = trimmed.split(',');
      }
    } else {
      items = trimmed.split(',');
    }
  }

  const cleaned = items
    .map(item => (typeof item === 'string' ? item.trim() : String(item).trim()))
    .filter(item => item.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Pure deterministic normalization helper for ActorContentProfile.
 * 
 * Rules:
 * - Never mutates input objects.
 * - Style precedence: explicit `style` > legacy `speaking_style` > legacy `writing_style`.
 * - Guidelines precedence: explicit `guidelines` > legacy `posting_guidelines`.
 * - Conservative guideline parsing (never blindly splits on commas).
 * - Leaves absent properties undefined.
 * - Returns undefined if no meaningful content profile data exists.
 */
export function normalizeContentProfile(input: ContentProfileInput): ActorContentProfile | undefined {
  if (!input) return undefined;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed ? { style: trimmed } : undefined;
  }

  // Style precedence: explicit `style` > `speaking_style` > `writing_style`
  let style: string | undefined = undefined;
  if (typeof input.style === 'string' && input.style.trim()) {
    style = input.style.trim();
  } else if (typeof input.speaking_style === 'string' && input.speaking_style.trim()) {
    style = input.speaking_style.trim();
  } else if (typeof input.writing_style === 'string' && input.writing_style.trim()) {
    style = input.writing_style.trim();
  }

  // Guidelines precedence: explicit `guidelines` > `posting_guidelines`
  const rawGuidelines = input.guidelines !== undefined ? input.guidelines : input.posting_guidelines;
  const guidelines = normalizeGuidelines(rawGuidelines);

  const topics = normalizeContentStringList(input.topics);
  const patterns = normalizeContentStringList(input.patterns);
  const bias = typeof input.bias === 'string' && input.bias.trim() ? input.bias.trim() : undefined;

  if (!style && !topics && !patterns && !guidelines && !bias) {
    return undefined;
  }

  return {
    ...(style ? { style } : {}),
    ...(topics ? { topics } : {}),
    ...(patterns ? { patterns } : {}),
    ...(guidelines ? { guidelines } : {}),
    ...(bias ? { bias } : {}),
  };
}

/**
 * Pure semantic description formatter for ActorContentProfile.
 * Does NOT generate LLM prompts, instructions, behavioral directives, or system wrappers.
 */
export function renderContentProfileDescription(contentProfile?: ActorContentProfile): string {
  if (!contentProfile) return '';

  const lines: string[] = [];

  if (contentProfile.style) {
    lines.push(`Style: ${contentProfile.style}`);
  }
  if (contentProfile.topics && contentProfile.topics.length > 0) {
    lines.push(`Topics: ${contentProfile.topics.join(', ')}`);
  }
  if (contentProfile.patterns && contentProfile.patterns.length > 0) {
    lines.push(`Patterns: ${contentProfile.patterns.join(', ')}`);
  }
  if (contentProfile.guidelines && contentProfile.guidelines.length > 0) {
    lines.push(`Guidelines: ${contentProfile.guidelines.join('; ')}`);
  }
  if (contentProfile.bias) {
    lines.push(`Bias: ${contentProfile.bias}`);
  }

  return lines.join('\n');
}
