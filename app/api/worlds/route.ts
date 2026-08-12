import { NextResponse } from 'next/server';
import { loadAllWorlds } from '@/lib/files/reader';

export async function GET() {
  try {
    const worlds = await loadAllWorlds();
    return NextResponse.json({ worlds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load worlds' }, { status: 500 });
  }
}
