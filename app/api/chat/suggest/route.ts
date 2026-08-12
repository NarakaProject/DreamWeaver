import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-gemini-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is required for action suggestions.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      model = DEFAULT_GEMINI_MODEL,
      characterName = 'the player character',
      messages = [],
      settingLore = '',
      plotHooks = '',
    } = body;

    const recentContext = messages
      .slice(-4)
      .map((m: any) => `${m.speaker ? `[${m.speaker}]` : m.role}: ${m.content}`)
      .join('\n');

    const promptText = `
Setting: ${settingLore}
Plot: ${plotHooks}

Recent Story Events:
${recentContext}

Based on the story situation above, generate exactly 3 short, distinct, plausible action/dialogue choices for "${characterName}".
Format output strictly as a JSON array of 3 strings: ["Option 1", "Option 2", "Option 3"].
Do NOT include markdown wrapping or extra conversational text.
`.trim();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini API Error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean JSON array parsing
    const cleaned = rawReply.replace(/```json/g, '').replace(/```/g, '').trim();
    let suggestions: string[] = [];
    try {
      suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      suggestions = cleaned
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err: any) {
    console.error('Suggest API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
