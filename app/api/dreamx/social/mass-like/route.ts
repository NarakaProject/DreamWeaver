import { NextRequest, NextResponse } from 'next/server';
import { executeMassLike } from '@/lib/dreamx/social';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorIds, postId, actorType } = body;

    if (!Array.isArray(actorIds) || !postId) {
      return NextResponse.json({ success: false, error: 'Missing actorIds or postId' }, { status: 400 });
    }

    const result = await executeMassLike(actorIds, postId, actorType || 'human');
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Mass Like Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
