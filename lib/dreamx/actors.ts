import { getDatabase } from '../db';

export type ActorType = 'human' | 'ai';

export interface DreamXActor {
  id: string;
  handle: string;
  display_name: string;
  actor_type: ActorType;
  verification_type: string;
  behavior_policy?: string | null;
}

export async function getActorById(id: string): Promise<DreamXActor | null> {
  const actors = await getActorsByIds([id]);
  return actors[0] || null;
}

export async function getActorsByIds(ids: string[]): Promise<DreamXActor[]> {
  if (!ids || ids.length === 0) return [];
  const db = getDatabase();
  
  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(ids));
  
  const humanIds = uniqueIds.filter(id => id.startsWith('dx-user-'));
  const aiIds = uniqueIds.filter(id => id.startsWith('dx-prof-'));
  const unclassifiedIds = uniqueIds.filter(id => !id.startsWith('dx-user-') && !id.startsWith('dx-prof-'));
  
  const results: DreamXActor[] = [];

  if (humanIds.length > 0) {
    const placeholders = humanIds.map(() => '?').join(',');
    const humans = await db.queryAll<any>(`
      SELECT id, display_name, handle, verification_type 
      FROM dreamx_user_profile 
      WHERE id IN (${placeholders})
    `, humanIds);
    for (const h of humans) {
      results.push({
        id: h.id,
        handle: h.handle,
        display_name: h.display_name,
        actor_type: 'human',
        verification_type: h.verification_type
      });
    }
  }

  const checkIds = [...aiIds, ...unclassifiedIds];
  if (checkIds.length > 0) {
    const placeholders = checkIds.map(() => '?').join(',');
    const ais = await db.queryAll<any>(`
      SELECT id, display_name, handle, verification_type, behavior_policy 
      FROM dreamx_profiles 
      WHERE id IN (${placeholders})
    `, checkIds);
    for (const a of ais) {
      results.push({
        id: a.id,
        handle: a.handle,
        display_name: a.display_name,
        actor_type: 'ai',
        verification_type: a.verification_type,
        behavior_policy: a.behavior_policy
      });
    }
  }

  return results;
}

export async function getActorByHandle(handle: string): Promise<DreamXActor | null> {
  const db = getDatabase();
  const ai = await db.queryFirst<any>(`
    SELECT id, display_name, handle, verification_type, behavior_policy 
    FROM dreamx_profiles WHERE handle = ?
  `, [handle]);
  
  if (ai) {
    return {
      id: ai.id,
      handle: ai.handle,
      display_name: ai.display_name,
      actor_type: 'ai',
      verification_type: ai.verification_type,
      behavior_policy: ai.behavior_policy
    };
  }
  
  const human = await db.queryFirst<any>(`
    SELECT id, display_name, handle, verification_type 
    FROM dreamx_user_profile WHERE handle = ?
  `, [handle]);
  
  if (human) {
    return {
      id: human.id,
      handle: human.handle,
      display_name: human.display_name,
      actor_type: 'human',
      verification_type: human.verification_type
    };
  }
  
  return null;
}
