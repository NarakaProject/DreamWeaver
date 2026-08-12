import { NextRequest, NextResponse } from 'next/server';
import { assembleGeminiPayload, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-gemini-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is required. Please set your API key in Settings.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      model = DEFAULT_GEMINI_MODEL,
      worldLore,
      characterName,
      characterPersonality,
      characterFirstMessage,
      scenarioDescription,
      messages = [],
      maxRecentMessages = 30,
    } = body;

    const payload = assembleGeminiPayload({
      worldLore,
      characterName,
      characterPersonality,
      characterFirstMessage,
      scenarioDescription,
      messages,
      maxRecentMessages,
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch {}
      return NextResponse.json(
        { error: `Gemini API Error (${geminiRes.status}): ${parsedErr}` },
        { status: geminiRes.status }
      );
    }

    if (!geminiRes.body) {
      return NextResponse.json({ error: 'No response body received from Gemini API' }, { status: 500 });
    }

    // Transform Gemini SSE stream into plain text chunk stream for the client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const json = JSON.parse(dataStr);
              const chunkText =
                json.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunkText) {
                controller.enqueue(encoder.encode(chunkText));
              }
            } catch {
              // ignore non-json SSE lines
            }
          }
        }
      },
    });

    return new Response(geminiRes.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing chat' },
      { status: 500 }
    );
  }
}
