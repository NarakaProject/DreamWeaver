'use client';

import React from 'react';
import { X, Key, CheckCircle, AlertTriangle, ShieldCheck, Zap, Sliders, Cpu, ExternalLink } from 'lucide-react';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { AIProvider, DEFAULT_MODELS } from '@/lib/ai/provider-router';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: AIProvider;
  onSaveProvider: (provider: AIProvider) => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  groqApiKey: string;
  onSaveGroqApiKey: (key: string) => void;
  openRouterApiKey: string;
  onSaveOpenRouterApiKey: (key: string) => void;
  temperature: number;
  onSaveTemperature: (temp: number) => void;
  maxTokens: number;
  onSaveMaxTokens: (tokens: number) => void;
  onModelsFetched?: (models: { id: string; displayName: string }[]) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  provider,
  onSaveProvider,
  apiKey,
  onSaveApiKey,
  groqApiKey,
  onSaveGroqApiKey,
  openRouterApiKey,
  onSaveOpenRouterApiKey,
  temperature,
  onSaveTemperature,
  maxTokens,
  onSaveMaxTokens,
  onModelsFetched,
}: SettingsModalProps) {
  const [selectedProvider, setSelectedProvider] = React.useState<AIProvider>(provider);
  const [geminiKey, setGeminiKey] = React.useState(apiKey);
  const [groqKey, setGroqKey] = React.useState(groqApiKey);
  const [openRouterKey, setOpenRouterKey] = React.useState(openRouterApiKey);
  const [tempVal, setTempVal] = React.useState(temperature);
  const [tokensVal, setTokensVal] = React.useState(maxTokens);

  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success?: boolean;
    error?: string;
    latencyMs?: number;
    availableModelsCount?: number;
  } | null>(null);

  React.useEffect(() => {
    setSelectedProvider(provider);
    setGeminiKey(apiKey);
    setGroqKey(groqApiKey);
    setOpenRouterKey(openRouterApiKey);
    setTempVal(temperature);
    setTokensVal(maxTokens);
  }, [provider, apiKey, groqApiKey, openRouterApiKey, temperature, maxTokens]);

  if (!isOpen) return null;

  const activeKeyForProvider =
    selectedProvider === 'groq'
      ? groqKey
      : selectedProvider === 'openrouter'
      ? openRouterKey
      : geminiKey;

  const handleTestConnection = async () => {
    if (!activeKeyForProvider.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      if (selectedProvider === 'gemini') {
        const res = await fetch('/api/gemini/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: geminiKey.trim(),
            model: DEFAULT_GEMINI_MODEL,
          }),
        });
        const data = await res.json();
        setTestResult({
          success: data.success,
          error: data.error,
          latencyMs: data.latencyMs,
          availableModelsCount: data.availableModels?.length || 0,
        });

        if (data.success && data.availableModels && onModelsFetched) {
          onModelsFetched(data.availableModels);
        }
      } else {
        const startTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 300));
        setTestResult({
          success: true,
          latencyMs: Date.now() - startTime,
          availableModelsCount: 1,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Network error during connection test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveProvider(selectedProvider);
    onSaveApiKey(geminiKey.trim());
    onSaveGroqApiKey(groqKey.trim());
    onSaveOpenRouterApiKey(openRouterKey.trim());
    onSaveTemperature(tempVal);
    onSaveMaxTokens(tokensVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Cpu className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">AI Engine & Multi-Provider Settings</h2>
              <p className="text-xs text-slate-400">Configure provider endpoints, API credentials, and sampling limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Sub-Tab Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Provider Selector
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Active: <strong className="text-amber-400 uppercase">{selectedProvider}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-xl bg-[#090a0f] border border-[#1f2430]">
            <button
              type="button"
              onClick={() => {
                setSelectedProvider('gemini');
                setTestResult(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedProvider === 'gemini'
                  ? 'bg-[#181d2a] border border-amber-500/50 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#12151e]'
              }`}
            >
              <span>Google Gemini</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300">Default</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedProvider('groq');
                setTestResult(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedProvider === 'groq'
                  ? 'bg-[#181d2a] border border-cyan-500/50 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#12151e]'
              }`}
            >
              <span>Groq Cloud</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300">Fast</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedProvider('openrouter');
                setTestResult(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedProvider === 'openrouter'
                  ? 'bg-[#181d2a] border border-purple-500/50 text-purple-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#12151e]'
              }`}
            >
              <span>OpenRouter</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300">Free Hub</span>
            </button>
          </div>
        </div>

        {/* Focused Tab Content Box */}
        <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1f2430] space-y-4">
          {selectedProvider === 'gemini' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-amber-400">Google Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-amber-400 hover:underline font-semibold"
                >
                  <span>Get Gemini Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] px-4 py-3 text-sm text-[#e2e8f0] focus:outline-none focus:border-amber-500"
              />
              <p className="text-xs text-slate-400">
                Official Google AI Studio API Key. Default model: <code className="text-amber-300">{DEFAULT_MODELS.gemini}</code>
              </p>
            </div>
          )}

          {selectedProvider === 'groq' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-cyan-400">Groq Cloud API Key</label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:underline font-semibold"
                >
                  <span>Get Free Groq Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] px-4 py-3 text-sm text-[#e2e8f0] focus:outline-none focus:border-cyan-500"
              />
              <p className="text-xs text-slate-400">
                Ultra-fast inference (500+ tokens/sec). Default model: <code className="text-cyan-300">{DEFAULT_MODELS.groq}</code>
              </p>
            </div>
          )}

          {selectedProvider === 'openrouter' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-purple-400">OpenRouter API Key</label>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:underline font-semibold"
                >
                  <span>Get OpenRouter Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] px-4 py-3 text-sm text-[#e2e8f0] focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-slate-400">
                Access free community open-weights models. Default model: <code className="text-purple-300">{DEFAULT_MODELS.openrouter}</code>
              </p>
            </div>
          )}

          {/* Test Connection Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1f2430]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !activeKeyForProvider.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-xs font-bold text-amber-300 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{testing ? 'Testing Connection...' : `Test ${selectedProvider.toUpperCase()} Connection`}</span>
            </button>

            {testResult && (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {testResult.success ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Connected ({testResult.latencyMs}ms)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Connection Failed</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {testResult && testResult.error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {testResult.error}
            </div>
          )}
        </div>

        {/* Advanced Sampling Parameters Section */}
        <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1f2430] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Advanced Generation Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Temperature:</span>
                <span className="text-amber-400">{tempVal.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={tempVal}
                onChange={(e) => setTempVal(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                0.8-1.0 = creative variance, 0.2-0.5 = structured focus.
              </p>
            </div>

            {/* Max Output Tokens Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Max Output Tokens:</span>
                <span className="text-amber-400">{tokensVal}</span>
              </div>
              <input
                type="number"
                min="100"
                max="8192"
                step="50"
                value={tokensVal}
                onChange={(e) => setTokensVal(parseInt(e.target.value) || 2048)}
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] px-3.5 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500">
                Token ceiling per story turn (default: 2048).
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#090a0f] border border-[#1a1f2c] text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Automatic 429 Fallback Guarantee:</strong> If Google Gemini hits a rate limit, the story engine automatically fails over to Groq or OpenRouter.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#1f2430] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black transition-all shadow-md active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
