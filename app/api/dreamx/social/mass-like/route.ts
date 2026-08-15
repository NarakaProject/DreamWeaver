import { NextRequest, NextResponse } from 'next/server';
import { executeMassLike } from '@/lib/dreamx/social';
import { getActorsByIds } from '@/lib/dreamx/actors';
import { getUserProfile } from '@/lib/dreamx/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorIds, postId, actorType } = body;

    if (!Array.isArray(actorIds) || !postId) {
      return NextResponse.json({ success: false, error: 'Missing actorIds or postId' }, { status: 400 });
    }
    
    // Complete preflight validation
    const targetType = actorType || 'human';
    const uniqueIds = Array.from(new Set(actorIds)) as string[];
    const resolvedActors = await getActorsByIds(uniqueIds);
    
    if (resolvedActors.length !== uniqueIds.length) {
      return NextResponse.json({ success: false, error: 'One or more actors do not exist' }, { status: 400 });
    }
    
    const humanUser = await getUserProfile();
    for (const actor of resolvedActors) {
      if (actor.identity.actor_type !== targetType) {
        return NextResponse.json({ success: false, error: 'Mismatched actorType in payload' }, { status: 400 });
      }
      if (actor.identity.actor_type === 'human') {
        if (!humanUser || actor.identity.id !== humanUser.id) {
          return NextResponse.json({ success: false, error: 'Cannot impersonate other human actors' }, { status: 400 });
        }
      }
    }

    const result = await executeMassLike(actorIds, postId, targetType);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Mass Like Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
