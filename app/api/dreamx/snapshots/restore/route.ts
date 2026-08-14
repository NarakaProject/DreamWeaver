import { NextRequest, NextResponse } from 'next/server';
import { restoreSimulationSnapshot } from '@/lib/dreamx/snapshots';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ success: false, error: 'Snapshot mutation is a deployment-gated local developer tool. It is permitted only in development and test environments.' }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid snapshot ID' }, { status: 400 });
    }
    
    await restoreSimulationSnapshot(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
