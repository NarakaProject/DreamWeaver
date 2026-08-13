import type { DreamXProfile, VerificationType } from './types';

export interface ProfileImportItem {
  raw: any;
  normalizedHandle?: string;
  isDuplicate: boolean;
  existingId?: string;
  errors: string[];
  isValid: boolean;
  parsedProfile?: {
    id?: string;
    display_name: string;
    handle: string;
    avatar_url?: string;
    bio?: string;
    personality?: string;
    traits?: string;
    interests?: string;
    speaking_style?: string;
    beliefs?: string;
    background?: string;
    posting_guidelines?: string;
    verification_type: VerificationType;
  };
}

export interface ValidationReport {
  total: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  items: ProfileImportItem[];
  canImport: boolean;
}

/**
 * Standard handle normalization logic used across DreamX
 */
export function normalizeHandle(handleStr: string): string {
  const clean = (handleStr || 'user').replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
  return `@${clean || 'user'}`;
}

/**
 * Validates a JSON payload before database mutation.
 * Pure function with zero DB dependencies. Safe for both Client and Server.
 */
export function validateProfileImportPayload(payload: any, existingProfiles: DreamXProfile[]): ValidationReport {
  let list: any[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && typeof payload === 'object' && Array.isArray(payload.profiles)) {
    list = payload.profiles;
  }

  const existingHandleMap = new Map<string, DreamXProfile>();
  for (const p of existingProfiles) {
    existingHandleMap.set(p.handle.toLowerCase(), p);
  }

  const items: ProfileImportItem[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const raw of list) {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      items.push({ raw, isDuplicate: false, errors: ['Invalid JSON record object'], isValid: false });
      invalidCount++;
      continue;
    }

    // Check Phase 8: Cannot import human user as AI
    if (raw.type === 'human' || raw.actor_type === 'human') {
      errors.push('Human user profile cannot be imported as an AI persona');
    }

    if (!raw.display_name || typeof raw.display_name !== 'string' || !raw.display_name.trim()) {
      errors.push('Missing required field: display_name');
    }

    if (!raw.handle || typeof raw.handle !== 'string' || !raw.handle.trim()) {
      errors.push('Missing required field: handle');
    }

    // Determine verification type
    let verType: VerificationType = 'none';
    const rawVer = raw.verification_type || (raw.verification && raw.verification.type);
    if (rawVer) {
      if (['none', 'blue', 'gray', 'gold'].includes(rawVer)) {
        verType = rawVer as VerificationType;
      } else {
        errors.push(`Invalid verification_type: "${rawVer}". Must be 'none', 'blue', 'gray', or 'gold'`);
      }
    }

    let normHandle = '';
    let isDuplicate = false;
    let existingId: string | undefined = undefined;

    if (raw.handle && typeof raw.handle === 'string') {
      normHandle = normalizeHandle(raw.handle);
      const existing = existingHandleMap.get(normHandle.toLowerCase());
      if (existing) {
        isDuplicate = true;
        existingId = existing.id;
        duplicateCount++;
      }
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    const item: ProfileImportItem = {
      raw,
      normalizedHandle: normHandle,
      isDuplicate,
      existingId,
      errors,
      isValid,
      parsedProfile: isValid ? {
        id: raw.id || existingId || undefined,
        display_name: raw.display_name.trim(),
        handle: normHandle,
        avatar_url: raw.avatar_url || undefined,
        bio: raw.bio || undefined,
        personality: raw.personality || undefined,
        traits: raw.traits || undefined,
        interests: raw.interests || undefined,
        speaking_style: raw.speaking_style || undefined,
        beliefs: raw.beliefs || undefined,
        background: raw.background || undefined,
        posting_guidelines: raw.posting_guidelines || undefined,
        verification_type: verType
      } : undefined
    };

    // Add to intra-batch handle map if valid and not duplicate
    if (isValid && normHandle) {
      existingHandleMap.set(normHandle.toLowerCase(), { id: item.parsedProfile?.id || 'temp', handle: normHandle } as any);
    }

    items.push(item);
  }

  return {
    total: list.length,
    validCount,
    invalidCount,
    duplicateCount,
    items,
    canImport: invalidCount === 0 && validCount > 0
  };
}

/**
 * Performs profile import for valid items using passed saver function.
 */
export async function executeProfileImport(
  report: ValidationReport,
  saveProfileFn: (p: any) => Promise<any>,
  mode: 'update' | 'skip' = 'update',
  allowSkipInvalid: boolean = false
): Promise<{ success: boolean; createdCount: number; updatedCount: number; skippedCount: number; errors: string[] }> {
  if (!allowSkipInvalid && report.invalidCount > 0) {
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ['Import aborted: Validation report contains invalid records. Correct JSON or enable skip mode.']
    };
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of report.items) {
    if (!item.isValid || !item.parsedProfile) {
      skippedCount++;
      continue;
    }

    if (item.isDuplicate) {
      if (mode === 'skip') {
        skippedCount++;
        continue;
      }
      // Update existing profile configuration (preserves id and social history!)
      await saveProfileFn(item.parsedProfile);
      updatedCount++;
    } else {
      // Create new profile
      await saveProfileFn(item.parsedProfile);
      createdCount++;
    }
  }

  return {
    success: true,
    createdCount,
    updatedCount,
    skippedCount,
    errors: []
  };
}

/**
 * Exports current AI profiles to stable JSON format.
 * Does NOT export transient simulation state, posts, likes, reposts, or logs.
 */
export function exportAIProfilesJSON(profiles: DreamXProfile[]): string {
  const exportList = profiles.map(p => ({
    id: p.id,
    display_name: p.display_name,
    handle: p.handle,
    avatar_url: p.avatar_url || '',
    bio: p.bio || '',
    personality: p.personality || '',
    traits: p.traits || '',
    interests: p.interests || '',
    speaking_style: p.speaking_style || '',
    beliefs: p.beliefs || '',
    background: p.background || '',
    posting_guidelines: p.posting_guidelines || '',
    verification: {
      type: p.verification_type || 'none',
      label: p.verification_type !== 'none' ? `${p.verification_type} badge` : null
    }
  }));

  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    profiles: exportList
  };

  return JSON.stringify(data, null, 2);
}
