import type { DreamXProfile, DreamXUserProfile } from './types';

/**
 * Extracts @mentions from post content.
 * Rules:
 * - Match @handle (A-Z, a-z, 0-9, _)
 * - Exclude email addresses (e.g. foo@example.com)
 * - Strip trailing punctuation (. , ! ? : ; - etc.)
 * - Deduplicate handles
 * - Returns normalized handles (without @)
 */
export function extractMentions(content: string): string[] {
  if (!content) return [];

  // Match @handle ensuring it is not preceded by a word character or dot (which would make it an email)
  const mentionRegex = /(?:^|[^a-zA-Z0-9_\.])@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    const handle = match[1];
    if (handle && !mentions.includes(handle)) {
      mentions.push(handle);
    }
  }

  return mentions;
}

/**
 * Resolves a mention handle against AI profiles and optional Human user profile.
 */
export function resolveMention(
  handle: string,
  aiProfiles: DreamXProfile[],
  humanProfile?: DreamXUserProfile
): { type: 'ai'; profile: DreamXProfile } | { type: 'human'; profile: DreamXUserProfile } | null {
  if (!handle) return null;
  const normHandle = handle.toLowerCase().replace(/^@/, '');

  if (humanProfile) {
    const normHumanHandle = humanProfile.handle.toLowerCase().replace(/^@/, '');
    if (normHumanHandle === normHandle) {
      return { type: 'human', profile: humanProfile };
    }
  }

  for (const prof of aiProfiles) {
    const normProfHandle = prof.handle.toLowerCase().replace(/^@/, '');
    if (normProfHandle === normHandle) {
      return { type: 'ai', profile: prof };
    }
  }

  return null;
}
