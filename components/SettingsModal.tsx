'use client';

import React from 'react';
import { X, Key, CheckCircle, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export function SettingsModal({ isOpen, onClose, apiKey, onSaveApiKey }: SettingsModalProps) {
  const [inputKey, setInputKey] = React.useState(apiKey);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success?: boolean;
    error?: string;
    latencyMs?: number;
  } | null>(null);

  React.useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!inputKey.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: inputKey.trim(),
          model: DEFAULT_GEMINI_MODEL,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        error: data.error,
        latencyMs: data.latencyMs,
      });
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
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gemini API Settings</h2>
              <p className="text-xs text-slate-400">Configure your Google Gemini API Key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-3 text-sm text-[#e2e8f0] focus:outline-none focus:border-amber-500"
          />
          <p className="text-xs text-slate-400">
            Obtain a free API key from{' '}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>

        {/* Test Connection Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !inputKey.trim()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-xs font-semibold text-amber-300 transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{testing ? 'Testing Connection...' : 'Test Connection'}</span>
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

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#090a0f] border border-[#1a1f2c] text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Privacy Guarantee:</strong> Your key is stored strictly in your browser's local storage and used directly for local API calls.
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
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
