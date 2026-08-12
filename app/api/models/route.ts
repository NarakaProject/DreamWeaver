import { NextRequest, NextResponse } from 'next/server';
import { fetchProviderModels } from '@/lib/ai/models-fetcher';
import { AIProvider } from '@/lib/ai/provider-router';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = (searchParams.get('provider') as AIProvider) || 'gemini';
    const geminiKey = searchParams.get('geminiKey') || undefined;
    const groqKey = searchParams.get('groqKey') || undefined;
    const openrouterKey = searchParams.get('openrouterKey') || undefined;

    const models = await fetchProviderModels(provider, {
      geminiKey,
      groqKey,
      openrouterKey,
    });

    return NextResponse.json({ success: true, provider, models });
  } catch (err: any) {
    console.error('API /models fetch error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
