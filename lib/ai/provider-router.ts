export type AIProvider = 'gemini' | 'groq' | 'openrouter';

export interface ProviderKeys {
  geminiKey?: string;
  groqKey?: string;
  openrouterKey?: string;
}

export interface StreamChatOptions {
  provider: AIProvider;
  model: string;
  keys: ProviderKeys;
  systemInstruction: string;
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  temperature: number;
  maxOutputTokens: number;
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
};

export interface ProviderModelPreset {
  id: string;
  displayName: string;
}

export const PROVIDER_MODEL_PRESETS: Record<AIProvider, ProviderModelPreset[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', displayName: 'gemini-2.5-flash (Default)' },
    { id: 'gemini-2.5-pro', displayName: 'gemini-2.5-pro' },
    { id: 'gemini-1.5-flash', displayName: 'gemini-1.5-flash' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', displayName: 'llama-3.3-70b:versatile (Default)' },
    { id: 'mixtral-8x7b-32768', displayName: 'mixtral-8x7b-32768' },
    { id: 'qwen-2.5-72b-instruct', displayName: 'qwen-2.5-72b-instruct' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', displayName: 'llama-3.3-70b:free (Default)' },
    { id: 'deepseek/deepseek-r1:free', displayName: 'deepseek-r1:free' },
    { id: 'mistralai/mistral-7b-instruct:free', displayName: 'mistral-7b-instruct:free' },
  ],
};

/**
 * Normalizes messages into OpenAI Chat Completion format:
 * [{ role: 'system', content }, { role: 'user', content }, { role: 'assistant', content }]
 */
export function formatOpenAIMessages(
  systemInstruction: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>
) {
  const formatted: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemInstruction) {
    formatted.push({ role: 'system', content: systemInstruction });
  }

  for (const m of messages) {
    formatted.push({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  return formatted;
}

/**
 * Creates a stream for Groq or OpenRouter (OpenAI Chat Completions SSE format).
 */
async function fetchOpenAICompatibleStream(
  endpoint: string,
  apiKey: string,
  model: string,
  systemInstruction: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  temperature: number,
  maxOutputTokens: number,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const bodyPayload = {
    model,
    messages: formatOpenAIMessages(systemInstruction, messages),
    temperature,
    max_tokens: maxOutputTokens,
    stream: true,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.error?.message || errText;
    } catch {}
    throw new Error(`Provider Error (${res.status}): ${message}`);
  }

  if (!res.body) {
    throw new Error('No response stream received from provider');
  }

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
            const chunkText = json.choices?.[0]?.delta?.content || '';
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
            const finishReason = json.choices?.[0]?.finish_reason;
            if (finishReason === 'length') {
              controller.enqueue(encoder.encode('\n__FINISH_REASON__:length'));
            } else if (finishReason === 'stop') {
              controller.enqueue(encoder.encode('\n__FINISH_REASON__:stop'));
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
    },
  });

  return new Response(res.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Creates a stream for Google Gemini API.
 */
async function fetchGeminiStream(
  apiKey: string,
  model: string,
  payload: any
): Promise<Response> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.error?.message || errText;
    } catch {}
    const err = new Error(`Gemini API Error (${res.status}): ${message}`);
    (err as any).status = res.status;
    throw err;
  }

  if (!res.body) {
    throw new Error('No response body received from Gemini API');
  }

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
            const chunkText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
            const finishReason = json.candidates?.[0]?.finishReason;
            if (finishReason === 'MAX_TOKENS') {
              controller.enqueue(encoder.encode('\n__FINISH_REASON__:length'));
            } else if (finishReason === 'STOP') {
              controller.enqueue(encoder.encode('\n__FINISH_REASON__:stop'));
            }
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
    },
  });

  return new Response(res.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Executes a streaming chat request with automatic Multi-Provider Fallback.
 */
export async function routeChatStream(
  options: StreamChatOptions,
  geminiPayload?: any
): Promise<Response> {
  const { provider, model, keys, systemInstruction, messages, temperature, maxOutputTokens } = options;

  // Primary Provider execution
  try {
    if (provider === 'groq') {
      if (!keys.groqKey) throw new Error('Groq API Key is not configured in Settings');
      return await fetchOpenAICompatibleStream(
        'https://api.groq.com/openai/v1/chat/completions',
        keys.groqKey,
        model || DEFAULT_MODELS.groq,
        systemInstruction,
        messages,
        temperature,
        maxOutputTokens
      );
    }

    if (provider === 'openrouter') {
      if (!keys.openrouterKey) throw new Error('OpenRouter API Key is not configured in Settings');
      return await fetchOpenAICompatibleStream(
        'https://openrouter.ai/api/v1/chat/completions',
        keys.openrouterKey,
        model || DEFAULT_MODELS.openrouter,
        systemInstruction,
        messages,
        temperature,
        maxOutputTokens,
        {
          'HTTP-Referer': 'https://naraka-dreamweaver.local',
          'X-Title': 'Naraka DreamWeaver Novel Studio',
        }
      );
    }

    // Default: Gemini
    if (!keys.geminiKey) throw new Error('Google Gemini API Key is not configured in Settings');
    return await fetchGeminiStream(keys.geminiKey, model || DEFAULT_MODELS.gemini, geminiPayload);
  } catch (err: any) {
    const isRateLimitOrQuota = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Quota exceeded');

    // Automatic fallback if Gemini 429 occurs and Groq or OpenRouter key exists
    if (provider === 'gemini' && isRateLimitOrQuota) {
      console.warn('Gemini 429 Rate Limit hit. Attempting automatic provider fallback...');

      if (keys.groqKey) {
        console.warn('Falling back seamlessly to Groq Cloud...');
        return await fetchOpenAICompatibleStream(
          'https://api.groq.com/openai/v1/chat/completions',
          keys.groqKey,
          DEFAULT_MODELS.groq,
          systemInstruction,
          messages,
          temperature,
          maxOutputTokens
        );
      }

      if (keys.openrouterKey) {
        console.warn('Falling back seamlessly to OpenRouter Free Llama...');
        return await fetchOpenAICompatibleStream(
          'https://openrouter.ai/api/v1/chat/completions',
          keys.openrouterKey,
          DEFAULT_MODELS.openrouter,
          systemInstruction,
          messages,
          temperature,
          maxOutputTokens
        );
      }
    }

    throw err;
  }
}
