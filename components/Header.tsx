'use client';

import React from 'react';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { Settings, BrainCircuit, Key, Cpu, Sparkles } from 'lucide-react';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';

interface HeaderProps {
  world: WorldData | null;
  character: CharacterCard | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export function Header({
  world,
  character,
  selectedModel,
  onModelChange,
  hasApiKey,
  onOpenSettings,
  onOpenMemory,
}: HeaderProps) {
  return (
    <header className="h-16 bg-[#0d0f17]/90 border-b border-[#1a1f2c] px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
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
        {/* Model Selector */}
        <div className="flex items-center gap-1.5 bg-[#141824] border border-[#242b3d] px-2.5 py-1 rounded-lg text-xs">
          <Cpu className="w-3.5 h-3.5 text-amber-400" />
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
          >
            <option value="gemini-2.5-flash" className="bg-[#0d0f17]">gemini-2.5-flash (Default)</option>
            <option value="gemini-1.5-pro" className="bg-[#0d0f17]">gemini-1.5-pro</option>
            <option value="gemini-1.5-flash" className="bg-[#0d0f17]">gemini-1.5-flash</option>
          </select>
        </div>

        {/* API Key Status Indicator */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
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
          className="p-2 rounded-lg bg-[#141824] border border-[#242b3d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Inspect Context Memory"
        >
          <BrainCircuit className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-[#141824] border border-[#242b3d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Open API Settings"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
