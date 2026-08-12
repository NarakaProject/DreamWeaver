'use client';

import React from 'react';
import {
  PromptExample,
  ExampleOption,
  ExampleInteraction,
  PersonaTemplate,
  normalizePromptExample,
} from '@/lib/scenarios/types';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  MessageSquare,
  ListFilter,
  GripVertical,
  HelpCircle,
} from 'lucide-react';

interface ExamplesBlockEditorProps {
  examples: PromptExample[];
  onChange: (updated: PromptExample[]) => void;
  knownNPCs?: PersonaTemplate[];
  userPersonaName?: string;
}

export function ExamplesBlockEditor({
  examples,
  onChange,
  knownNPCs = [],
  userPersonaName = 'user',
}: ExamplesBlockEditorProps) {
  // Normalize all incoming examples into full Multi-Turn Interaction Trees
  const normalizedExamples = (examples || []).map(normalizePromptExample);

  const handleUpdateExample = (idx: number, updatedEx: PromptExample) => {
    const list: PromptExample[] = [...normalizedExamples];
    list[idx] = updatedEx;
    onChange(list);
  };

  const handleAddExample = () => {
    const newEx: PromptExample = {
      id: `ex-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: '',
      options: [
        {
          id: `opt-${Date.now()}-1`,
          label: '⚔️ Challenge Enemy',
          content: '*I step forward and draw my weapon, challenging the guard captain.*',
        },
      ],
      interactions: [
        {
          id: `it-${Date.now()}-1`,
          role: 'user',
          content: 'I demand an audience with the guild master.',
        },
        {
          id: `it-${Date.now()}-2`,
          role: 'Narrator',
          content: 'The guard captain narrows his eyes, surveying your armament before stepping aside with a curt nod.',
        },
      ],
    };
    onChange([...normalizedExamples, newEx]);
  };

  const handleDeleteExample = (idx: number) => {
    const list: PromptExample[] = normalizedExamples.filter((_, i) => i !== idx);
    onChange(list);
  };

  const handleMoveExample = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= normalizedExamples.length) return;
    const list: PromptExample[] = [...normalizedExamples];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    onChange(list);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header & Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Few-Shot Roleplay Examples ({normalizedExamples.length})</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Optional interaction trees demonstrating writing style, CYOA choices, character voices, and mechanics.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddExample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Example Tree</span>
        </button>
      </div>

      {normalizedExamples.length === 0 && (
        <div className="p-6 rounded-xl bg-[#090a0f] border border-dashed border-[#262c3e] text-center space-y-2">
          <MessageSquare className="w-6 h-6 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-xs font-medium">No roleplay reference examples added yet.</p>
          <p className="text-slate-500 text-[11px]">
            Click <strong className="text-amber-400">&quot;Add Example Tree&quot;</strong> to define CYOA choice options and multi-turn message threads.
          </p>
        </div>
      )}

      {/* Example Trees List */}
      <div className="space-y-5">
        {normalizedExamples.map((ex, exIdx) => (
          <div
            key={ex.id || exIdx}
            className="p-4 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-4 shadow-md relative"
          >
            {/* Tree Card Top Action Bar */}
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                  Example #{exIdx + 1}
                </span>
                <span className="text-slate-400 font-semibold text-[11px]">
                  {ex.interactions.length} Turns • {ex.options.length} CYOA Options
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveExample(exIdx, 'up')}
                  disabled={exIdx === 0}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move example up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveExample(exIdx, 'down')}
                  disabled={exIdx === normalizedExamples.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move example down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExample(exIdx)}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors ml-1"
                  title="Delete example tree"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 1. Purpose / Description Field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                [Optional] Example Description / Purpose
              </label>
              <textarea
                value={ex.description}
                onChange={(e) =>
                  handleUpdateExample(exIdx, { ...ex, description: e.target.value })
                }
                placeholder="e.g. Demonstration of the combat system, spell casting mechanics, or dialogue tone..."
                className="w-full h-16 rounded-xl bg-[#090a0f] border border-[#262c3e] p-2.5 text-xs text-white resize-none focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 2. CYOA "Choose The Next Step" Options Section */}
            <div className="space-y-2.5 p-3 rounded-xl bg-[#090a0f] border border-[#1f2430]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Choose The Next Step (CYOA Choice Options)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newOpt: ExampleOption = {
                      id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                      label: `Option #${ex.options.length + 1}`,
                      content: '',
                    };
                    handleUpdateExample(exIdx, { ...ex, options: [...ex.options, newOpt] });
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[10px] font-bold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Option</span>
                </button>
              </div>

              {ex.options.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No CYOA options defined for this example.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ex.options.map((opt, optIdx) => (
                    <div
                      key={opt.id || optIdx}
                      className="p-2.5 rounded-lg bg-[#12151e] border border-[#262c3e] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const updatedOpts = [...ex.options];
                            updatedOpts[optIdx].label = e.target.value;
                            handleUpdateExample(exIdx, { ...ex, options: updatedOpts });
                          }}
                          placeholder="Option Label (e.g. ⚔️ Attack)"
                          className="bg-[#090a0f] border border-[#262c3e] rounded px-2 py-1 font-bold text-cyan-300 text-xs flex-1 mr-2 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedOpts = ex.options.filter((_, i) => i !== optIdx);
                            handleUpdateExample(exIdx, { ...ex, options: updatedOpts });
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <textarea
                        value={opt.content}
                        onChange={(e) => {
                          const updatedOpts = [...ex.options];
                          updatedOpts[optIdx].content = e.target.value;
                          handleUpdateExample(exIdx, { ...ex, options: updatedOpts });
                        }}
                        placeholder="Option Action / Dialogue text executed when selected..."
                        className="w-full h-14 bg-[#090a0f] border border-[#262c3e] p-2 rounded text-xs text-white resize-none focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Multi-Turn Interaction Thread Section */}
            <div className="space-y-2.5 p-3 rounded-xl bg-[#090a0f] border border-[#1f2430]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Sequential Interaction Thread ({ex.interactions.length} Messages)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextRole =
                      ex.interactions.length % 2 === 0 ? 'user' : 'Narrator';
                    const newIt: ExampleInteraction = {
                      id: `it-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                      role: nextRole,
                      content: '',
                    };
                    handleUpdateExample(exIdx, { ...ex, interactions: [...ex.interactions, newIt] });
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[10px] font-bold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Message / Interaction</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {ex.interactions.map((it, itIdx) => (
                  <div
                    key={it.id || itIdx}
                    className="p-3 rounded-lg bg-[#12151e] border border-[#262c3e] space-y-2"
                  >
                    {/* Message Header & Role Selector */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">#{itIdx + 1}</span>

                        {/* Speaker Role Selector */}
                        <select
                          value={it.role}
                          onChange={(e) => {
                            const updatedIts = [...ex.interactions];
                            updatedIts[itIdx].role = e.target.value;
                            handleUpdateExample(exIdx, { ...ex, interactions: updatedIts });
                          }}
                          className="bg-[#090a0f] border border-[#262c3e] rounded px-2 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="user">User ({userPersonaName || 'user'})</option>
                          <option value="Narrator">Narrator (Game Master)</option>
                          <option value="model">Model Response</option>
                          <option value="(narrative)">(narrative) Prologue</option>
                          {knownNPCs.map((npc) => (
                            <option key={npc.id} value={npc.name}>
                              NPC: {npc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Message Reorder & Delete controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (itIdx === 0) return;
                            const updatedIts = [...ex.interactions];
                            const temp = updatedIts[itIdx];
                            updatedIts[itIdx] = updatedIts[itIdx - 1];
                            updatedIts[itIdx - 1] = temp;
                            handleUpdateExample(exIdx, { ...ex, interactions: updatedIts });
                          }}
                          disabled={itIdx === 0}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (itIdx === ex.interactions.length - 1) return;
                            const updatedIts = [...ex.interactions];
                            const temp = updatedIts[itIdx];
                            updatedIts[itIdx] = updatedIts[itIdx + 1];
                            updatedIts[itIdx + 1] = temp;
                            handleUpdateExample(exIdx, { ...ex, interactions: updatedIts });
                          }}
                          disabled={itIdx === ex.interactions.length - 1}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedIts = ex.interactions.filter((_, i) => i !== itIdx);
                            handleUpdateExample(exIdx, { ...ex, interactions: updatedIts });
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Message Content Textarea */}
                    <textarea
                      value={it.content}
                      onChange={(e) => {
                        const updatedIts = [...ex.interactions];
                        updatedIts[itIdx].content = e.target.value;
                        handleUpdateExample(exIdx, { ...ex, interactions: updatedIts });
                      }}
                      placeholder={`Enter text prose for ${it.role}...`}
                      className={`w-full h-20 bg-[#090a0f] border border-[#262c3e] p-2.5 rounded-lg text-xs resize-none font-mono focus:outline-none ${
                        it.role === 'user' ? 'text-cyan-300' : 'text-amber-300'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
