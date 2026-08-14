import { NextRequest, NextResponse } from 'next/server';
import { restoreSimulationSnapshot } from '@/lib/dreamx/snapshots';

export async function POST(req: NextRequest) {
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
