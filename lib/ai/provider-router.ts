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

export const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'qwen-2.5-72b-instruct',
];

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-3.6-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openrouter/free',
};

export interface ProviderModelPreset {
  id: string;
  displayName: string;
}

export const PROVIDER_MODEL_PRESETS: Record<AIProvider, ProviderModelPreset[]> = {
  gemini: [
    { id: 'gemini-3.6-flash', displayName: 'gemini-3.6-flash (Default)' },
    { id: 'gemini-3.5-flash', displayName: 'gemini-3.5-flash' },
    { id: 'gemini-3.5-flash-lite', displayName: 'gemini-3.5-flash-lite' },
    { id: 'gemini-3.1-flash-lite', displayName: 'gemini-3.1-flash-lite' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', displayName: 'llama-3.3-70b:versatile (Default)' },
    { id: 'llama-3.1-8b-instant', displayName: 'llama-3.1-8b:instant' },
    { id: 'mixtral-8x7b-32768', displayName: 'mixtral-8x7b-32768' },
    { id: 'qwen-2.5-72b-instruct', displayName: 'qwen-2.5-72b-instruct' },
  ],
  openrouter: [
    { id: 'openrouter/free', displayName: 'openrouter/free (Auto Free Router)' },
  ],
};

// Model-specific temporary cooldown tracker ("provider:model" => timestamp expiration)
const modelCooldownMap = new Map<string, number>();

/**
 * Checks if an error represents a rate limit / quota exhaustion signal (HTTP 429, RESOURCE_EXHAUSTED, TPM/RPM limit).
 */
export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate_limit') ||
    msg.includes('rate limit') ||
    msg.includes('tpm limit') ||
    msg.includes('rpm limit') ||
    msg.includes('tokens per minute') ||
    msg.includes('requests per minute')
  );
}

/**
 * Checks if an error represents an obsolete / unavailable model (HTTP 404, model not found).
 */
export function isModelUnavailableError(err: any): boolean {
  if (!err) return false;
  if (err.status === 404) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('is not found') ||
    msg.includes('not available to new users')
  );
}

/**
 * Temporarily marks a specific model as cooling down for a short duration (default 30s).
 */
export function markModelCooldown(provider: AIProvider, model: string, durationMs: number = 30000) {
  const key = `${provider}:${model}`;
  modelCooldownMap.set(key, Date.now() + durationMs);
  console.warn(`[AI ROUTER] Temporarily cooling model ${key} for ${Math.round(durationMs / 1000)}s`);
}

/**
 * Checks if a specific model is currently in temporary cooldown.
 */
export function isModelCooling(provider: AIProvider, model: string): boolean {
  const key = `${provider}:${model}`;
  const expires = modelCooldownMap.get(key);
  if (!expires) return false;
  if (Date.now() > expires) {
    modelCooldownMap.delete(key);
    return false;
  }
  return true;
}

/**
 * Clears model cooldowns (useful for unit tests).
 */
export function clearModelCooldowns() {
  modelCooldownMap.clear();
}

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
    const err = new Error(`Provider Error (${res.status}): ${message}`);
    (err as any).status = res.status;
    throw err;
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
 * Executes a single model attempt for a provider.
 */
async function executeSingleModelAttempt(
  provider: AIProvider,
  model: string,
  options: StreamChatOptions,
  geminiPayload?: any
): Promise<Response> {
  const { keys, systemInstruction, messages, temperature, maxOutputTokens } = options;

  if (provider === 'gemini') {
    if (!keys.geminiKey) throw new Error('Google Gemini API Key is not configured in Settings');
    return await fetchGeminiStream(keys.geminiKey, model, geminiPayload);
  }

  if (provider === 'groq') {
    if (!keys.groqKey) throw new Error('Groq API Key is not configured in Settings');
    return await fetchOpenAICompatibleStream(
      'https://api.groq.com/openai/v1/chat/completions',
      keys.groqKey,
      model,
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
      model,
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

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Executes a streaming chat request with Intelligent Model-Aware Provider Fallback:
 * Gemini models -> Groq models -> OpenRouter (openrouter/free).
 */
export async function routeChatStream(
  options: StreamChatOptions,
  geminiPayload?: any
): Promise<Response> {
  const primaryProvider = options.provider || 'gemini';
  const primaryModel = options.model || DEFAULT_MODELS[primaryProvider];

  const allProviders: AIProvider[] = ['gemini', 'groq', 'openrouter'];
  const providerSequence: AIProvider[] = [
    primaryProvider,
    ...allProviders.filter(p => p !== primaryProvider)
  ];

  let lastError: Error | null = null;

  for (const provider of providerSequence) {
    const key = provider === 'gemini' ? options.keys.geminiKey :
                provider === 'groq' ? options.keys.groqKey :
                options.keys.openrouterKey;

    if (!key) {
      continue;
    }

    const presetModels = PROVIDER_MODEL_PRESETS[provider].map(m => m.id);
    const candidateModels: string[] = [];
    if (provider === primaryProvider && primaryModel) {
      candidateModels.push(primaryModel);
    }
    for (const mId of presetModels) {
      if (!candidateModels.includes(mId)) {
        candidateModels.push(mId);
      }
    }

    let providerHadFailures = false;

    for (const candidateModel of candidateModels) {
      if (isModelCooling(provider, candidateModel)) {
        console.warn(`[AI ROUTER] Skipping cooling model ${provider} / ${candidateModel}`);
        continue;
      }

      try {
        if (provider !== primaryProvider || candidateModel !== primaryModel) {
          console.warn(`[AI ROUTER] Trying ${provider} / ${candidateModel}`);
        }

        const streamResponse = await executeSingleModelAttempt(
          provider,
          candidateModel,
          options,
          geminiPayload
        );
        return streamResponse;

      } catch (err: any) {
        lastError = err;

        if (isModelUnavailableError(err)) {
          providerHadFailures = true;
          console.warn(`[AI ROUTER] ${provider} / ${candidateModel} → 404 Model unavailable`);
          continue;
        }

        if (isRateLimitError(err)) {
          providerHadFailures = true;
          markModelCooldown(provider, candidateModel, 30000);
          console.warn(`[AI ROUTER] ${provider} / ${candidateModel} → 429 Rate Limit`);
          continue;
        }

        // Non-rate-limit, non-404 error (e.g. invalid key or bad request) -> fail immediately
        console.error(`[AI ROUTER] ${provider} / ${candidateModel} failed with non-retryable error:`, err?.message || err);
        throw err;
      }
    }

    if (providerHadFailures) {
      console.warn(`[AI ROUTER] ${provider} models exhausted. Falling back to next available provider...`);
    }
  }

  const finalError = lastError || new Error('All AI models and providers are currently unavailable or rate-limited.');
  console.error('[AI ROUTER] Final failure: All providers/models exhausted.');
  throw finalError;
}
