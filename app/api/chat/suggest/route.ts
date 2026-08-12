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

Return ONLY a raw JSON array of exactly 3 plain text action suggestions for "${characterName}", e.g. ["Inspect the glowing runes", "Ask companion about the guards", "Stay hidden in the shadows"]. Do NOT wrap in markdown code blocks, brackets, or escape characters.
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
    const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Robust cleaning & parsing
    let cleaned = rawReply
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let suggestions: string[] = [];

    // Attempt direct JSON parse
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // If direct parse fails, try extracting from [ to ]
      const bracketMatch = cleaned.match(/\[[\s\S]*\]/);
      if (bracketMatch) {
        try {
          const parsed = JSON.parse(bracketMatch[0]);
          if (Array.isArray(parsed)) {
            suggestions = parsed.map((s) => String(s).trim()).filter(Boolean);
          }
        } catch {}
      }
    }

    // Fallback line parsing if JSON array extraction failed
    if (suggestions.length === 0) {
      suggestions = cleaned
        .split('\n')
        .map((line: string) =>
          line
            .replace(/^[\s\d\-*\.\"[\]\\]+/, '') // Strip line numbers, quotes, brackets, escapes
            .replace(/[\"\]\\]+$/, '')
            .trim()
        )
        .filter((s: string) => s.length > 3 && !s.startsWith('[') && !s.startsWith('{'));
    }

    // Sanitize items to remove any leftover escaping or broken syntax
    suggestions = suggestions.map((s) =>
      s
        .replace(/\\"/g, '"')
        .replace(/^["'\[\\]+/, '')
        .replace(/["'\]\\]+$/, '')
        .trim()
    ).filter(Boolean);

    // Guaranteed reliable fallback if array is empty or corrupt
    if (suggestions.length < 3) {
      const defaultFallbacks = [
        `Inspect the surrounding area carefully`,
        `Ask your companion for tactical advice`,
        `Prepare your weapons and stay alert`,
      ];
      suggestions = [...suggestions, ...defaultFallbacks].slice(0, 3);
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err: any) {
    console.error('Suggest API Error:', err);
    return NextResponse.json({
      suggestions: [
        'Inspect the surrounding area carefully',
        'Ask your companion for tactical advice',
        'Prepare your weapons and stay alert',
      ],
    });
  }
}
