'use client';

import React from 'react';
import { X, BrainCircuit, BookOpen, User, Code } from 'lucide-react';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { buildSystemInstruction } from '@/lib/gemini/client';

interface MemoryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldData | null;
  character: CharacterCard | null;
  messageCount: number;
}

export function MemoryInspector({
  isOpen,
  onClose,
  world,
  character,
  messageCount,
}: MemoryInspectorProps) {
  if (!isOpen) return null;

  const systemInstructionPreview = buildSystemInstruction({
    worldLore: world?.loreContent,
    characterName: character?.name,
    characterPersonality: character?.personality,
    scenarioDescription: character?.scenarioDescription,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg h-full bg-[#0d0f17] border-l border-[#1f2430] p-6 shadow-2xl overflow-y-auto space-y-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Context & Memory Inspector</h2>
              <p className="text-xs text-slate-400">Live prompt payload & active persona state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#141824] border border-[#242b3d]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Messages</div>
            <div className="text-lg font-bold text-amber-400">{messageCount} turns</div>
          </div>
          <div className="p-3 rounded-xl bg-[#141824] border border-[#242b3d]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Character</div>
            <div className="text-lg font-bold text-cyan-300 truncate">
              {character?.name || 'None'}
            </div>
          </div>
        </div>

        {/* Character Card Persona */}
        {character && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Character Profile</span>
            </div>
            <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Name:</span>{' '}
                <span className="text-white">{character.name}</span>
              </div>
              {character.tagline && (
                <div>
                  <span className="text-slate-400 font-semibold">Tagline:</span>{' '}
                  <span className="text-slate-200">{character.tagline}</span>
                </div>
              )}
              {character.personality && (
                <div>
                  <span className="text-slate-400 font-semibold">Personality:</span>{' '}
                  <span className="text-slate-300">{character.personality}</span>
                </div>
              )}
              {character.scenarioDescription && (
                <div>
                  <span className="text-slate-400 font-semibold">Scenario:</span>{' '}
                  <span className="text-slate-300">{character.scenarioDescription}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* World Lore */}
        {world && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>World Lore ({world.name})</span>
            </div>
            <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] max-h-48 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
              {world.loreContent}
            </div>
          </div>
        )}

        {/* Raw System Prompt Preview */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
            <Code className="w-4 h-4" />
            <span>Assembled System Instruction</span>
          </div>
          <div className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {systemInstructionPreview}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1f2430]">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#192133] hover:bg-[#212b42] text-xs font-bold text-slate-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
