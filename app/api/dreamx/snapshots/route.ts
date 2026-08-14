import { NextRequest, NextResponse } from 'next/server';
import { getSnapshots, createSimulationSnapshot, deleteSnapshot } from '@/lib/dreamx/snapshots';

export async function GET() {
  try {
    const snapshots = await getSnapshots();
    return NextResponse.json({ success: true, snapshots });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ success: false, error: 'Snapshot mutation is a deployment-gated local developer tool. It is permitted only in development and test environments.' }, { status: 403 });
  }
  try {
    const { label } = await req.json();
    if (!label || typeof label !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid label' }, { status: 400 });
    }
    const snapshot = await createSimulationSnapshot(label);
    return NextResponse.json({ success: true, snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ success: false, error: 'Snapshot mutation is a deployment-gated local developer tool. It is permitted only in development and test environments.' }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid snapshot ID' }, { status: 400 });
    }
    
    // Prevent deleting the very last snapshot
    const snapshots = await getSnapshots();
    if (snapshots.length <= 1) {
      return NextResponse.json({ success: false, error: 'Cannot delete the final snapshot. Create another one first.' }, { status: 400 });
    }

    await deleteSnapshot(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
