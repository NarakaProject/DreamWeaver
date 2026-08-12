import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { apiKey, model = DEFAULT_GEMINI_MODEL } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 400 });
    }

    const testModel = model || DEFAULT_GEMINI_MODEL;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Respond with exactly the word "CONNECTED".' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const json = JSON.parse(errText);
        msg = json.error?.message || errText;
      } catch {}
      return NextResponse.json(
        { success: false, error: msg, latencyMs },
        { status: res.status }
      );
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Fetch dynamic models list
    let fetchedModels: any[] = [];
    try {
      const modelsRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (modelsRes.ok) {
        const mData = await modelsRes.json();
        fetchedModels = (mData.models || [])
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent') && m.name?.includes('gemini')
          )
          .map((m: any) => ({
            id: m.name.replace(/^models\//, ''),
            displayName: m.displayName || m.name.replace(/^models\//, ''),
          }));
      }
    } catch {}

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
      latencyMs,
      model: testModel,
      availableModels: fetchedModels,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      { success: false, error: err.message || 'Connection test failed', latencyMs },
      { status: 500 }
    );
  }
}
