'use client';

import React from 'react';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { Settings, BrainCircuit, Key } from 'lucide-react';
import { SearchableModelSelect } from '@/components/SearchableModelSelect';
import { ModelOption } from '@/lib/ai/models-fetcher';

export interface HeaderModelOption {
  id: string;
  displayName: string;
  provider?: 'gemini' | 'groq' | 'openrouter';
  isFree?: boolean;
}

interface HeaderProps {
  world: WorldData | null;
  character: CharacterCard | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels?: HeaderModelOption[];
  loadingModels?: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export function Header({
  world,
  character,
  selectedModel,
  onModelChange,
  availableModels = [],
  loadingModels = false,
  hasApiKey,
  onOpenSettings,
  onOpenMemory,
}: HeaderProps) {
  const modelOptions: ModelOption[] = availableModels.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    provider: m.provider || 'gemini',
    isFree: m.isFree,
  }));

  return (
    <header className="h-16 bg-[#0d0f17] border-b border-[#1a1f2c] px-6 flex items-center justify-between sticky top-0 z-10 contain-content">
      {/* Active Context Overview */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-slate-400">World:</span>
          <span className="text-amber-400">{world?.name || 'No World Selected'}</span>
        </div>
        {character && (
          <>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-slate-400">Character:</span>
              <span className="text-cyan-300">{character.name}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Rich Searchable Model Combobox */}
        <SearchableModelSelect
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          models={modelOptions}
          loading={loadingModels}
        />

        {/* API Key Status Indicator */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            hasApiKey
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 animate-pulse'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'API Key Active' : 'Set API Key'}</span>
        </button>

        {/* Memory Inspector Button */}
        <button
          onClick={onOpenMemory}
          className="p-2 rounded-xl bg-[#141824] border border-[#242b3d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Inspect Context Memory"
        >
          <BrainCircuit className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-[#141824] border border-[#242b3d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Open API Settings"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
