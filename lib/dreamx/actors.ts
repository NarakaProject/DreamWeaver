import { getDatabase } from '../db';
import type { 
  Actor, 
  ActorIdentity, 
  ActorTaxonomy,
  ActorPersonality, 
  ActorContentProfile, 
  DreamXProfile, 
  DreamXUserProfile, 
  ActorType,
  DreamXActor 
} from './types';
import { parseBehaviorPolicy } from './behaviorPolicy';

export type { ActorType, DreamXActor };

/**
 * Helper to safely extract taxonomy from a profile object or fallback to D2 defaults.
 */
function extractTaxonomy(profile: { category?: string; archetypes?: string[] | string; tags?: string[] }): ActorTaxonomy {
  const category = (profile.category && typeof profile.category === 'string') ? profile.category : 'individual';
  let archetypes: string[] = [];

  if (profile.archetypes) {
    if (Array.isArray(profile.archetypes)) {
      archetypes = [...profile.archetypes];
    } else if (typeof profile.archetypes === 'string') {
      try {
        const parsed = JSON.parse(profile.archetypes);
        if (Array.isArray(parsed)) archetypes = parsed;
        else archetypes = [profile.archetypes];
      } catch {
        archetypes = [profile.archetypes];
      }
    }
  }

  const tags = Array.isArray(profile.tags) ? [...profile.tags] : undefined;

  return {
    category,
    archetypes,
    ...(tags ? { tags } : {})
  };
}

/**
 * Pure mapping function: Maps a persistent DreamXProfile (AI) to the canonical Actor domain model.
 * Deterministic and side-effect free; does not mutate the input entity.
 */
export function toActorFromProfile(profile: DreamXProfile): Actor {
  const identity: ActorIdentity = {
    id: profile.id,
    handle: profile.handle,
    display_name: profile.display_name,
    actor_type: 'ai',
    verification_type: profile.verification_type || 'none',
    avatar_url: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };

  const taxonomy: ActorTaxonomy = extractTaxonomy(profile);

  const personality: ActorPersonality | undefined = (
    profile.personality ||
    profile.traits ||
    profile.interests ||
    profile.beliefs ||
    profile.background
  ) ? {
    personality: profile.personality || undefined,
    traits: profile.traits || undefined,
    interests: profile.interests || undefined,
    beliefs: profile.beliefs || undefined,
    background: profile.background || undefined,
  } : undefined;

  const contentProfile: ActorContentProfile | undefined = (
    profile.speaking_style ||
    profile.posting_guidelines
  ) ? {
    speaking_style: profile.speaking_style || undefined,
    posting_guidelines: profile.posting_guidelines || undefined,
  } : undefined;

  const behaviorPolicy = profile.behavior_policy
    ? parseBehaviorPolicy(profile.behavior_policy)
    : undefined;

  return {
    identity,
    taxonomy,
    ...(personality ? { personality } : {}),
    ...(contentProfile ? { contentProfile } : {}),
    ...(behaviorPolicy ? { behaviorPolicy } : {}),
  };
}

/**
 * Pure mapping function: Maps a persistent DreamXUserProfile (Human) to the canonical Actor domain model.
 * Deterministic and side-effect free; does not mutate the input entity.
 */
export function toActorFromUserProfile(userProfile: DreamXUserProfile): Actor {
  const identity: ActorIdentity = {
    id: userProfile.id,
    handle: userProfile.handle,
    display_name: userProfile.display_name,
    actor_type: 'human',
    verification_type: userProfile.verification_type || 'none',
    avatar_url: userProfile.avatar_url || undefined,
    bio: userProfile.bio || undefined,
    created_at: userProfile.created_at,
    updated_at: userProfile.updated_at,
  };

  const taxonomy: ActorTaxonomy = extractTaxonomy(userProfile);

  const personality: ActorPersonality | undefined = (
    userProfile.personality ||
    userProfile.interests
  ) ? {
    personality: userProfile.personality || undefined,
    interests: userProfile.interests || undefined,
  } : undefined;

  const contentProfile: ActorContentProfile | undefined = userProfile.writing_style ? {
    writing_style: userProfile.writing_style || undefined,
  } : undefined;

  return {
    identity,
    taxonomy,
    ...(personality ? { personality } : {}),
    ...(contentProfile ? { contentProfile } : {}),
  };
}

export async function getActorById(id: string): Promise<Actor | undefined> {
  const actors = await getActorsByIds([id]);
  return actors[0];
}

export async function getActorsByIds(ids: string[]): Promise<Actor[]> {
  if (!ids || ids.length === 0) return [];
  const db = getDatabase();
  
  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(ids));
  
  const humanIds = uniqueIds.filter(id => id.startsWith('dx-user-'));
  const aiIds = uniqueIds.filter(id => id.startsWith('dx-prof-'));
  const unclassifiedIds = uniqueIds.filter(id => !id.startsWith('dx-user-') && !id.startsWith('dx-prof-'));
  
  const results: Actor[] = [];
  const resolvedIds = new Set<string>();

  if (humanIds.length > 0) {
    const placeholders = humanIds.map(() => '?').join(',');
    const humans = await db.queryAll<DreamXUserProfile>(`
      SELECT * 
      FROM dreamx_user_profile 
      WHERE id IN (${placeholders})
    `, humanIds);
    for (const h of humans) {
      results.push(toActorFromUserProfile(h));
      resolvedIds.add(h.id);
    }
  }

  const checkAiIds = [...aiIds, ...unclassifiedIds.filter(id => !resolvedIds.has(id))];
  if (checkAiIds.length > 0) {
    const placeholders = checkAiIds.map(() => '?').join(',');
    const ais = await db.queryAll<DreamXProfile>(`
      SELECT * 
      FROM dreamx_profiles 
      WHERE id IN (${placeholders})
    `, checkAiIds);
    for (const a of ais) {
      results.push(toActorFromProfile(a));
      resolvedIds.add(a.id);
    }
  }

  // Fallback check for any remaining unclassified IDs in human table
  const remainingUnclassified = unclassifiedIds.filter(id => !resolvedIds.has(id));
  if (remainingUnclassified.length > 0) {
    const placeholders = remainingUnclassified.map(() => '?').join(',');
    const humans = await db.queryAll<DreamXUserProfile>(`
      SELECT * 
      FROM dreamx_user_profile 
      WHERE id IN (${placeholders})
    `, remainingUnclassified);
    for (const h of humans) {
      results.push(toActorFromUserProfile(h));
      resolvedIds.add(h.id);
    }
  }

  return results;
}

export async function getActorByHandle(handle: string): Promise<Actor | undefined> {
  const db = getDatabase();
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  
  const ai = await db.queryFirst<DreamXProfile>(`
    SELECT * 
    FROM dreamx_profiles WHERE LOWER(handle) = LOWER(?)
  `, [normalizedHandle]);
  
  if (ai) {
    return toActorFromProfile(ai);
  }
  
  const human = await db.queryFirst<DreamXUserProfile>(`
    SELECT * 
    FROM dreamx_user_profile WHERE LOWER(handle) = LOWER(?)
  `, [normalizedHandle]);
  
  if (human) {
    return toActorFromUserProfile(human);
  }
  
  return undefined;
}
