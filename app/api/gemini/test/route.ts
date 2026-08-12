import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { apiKey, model = DEFAULT_GEMINI_MODEL } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 400 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
      latencyMs,
      model,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      { success: false, error: err.message || 'Connection test failed', latencyMs },
      { status: 500 }
    );
  }
}
