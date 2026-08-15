import type { ActorPersonality } from './types';

/**
 * Normalizes string lists (traits, interests) from arrays or comma-delimited strings.
 * Trims whitespace, removes empty entries, and handles JSON arrays safely.
 */
export function normalizeStringList(input: string | string[] | undefined | null): string[] | undefined {
  if (!input) return undefined;
  let items: string[] = [];

  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
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

export interface RawPersonalityInput {
  summary?: string;
  personality?: string;
  traits?: string[] | string;
  interests?: string[] | string;
  beliefs?: string;
  background?: string;
}

export type PersonalityInput =
  | RawPersonalityInput
  | string
  | undefined
  | null;

/**
 * Pure deterministic normalization function for ActorPersonality.
 * 
 * Rules:
 * - Must never mutate input.
 * - Resolves `summary` preferring explicit `summary` over legacy `personality`.
 * - Normalizes `traits` and `interests` into clean string arrays.
 * - Trims `beliefs` and `background`.
 * - Returns `undefined` if all resulting fields are empty/absent.
 */
export function normalizePersonality(input: PersonalityInput): ActorPersonality | undefined {
  if (!input) return undefined;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed ? { summary: trimmed } : undefined;
  }

  // Summary precedence: prefer explicit canonical `summary`, fallback to legacy `personality`
  let summary: string | undefined = undefined;
  if (typeof input.summary === 'string' && input.summary.trim()) {
    summary = input.summary.trim();
  } else if (typeof input.personality === 'string' && input.personality.trim()) {
    summary = input.personality.trim();
  }

  const traits = normalizeStringList(input.traits);
  const interests = normalizeStringList(input.interests);

  const beliefs = typeof input.beliefs === 'string' && input.beliefs.trim() ? input.beliefs.trim() : undefined;
  const background = typeof input.background === 'string' && input.background.trim() ? input.background.trim() : undefined;

  if (!summary && !traits && !interests && !beliefs && !background) {
    return undefined;
  }

  return {
    ...(summary ? { summary } : {}),
    ...(traits ? { traits } : {}),
    ...(interests ? { interests } : {}),
    ...(beliefs ? { beliefs } : {}),
    ...(background ? { background } : {}),
  };
}

/**
 * Pure semantic formatter that produces deterministic human-readable text describing an actor's personality.
 * Does NOT generate LLM prompts, instructions, behavioral directives, or action rules.
 */
export function renderPersonalityDescription(personality?: ActorPersonality): string {
  if (!personality) return '';

  const lines: string[] = [];

  if (personality.summary) {
    lines.push(`Summary: ${personality.summary}`);
  }
  if (personality.traits && personality.traits.length > 0) {
    lines.push(`Traits: ${personality.traits.join(', ')}`);
  }
  if (personality.interests && personality.interests.length > 0) {
    lines.push(`Interests: ${personality.interests.join(', ')}`);
  }
  if (personality.beliefs) {
    lines.push(`Beliefs: ${personality.beliefs}`);
  }
  if (personality.background) {
    lines.push(`Background: ${personality.background}`);
  }

  return lines.join('\n');
}
