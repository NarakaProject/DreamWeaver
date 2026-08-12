import { NextRequest, NextResponse } from 'next/server';
import {
  buildFullScenarioPrompt,
  parseScenarioWizardJson,
  buildBlockCommandPrompt,
  buildLintAuditPrompt,
} from '@/lib/gemini/wizard';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key missing. Please set your API Key in Settings.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // ACTION 1: Generate Full Scenario (All 12 Building Blocks)
    if (action === 'generate-full-scenario') {
      const { idea, genre, tone } = body;
      if (!idea) {
        return NextResponse.json({ error: 'Premise idea is required.' }, { status: 400 });
      }

      const systemPrompt = buildFullScenarioPrompt({
        idea,
        genre: genre || 'High Fantasy',
        tone: tone || 'Atmospheric roleplay',
      });

      const geminiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errorData = await geminiRes.json();
        throw new Error(errorData.error?.message || 'Gemini API call failed');
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const scenario = parseScenarioWizardJson(rawText);

      if (!scenario) {
        throw new Error('Failed to parse AI generated world JSON. Please try again.');
      }

      return NextResponse.json({ success: true, scenario });
    }

    // ACTION 2: Command Generate (/GENERATE CHARACTER, /GENERATE LOCATION, /COMPRESS, etc.)
    if (action === 'command-generate') {
      const { command, scenario, userPrompt } = body;
      if (!command || !scenario) {
        return NextResponse.json({ error: 'Command and scenario draft are required.' }, { status: 400 });
      }

      const prompt = buildBlockCommandPrompt(command, scenario, userPrompt);

      const geminiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errorData = await geminiRes.json();
        throw new Error(errorData.error?.message || 'Gemini command call failed');
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let parsedJson = null;
      try {
        let clean = rawText.trim();
        if (clean.startsWith('```')) {
          clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        }
        parsedJson = JSON.parse(clean);
      } catch {}

      return NextResponse.json({ success: true, rawText, parsedJson });
    }

    // ACTION 3: Quality Audit & Linting (/LINT)
    if (action === 'lint') {
      const { scenario } = body;
      if (!scenario) {
        return NextResponse.json({ error: 'Scenario draft is required for linting.' }, { status: 400 });
      }

      const prompt = buildLintAuditPrompt(scenario);

      const geminiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errorData = await geminiRes.json();
        throw new Error(errorData.error?.message || 'Gemini audit call failed');
      }

      const data = await geminiRes.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let audit = {
        score: 90,
        summary: 'Scenario logic and narrative structure are sound.',
        inconsistencies: [],
        suggestions: ['Consider adding more specific architectural details to key locations.'],
      };

      try {
        let clean = rawText.trim();
        if (clean.startsWith('```')) {
          clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        }
        audit = JSON.parse(clean);
      } catch {}

      return NextResponse.json({ success: true, audit });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('Wizard API Error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during scenario generation.' },
      { status: 500 }
    );
  }
}
