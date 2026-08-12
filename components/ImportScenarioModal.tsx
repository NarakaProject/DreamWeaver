'use client';

import React from 'react';
import { parseWorldGenJson } from '@/lib/scenarios/importer';
import { FullScenario } from '@/lib/scenarios/types';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

interface ImportScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (scenario: FullScenario) => void;
}

export function ImportScenarioModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportScenarioModalProps) {
  const [jsonText, setJsonText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [parsedPreview, setParsedPreview] = React.useState<FullScenario | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content || '');
      handleValidateJson(content || '');
    };
    reader.readAsText(file);
  };

  const handleValidateJson = (text: string) => {
    setError(null);
    setParsedPreview(null);

    if (!text.trim()) return;

    try {
      const parsed = parseWorldGenJson(text);
      setParsedPreview(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to parse World-Gen / DreamGen JSON');
    }
  };

  const handleExecuteImport = async () => {
    if (!jsonText.trim()) return;
    setIsParsing(true);
    setError(null);

    try {
      const scenario = parseWorldGenJson(jsonText);

      // Save to server database / scenarios catalog
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });

      if (!res.ok) {
        throw new Error('Failed to save imported scenario to local database');
      }

      onImportSuccess(scenario);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error processing scenario import');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Upload className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Scenario / World JSON</h2>
              <p className="text-xs text-slate-400">Support World-Gen, DreamGen, and custom JSON building block schemas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Upload Drop Area */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Option 1: Upload JSON File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[#090a0f] border-2 border-dashed border-[#262c3e] hover:border-purple-500/60 text-slate-400 hover:text-purple-300 transition-all cursor-pointer"
          >
            <FileText className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-semibold">Click to select .json file from your computer</span>
          </button>
        </div>

        {/* Paste JSON Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Option 2: Paste Raw JSON Payload
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              handleValidateJson(e.target.value);
            }}
            placeholder='{"title": "Naruto: Hidden Leaf", "setting": "Konohagakure village...", "plot": "..."}'
            rows={6}
            className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs font-mono text-[#e2e8f0] focus:outline-none focus:border-purple-500 leading-relaxed"
          />
        </div>

        {/* Parsed Scenario Live Preview Card */}
        {parsedPreview && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Valid 12-Block Scenario Detected!</span>
            </div>
            <div className="text-white font-bold">{parsedPreview.meta.title}</div>
            <div className="text-slate-400 line-clamp-2">{parsedPreview.meta.description}</div>
            <div className="flex gap-3 text-[11px] text-slate-400 pt-1">
              <span>Category: <strong className="text-purple-300">{parsedPreview.meta.category}</strong></span>
              <span>Personas: <strong className="text-cyan-300">{parsedPreview.suggestedPersonas.length}</strong></span>
              <span>Objects: <strong className="text-amber-300">{parsedPreview.worldBuilding.objects.length}</strong></span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
            onClick={handleExecuteImport}
            disabled={!parsedPreview || isParsing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isParsing ? 'Importing Scenario...' : 'Import to Scenario Catalog'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
