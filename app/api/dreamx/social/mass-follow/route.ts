import { NextRequest, NextResponse } from 'next/server';
import { executeMassFollow } from '@/lib/dreamx/social';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorIds, targetProfileId, actorType } = body;

    if (!Array.isArray(actorIds) || !targetProfileId) {
      return NextResponse.json({ success: false, error: 'Missing actorIds or targetProfileId' }, { status: 400 });
    }

    const result = await executeMassFollow(actorIds, targetProfileId, actorType || 'human');
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Mass Follow Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
