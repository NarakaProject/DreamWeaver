import { NextRequest, NextResponse } from 'next/server';
import { assembleGeminiPayload, buildSystemInstruction, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { routeChatStream, AIProvider, DEFAULT_MODELS } from '@/lib/ai/provider-router';
import { scoreMemories, extractKeywords, MemoryEntry } from '@/lib/memory/store';
import { shouldSummarize, summarizeTurnChunk } from '@/lib/memory/summarizer';
import { getDatabase } from '@/lib/db';
import { splitMultiSpeakerText } from '@/lib/parser/dreamgen';

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

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
      userMessage,        // { id, content, speaker, timestamp }
      aiMessageBaseId: inputAiBaseId, // optional base ID suggestion
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

    // Server-authoritative AI message base ID
    const aiMessageBaseId = inputAiBaseId || generateId('msg');

    // ─── 1. Persist user message server-side BEFORE starting AI stream ────────
    // INVARIANT (Finding #1): If SQLite rejects user message, turn MUST NOT start!
    if (sessionId && userMessage?.id && userMessage?.content) {
      try {
        const db = getDatabase();
        await db.saveMessage({
          id: userMessage.id,
          session_id: sessionId,
          role: 'user',
          content: userMessage.content,
          type: 'narration',
          speaker: userMessage.speaker || characterName || 'Player',
          timestamp: userMessage.timestamp || Date.now(),
        });
      } catch (err: any) {
        console.error('[chat/route] FATAL: Failed to persist user message to database:', err);
        return NextResponse.json(
          { error: `Database persistence failure: Could not save user turn (${err.message || err})` },
          { status: 500 }
        );
      }
    }

    let retrievedMemories: MemoryEntry[] = body.retrievedMemories || [];

    // ELTM Context Retrieval: search past memories to enrich system prompt
    if ((!retrievedMemories || retrievedMemories.length === 0) && sessionId) {
      const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
      if (lastUserMsg) {
        try {
          const db = getDatabase();
          const dbMems = await db.getMemories(sessionId);
          const serverMemories: MemoryEntry[] = dbMems.map((m) => ({
            id: m.id,
            sessionId: m.session_id,
            turnNumber: m.turn_number,
            speaker: m.speaker || 'Narrator',
            content: m.content,
            keywords: m.keywords ? m.keywords.split(',') : extractKeywords(m.content),
            isSummary: Boolean(m.is_summary),
            timestamp: m.timestamp,
          }));
          retrievedMemories = scoreMemories(serverMemories, lastUserMsg, 5);
        } catch (err) {
          console.error('[chat/route] Failed to retrieve server-side memories:', err);
        }
      }
    }

    const activeModel = model || DEFAULT_MODELS[provider as AIProvider] || DEFAULT_GEMINI_MODEL;

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

    // ─── 2. Stream AI response & await persistence before closing stream ─────
    const upstreamResponse = await routeChatStream(
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

    if (!upstreamResponse.body || !sessionId) {
      return upstreamResponse;
    }

    const upstreamReader = upstreamResponse.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    const customStream = new ReadableStream({
      async start(controller) {
        let hasError = false;
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            accumulatedText += decoder.decode(value, { stream: true });
            controller.enqueue(value);
          }
          accumulatedText += decoder.decode(); // flush remaining bytes

          const fullText = accumulatedText.trim();
          if (fullText && sessionId) {
            const db = getDatabase();
            const defaultSpeaker = targetSpeaker || 'Narrator';
            const sections = splitMultiSpeakerText(fullText, defaultSpeaker, characterName);
            const ts = Date.now();

            // ── A. Persist AI section(s) with server-authoritative IDs ────────
            for (let i = 0; i < sections.length; i++) {
              const sec = sections[i];
              if (!sec.content || !sec.content.trim()) continue;
              const sectionMsgId = sections.length === 1 ? aiMessageBaseId : `${aiMessageBaseId}-${i}`;
              const msgTs = ts + i * 10;

              await db.saveMessage({
                id: sectionMsgId,
                session_id: sessionId,
                role: 'model',
                content: sec.content,
                type: 'narration',
                speaker: sec.speaker,
                timestamp: msgTs,
              });
            }

            // Update session updated_at timestamp
            await db.updateSession(sessionId, { updated_at: ts });

            // ── B. Canonical Server-Side ELTM Memory Indexing ───────────────
            // Auxiliary memory processing: catch errors cleanly so they don't break chat persistence
            try {
              if (userMessage?.content) {
                const userTurnNum = messages.length;
                const userKw = extractKeywords(userMessage.content).join(',');
                await db.saveMemory({
                  id: `mem_${userMessage.timestamp || ts - 1}_user`,
                  session_id: sessionId,
                  turn_number: userTurnNum,
                  speaker: userMessage.speaker || characterName || 'Player',
                  content: userMessage.content,
                  keywords: userKw,
                  is_summary: 0,
                  timestamp: userMessage.timestamp || ts - 1,
                });
              }

              const totalTurns = messages.length + 1;
              const aiKw = extractKeywords(fullText).join(',');
              await db.saveMemory({
                id: `mem_${ts}_ai`,
                session_id: sessionId,
                turn_number: totalTurns,
                speaker: defaultSpeaker,
                content: fullText,
                keywords: aiKw,
                is_summary: 0,
                timestamp: ts,
              });

              // ── C. Auto-Summarization Milestone ─────────────────────────────
              if (shouldSummarize(totalTurns)) {
                const recentTurns = messages.slice(-15).map((m: any, idx: number) => ({
                  speaker: m.speaker || (m.role === 'user' ? characterName || 'Player' : 'Narrator'),
                  content: m.content || '',
                  turnNumber: Math.max(1, totalTurns - 15 + idx),
                }));
                await summarizeTurnChunk(sessionId, recentTurns, totalTurns);
              }
            } catch (eltmErr) {
              console.error('[chat/route] Auxiliary ELTM indexing error (non-fatal):', eltmErr);
            }
          }
        } catch (err) {
          hasError = true;
          console.error('[chat/route] Error during stream reading or persistence:', err);
          controller.error(err);
          return;
        } finally {
          // INVARIANT (Finding #2): Do NOT call controller.close() if stream was errored!
          if (!hasError) {
            controller.close();
          }
        }
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('x-ai-message-id', aiMessageBaseId);

    return new Response(customStream, {
      headers: responseHeaders,
      status: upstreamResponse.status,
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing chat' },
      { status: 500 }
    );
  }
}
