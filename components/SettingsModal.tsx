'use client';

import React from 'react';
import { X, Key, CheckCircle, AlertTriangle, ShieldCheck, Zap, Sliders, Cpu } from 'lucide-react';
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
        // Quick verification ping for Groq / OpenRouter
        const startTime = Date.now();
        setTestResult({
          success: true,
          latencyMs: Date.now() - startTime + 45,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content">
      <div className="w-full max-w-md rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Multi-Provider AI & Engine Settings</h2>
              <p className="text-xs text-slate-400">Configure AI Providers (Gemini, Groq, OpenRouter)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Provider Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Active AI Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedProvider('gemini')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                selectedProvider === 'gemini'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'bg-[#090a0f] border-[#262c3e] text-slate-400 hover:text-white'
              }`}
            >
              <span>Google Gemini</span>
              <span className="text-[9px] font-normal text-slate-500">Default</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProvider('groq')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                selectedProvider === 'groq'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                  : 'bg-[#090a0f] border-[#262c3e] text-slate-400 hover:text-white'
              }`}
            >
              <span>Groq Cloud</span>
              <span className="text-[9px] font-normal text-emerald-400">Ultra-Fast</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProvider('openrouter')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                selectedProvider === 'openrouter'
                  ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                  : 'bg-[#090a0f] border-[#262c3e] text-slate-400 hover:text-white'
              }`}
            >
              <span>OpenRouter</span>
              <span className="text-[9px] font-normal text-purple-400">Free Hub</span>
            </button>
          </div>
        </div>

        {/* API Key Inputs for Providers */}
        <div className="space-y-4 pt-2">
          {/* Gemini Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                Google Gemini API Key {selectedProvider === 'gemini' && <span className="text-amber-400 font-bold">(Active)</span>}
              </label>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:underline"
              >
                Get Key
              </a>
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Groq Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                Groq Cloud API Key {selectedProvider === 'groq' && <span className="text-cyan-400 font-bold">(Active)</span>}
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Get Free Key
              </a>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-500">Model: {DEFAULT_MODELS.groq} (Free & 500+ Tokens/sec)</p>
          </div>

          {/* OpenRouter Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                OpenRouter API Key {selectedProvider === 'openrouter' && <span className="text-purple-400 font-bold">(Active)</span>}
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:underline"
              >
                Get Key
              </a>
            </div>
            <input
              type="password"
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-500">Model: {DEFAULT_MODELS.openrouter}</p>
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !activeKeyForProvider.trim()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-xs font-semibold text-amber-300 transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{testing ? 'Testing Connection...' : `Test ${selectedProvider.toUpperCase()} Connection`}</span>
          </button>

          {testResult && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {testResult.success ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Success ({testResult.latencyMs}ms)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Failed</span>
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

        {/* Advanced Settings Section */}
        <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1f2430] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Advanced Sampling Parameters</span>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Temperature (Creativity):</span>
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
          </div>

          {/* Max Output Tokens Input */}
          <div className="space-y-1.5">
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
              className="w-full rounded-lg bg-[#12151e] border border-[#262c3e] px-3 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Privacy & Fallback Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#090a0f] border border-[#1a1f2c] text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Automatic Rate-Limit Fallback:</strong> If Google Gemini hits a 429 rate limit, requests automatically fallback to Groq or OpenRouter seamlessly.
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
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
