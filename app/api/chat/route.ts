import { NextRequest, NextResponse } from 'next/server';
import { assembleGeminiPayload, buildSystemInstruction, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { routeChatStream, AIProvider, DEFAULT_MODELS } from '@/lib/ai/provider-router';
import { searchMemories } from '@/lib/memory/store';
import { processBackgroundAutoSummary } from '@/lib/memory/summarizer';

export async function POST(req: NextRequest) {
  try {
    const geminiKey = req.headers.get('x-gemini-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const groqKey = req.headers.get('x-groq-api-key') || undefined;
    const openrouterKey = req.headers.get('x-openrouter-api-key') || undefined;

    const body = await req.json();
    const {
      provider = (req.headers.get('x-provider') as AIProvider) || 'gemini',
      model,
      sessionId,
      narratorDirectives,
      settingLore,
      plotHooks,
      writingStyle,
      customObjects = [],
      fewShotExamples = [],
      characterName,
      characterPersonality,
      characterTagline,
      targetSpeaker,
      messages = [],
      maxRecentMessages = 30,
      temperature = 0.8,
      maxOutputTokens = 2048,
    } = body;

    let retrievedMemories = body.retrievedMemories || [];

    // ELTM Context Retrieval
    if ((!retrievedMemories || retrievedMemories.length === 0) && sessionId) {
      const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
      if (lastUserMsg) {
        retrievedMemories = await searchMemories(sessionId, lastUserMsg, 5);
      }
    }

    // Trigger non-blocking background auto-summarization if applicable
    if (sessionId && messages.length > 0) {
      const formattedTurns = messages.map((m: any, idx: number) => ({
        speaker: m.speaker || (m.role === 'user' ? characterName || 'Player' : 'Narrator'),
        content: m.content || '',
        turnNumber: idx + 1,
      }));
      processBackgroundAutoSummary(sessionId, formattedTurns).catch(() => {});
    }

    const activeModel = model || DEFAULT_MODELS[provider as AIProvider] || DEFAULT_GEMINI_MODEL;

    // Check if at least one key is present
    const keys = {
      geminiKey: geminiKey || undefined,
      groqKey,
      openrouterKey,
    };

    if (!keys.geminiKey && !keys.groqKey && !keys.openrouterKey) {
      return NextResponse.json(
        { error: 'An API Key for Gemini, Groq, or OpenRouter is required. Please set your API keys in Settings.' },
        { status: 401 }
      );
    }

    const systemInstruction = buildSystemInstruction({
      narratorDirectives,
      settingLore,
      plotHooks,
      writingStyle,
      customObjects,
      fewShotExamples,
      characterName,
      characterPersonality,
      characterTagline,
      targetSpeaker,
      retrievedMemories,
    });

    const payload = assembleGeminiPayload(
      {
        narratorDirectives,
        settingLore,
        plotHooks,
        writingStyle,
        customObjects,
        fewShotExamples,
        characterName,
        characterPersonality,
        characterTagline,
        targetSpeaker,
        retrievedMemories,
        messages,
        maxRecentMessages,
      },
      { temperature, maxOutputTokens }
    );

    // Format chat messages for provider router
    const recentMsgs = messages.slice(-maxRecentMessages);
    const normalizedMessages = recentMsgs.map((m: any) => ({
      role: m.role === 'model' ? ('model' as const) : ('user' as const),
      content: m.content || '',
    }));

    return await routeChatStream(
      {
        provider: provider as AIProvider,
        model: activeModel,
        keys,
        systemInstruction,
        messages: normalizedMessages,
        temperature,
        maxOutputTokens,
      },
      payload
    );
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing chat' },
      { status: 500 }
    );
  }
}
