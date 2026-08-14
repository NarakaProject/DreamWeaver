import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousActivityStep } from '@/lib/dreamx/simulation';
import { computeCrowdBurst } from '@/lib/dreamx/crowd';

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {}
    
    const { provider, model, keys, forceBypassCooldown, count } = body as any;
    const stepsToRun = Math.min(Math.max(1, Number(count) || 1), 50);

    const results = [];
    for (let i = 0; i < stepsToRun; i++) {
      try {
        const result = await runAutonomousActivityStep({
          provider,
          model,
          keys: keys || {},
          forceBypassCooldown: !!forceBypassCooldown || stepsToRun > 1
        });
        results.push(result);
      } catch (err: any) {
        const logPrefix = stepsToRun > 1 ? `[SIMULATION BURST] Step ${i + 1}` : '[SIMULATION]';
        console.warn(`${logPrefix} provider error:`, err?.message || err);
        results.push({
          outcome: 'NO_ACTION',
          reason: `Provider unavailable: ${err?.message || 'API error'}`,
          details: 'Provider unavailable'
        });
      }
    }

    try {
      await computeCrowdBurst();
    } catch (err: any) {
      console.error('Crowd burst computation failed:', err);
    }

    return NextResponse.json({ 
      success: true, 
      result: results[results.length - 1], 
      results 
    });

  } catch (err: any) {
    console.error('Simulation step failed:', err);
    return NextResponse.json({ success: false, error: err.message || 'Simulation error' }, { status: 500 });
  }
}
