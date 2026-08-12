import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProviderModels, clearModelsCache } from './models-fetcher';

describe('Models Fetcher Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearModelsCache();
  });

  it('returns fallback presets if provider fetch fails or is offline', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const models = await fetchProviderModels('openrouter');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].provider).toBe('openrouter');
  });

  it('parses OpenRouter models and sorts free models to top', async () => {
    const mockOpenRouterRes = {
      data: [
        { id: 'openai/gpt-4o', name: 'GPT-4o', pricing: { prompt: '0.000005' } },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Free', pricing: { prompt: '0' } },
      ],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenRouterRes,
    } as any);

    const models = await fetchProviderModels('openrouter');
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('meta-llama/llama-3.3-70b-instruct:free');
    expect(models[0].isFree).toBe(true);
    expect(models[1].id).toBe('openai/gpt-4o');
    expect(models[1].isFree).toBe(false);
  });
});
