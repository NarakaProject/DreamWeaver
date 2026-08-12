import { NextRequest, NextResponse } from 'next/server';

export interface GeminiModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export async function GET(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-gemini-api-key') ||
      req.nextUrl.searchParams.get('apiKey') ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is required to fetch models.' },
        { status: 401 }
      );
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const json = JSON.parse(errText);
        msg = json.error?.message || errText;
      } catch {}
      return NextResponse.json({ error: `Gemini API Error (${res.status}): ${msg}` }, { status: res.status });
    }

    const data = await res.json();
    const rawModels: any[] = data.models || [];

    // Filter to models supporting generateContent and matching gemini naming
    const filtered = rawModels
      .filter((m) => {
        const supportsGenerate =
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent');
        const isGemini = m.name && m.name.includes('gemini');
        return supportsGenerate && isGemini;
      })
      .map((m) => {
        const id = m.name.replace(/^models\//, '');
        let displayName = m.displayName || id;
        if (displayName.toLowerCase().startsWith('models/')) {
          displayName = displayName.replace(/^models\//, '');
        }

        return {
          id,
          name: m.name,
          displayName,
          description: m.description || '',
        };
      });

    // Prioritize Flash models first, then Pro models, sorted by newest/highest version
    filtered.sort((a, b) => {
      const aIsFlash = a.id.includes('flash');
      const bIsFlash = b.id.includes('flash');
      if (aIsFlash && !bIsFlash) return -1;
      if (!aIsFlash && bIsFlash) return 1;
      return a.id.localeCompare(b.id);
    });

    return NextResponse.json({ models: filtered });
  } catch (err: any) {
    console.error('Error fetching Gemini models:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch models' }, { status: 500 });
  }
}
