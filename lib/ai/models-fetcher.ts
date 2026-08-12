import { AIProvider, PROVIDER_MODEL_PRESETS } from './provider-router';

export interface ModelOption {
  id: string;
  displayName: string;
  provider: AIProvider;
  isFree?: boolean;
  contextLength?: number;
}

// In-memory cache for fetched models (1 hour TTL)
let cache: Record<string, { timestamp: number; data: ModelOption[] }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function clearModelsCache() {
  cache = {};
}

/**
 * Dynamically fetches models catalog for a specified provider with 1-hour caching and fallback presets.
 */
export async function fetchProviderModels(
  provider: AIProvider,
  keys: { geminiKey?: string; groqKey?: string; openrouterKey?: string } = {}
): Promise<ModelOption[]> {
  const cacheKey = `${provider}-${keys.geminiKey || ''}-${keys.groqKey || ''}-${keys.openrouterKey || ''}`;

  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return cache[cacheKey].data;
  }

  let models: ModelOption[] = [];

  try {
    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: keys.openrouterKey ? { Authorization: `Bearer ${keys.openrouterKey}` } : {},
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const rawModels: ModelOption[] = json.data.map((m: any) => {
            const isFree =
              m.id.endsWith(':free') ||
              (m.pricing && (m.pricing.prompt === '0' || parseFloat(m.pricing.prompt) === 0));

            return {
              id: m.id,
              displayName: m.name || m.id,
              provider: 'openrouter',
              isFree,
              contextLength: m.context_length || 8192,
            };
          });

          // Sort free models to the top, then alphabetically
          models = rawModels.sort((a, b) => {
            if (a.isFree && !b.isFree) return -1;
            if (!a.isFree && b.isFree) return 1;
            return a.displayName.localeCompare(b.displayName);
          });
        }
      }
    } else if (provider === 'groq') {
      if (keys.groqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${keys.groqKey}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            models = json.data
              .filter((m: any) => !m.id.includes('whisper') && !m.id.includes('vision'))
              .map((m: any) => ({
                id: m.id,
                displayName: m.id,
                provider: 'groq' as AIProvider,
                isFree: true, // Groq models are free tier
                contextLength: m.context_window || 8192,
              }));
          }
        }
      }
    } else if (provider === 'gemini') {
      if (keys.geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${keys.geminiKey}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.models && Array.isArray(json.models)) {
            models = json.models
              .filter(
                (m: any) =>
                  m.name.includes('gemini') &&
                  m.supportedGenerationMethods?.includes('generateContent')
              )
              .map((m: any) => {
                const cleanId = m.name.replace(/^models\//, '');
                return {
                  id: cleanId,
                  displayName: m.displayName || cleanId,
                  provider: 'gemini' as AIProvider,
                  contextLength: m.inputTokenLimit || 32768,
                };
              });
          }
        }
      }
    }
  } catch (err) {
    console.error(`Failed to dynamically fetch models for provider ${provider}:`, err);
  }

  // Fallback to static presets if fetch returned no models or failed
  if (models.length === 0) {
    const presets = PROVIDER_MODEL_PRESETS[provider] || PROVIDER_MODEL_PRESETS.gemini;
    models = presets.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      provider,
      isFree: provider === 'groq' || p.id.includes(':free'),
    }));
  }

  cache[cacheKey] = { timestamp: Date.now(), data: models };
  return models;
}
