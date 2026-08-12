import { NextRequest, NextResponse } from 'next/server';
import { loadAllScenarios, saveScenario, deleteScenario, FullScenario } from '@/lib/scenarios/reader';

export async function GET() {
  try {
    const scenarios = await loadAllScenarios();
    return NextResponse.json({ scenarios });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load scenarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const scenario: FullScenario = await req.json();
    if (!scenario || !scenario.meta || !scenario.meta.id) {
      return NextResponse.json({ error: 'Invalid scenario payload' }, { status: 400 });
    }

    await saveScenario(scenario);
    return NextResponse.json({ success: true, scenario });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save scenario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing scenario ID' }, { status: 400 });
    }

    await deleteScenario(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete scenario' }, { status: 500 });
  }
}
