'use client';

import React from 'react';
import {
  X,
  BrainCircuit,
  BookOpen,
  User,
  Code,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { buildSystemInstruction } from '@/lib/gemini/client';
import { MemoryEntry, addMemory, getMemoriesForSession, searchMemories, deleteMemory } from '@/lib/memory/store';

interface MemoryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldData | null;
  character: CharacterCard | null;
  messageCount: number;
  activeSessionId?: string | null;
}

export function MemoryInspector({
  isOpen,
  onClose,
  world,
  character,
  messageCount,
  activeSessionId,
}: MemoryInspectorProps) {
  const [activeTab, setActiveTab] = React.useState<'context' | 'vault'>('vault');
  const [memories, setMemories] = React.useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newFactText, setNewFactText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Load memories for active session
  const loadMemories = React.useCallback(async () => {
    if (!activeSessionId) return;
    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const results = await searchMemories(activeSessionId, searchQuery, 20);
        setMemories(results);
      } else {
        const all = await getMemoriesForSession(activeSessionId);
        setMemories(all);
      }
    } catch {
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, searchQuery]);

  React.useEffect(() => {
    if (isOpen && activeSessionId) {
      loadMemories();
    }
  }, [isOpen, activeSessionId, searchQuery, loadMemories]);

  if (!isOpen) return null;

  const systemInstructionPreview = buildSystemInstruction({
    settingLore: world?.loreContent,
    characterName: character?.name,
    characterPersonality: character?.personality,
  });

  const handleAddCustomFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim() || !activeSessionId) return;

    await addMemory({
      sessionId: activeSessionId,
      turnNumber: messageCount + 1,
      speaker: 'Author Note / Fact',
      content: newFactText.trim(),
      isSummary: true,
      keywords: ['custom_fact', 'permanent_lore'],
    });

    setNewFactText('');
    await loadMemories();
  };

  const handleDeleteMemory = async (memId: string) => {
    if (!activeSessionId) return;
    await deleteMemory(activeSessionId, memId);
    await loadMemories();
  };

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
              <p className="text-xs text-slate-400">Episodic Long-Term Memory (ELTM) & Prompt Payload</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#090a0f] p-1 rounded-xl border border-[#242b3d]">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'vault'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>🧠 Memory Vault ({memories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'context'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>📋 System Context</span>
          </button>
        </div>

        {/* TAB 1: 🧠 MEMORY VAULT (ELTM) */}
        {activeTab === 'vault' && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Search Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indexed memories & turns..."
                className="w-full rounded-xl bg-[#090a0f] border border-[#242b3d] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Add Custom Fact Form */}
            <form onSubmit={handleAddCustomFact} className="flex gap-2">
              <input
                type="text"
                value={newFactText}
                onChange={(e) => setNewFactText(e.target.value)}
                placeholder="Add custom permanent fact (e.g. Player has Golden Key)..."
                className="flex-1 rounded-xl bg-[#090a0f] border border-[#242b3d] px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newFactText.trim()}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fact</span>
              </button>
            </form>

            {/* Memory List Container */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh] pr-1">
              {memories.length === 0 ? (
                <div className="p-8 text-center bg-[#090a0f] rounded-2xl border border-[#242b3d] space-y-2">
                  <BrainCircuit className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">No indexed memories found</p>
                  <p className="text-[11px] text-slate-500">
                    As you play turns, key events and background summaries will automatically index here.
                  </p>
                </div>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5 hover:border-[#38435e] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                          Turn {mem.turnNumber}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">{mem.speaker}</span>
                        {mem.isSummary && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Summary
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{mem.content}</p>

                    {mem.keywords && mem.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {mem.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="text-[9px] font-mono text-slate-500 bg-[#141824] px-1.5 py-0.5 rounded">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: 📋 SYSTEM CONTEXT */}
        {activeTab === 'context' && (
          <div className="space-y-6 flex-1">
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
                </div>
              </div>
            )}

            {/* Raw System Prompt Preview */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                <Code className="w-4 h-4" />
                <span>Assembled System Instruction</span>
              </div>
              <div className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {systemInstructionPreview}
              </div>
            </div>
          </div>
        )}

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
