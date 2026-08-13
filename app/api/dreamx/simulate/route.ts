import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousActivityStep } from '@/lib/dreamx/simulation';

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {}
    
    const { provider, model, keys, forceBypassCooldown } = body as any;

    // Server-side endpoint awaits full simulation lifecycle
    const result = await runAutonomousActivityStep({
      provider,
      model,
      keys: keys || {},
      forceBypassCooldown: !!forceBypassCooldown
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Simulation step failed:', err);
    // Non-blocking error response
    return NextResponse.json({ success: false, error: err.message || 'Simulation error' }, { status: 500 });
  }
}
