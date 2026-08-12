'use client';

import React from 'react';
import { WorldBuilding, PersonaTemplate } from '@/lib/scenarios/reader';
import { BuildingBlockTooltip } from './BuildingBlockTooltip';
import { ImagePickerWithPreview } from './ImagePickerWithPreview';
import { X, Sparkles, User, Plus, Trash2 } from 'lucide-react';

interface RightInspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  worldBuilding: WorldBuilding;
  persona: PersonaTemplate | null;
  onUpdateWorldBuilding: (updated: WorldBuilding) => void;
  onUpdatePersona: (updated: PersonaTemplate) => void;
}

export function RightInspectorPanel({
  isOpen,
  onClose,
  worldBuilding,
  persona,
  onUpdateWorldBuilding,
  onUpdatePersona,
}: RightInspectorPanelProps) {
  const [activeTab, setActiveTab] = React.useState<
    'directives' | 'lore' | 'persona' | 'npcs' | 'locations' | 'objects' | 'notes'
  >('directives');

  if (!isOpen) return null;

  return (
    <aside className="w-96 bg-[#0d0f17] border-l border-[#1a1f2c] flex flex-col h-full z-20 contain-content overscroll-contain">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1f2c]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h2 className="font-bold text-sm text-white">Live Story Inspector</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181d2a]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 px-3 border-b border-[#1a1f2c] overflow-x-auto text-[11px] font-semibold bg-[#090a0f]">
        <button
          onClick={() => setActiveTab('directives')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'directives' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Directives
        </button>

        <button
          onClick={() => setActiveTab('lore')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'lore' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Lore & Plot
        </button>

        <button
          onClick={() => setActiveTab('persona')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'persona' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Persona
        </button>

        <button
          onClick={() => setActiveTab('npcs')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'npcs' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          NPCs
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'locations' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Locations
        </button>

        <button
          onClick={() => setActiveTab('objects')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'objects' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Objects
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2.5 px-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'notes' ? 'border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          Notes
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* DIRECTIVES */}
        {activeTab === 'directives' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-bold text-amber-400 flex items-center">
                Narrator Directives
                <BuildingBlockTooltip blockKey="narrator" />
              </label>
              <textarea
                value={worldBuilding.narrator || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, narrator: e.target.value })
                }
                className="w-full h-28 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-amber-400 flex items-center">
                Writing Style & Tone
                <BuildingBlockTooltip blockKey="style" />
              </label>
              <textarea
                value={worldBuilding.style || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, style: e.target.value })
                }
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* LORE & PLOT */}
        {activeTab === 'lore' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-bold text-amber-400 flex items-center">
                Setting Lore
                <BuildingBlockTooltip blockKey="setting" />
              </label>
              <textarea
                value={worldBuilding.setting || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, setting: e.target.value })
                }
                className="w-full h-28 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-amber-400 flex items-center">
                Active Plot Hooks
                <BuildingBlockTooltip blockKey="plot" />
              </label>
              <textarea
                value={worldBuilding.plot || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, plot: e.target.value })
                }
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-amber-400 flex items-center">
                History & Backstory
                <BuildingBlockTooltip blockKey="history" />
              </label>
              <textarea
                value={worldBuilding.history || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, history: e.target.value })
                }
                placeholder="Immediate backstory leading into this turn..."
                className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* PERSONA */}
        {activeTab === 'persona' && persona && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-cyan-400 uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Active User Persona</span>
              <BuildingBlockTooltip blockKey="persona" />
            </div>

            <input
              type="text"
              value={persona.name}
              onChange={(e) => onUpdatePersona({ ...persona, name: e.target.value })}
              placeholder="Name"
              className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-xs text-white font-bold"
            />

            <input
              type="text"
              value={persona.tagline || ''}
              onChange={(e) => onUpdatePersona({ ...persona, tagline: e.target.value })}
              placeholder="Tagline"
              className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-xs text-white"
            />

            <ImagePickerWithPreview
              label="Persona Avatar"
              value={persona.avatar || ''}
              onChange={(url) => onUpdatePersona({ ...persona, avatar: url })}
              placeholder="https://... or upload avatar"
            />

            <textarea
              value={persona.personality}
              onChange={(e) => onUpdatePersona({ ...persona, personality: e.target.value })}
              placeholder="Personality traits..."
              className="w-full h-28 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-white resize-none"
            />
          </div>
        )}

        {/* NPCS */}
        {activeTab === 'npcs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-bold text-amber-400 uppercase">
                <span>NPC Companions</span>
                <BuildingBlockTooltip blockKey="characters" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = [...(worldBuilding.scenarioNPCs || [])];
                  updated.push({
                    id: `npc-${Date.now()}`,
                    name: 'New Companion',
                    personality: 'Loyal companion',
                    firstMessage: '',
                  });
                  onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                }}
                className="p-1 text-amber-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {(worldBuilding.scenarioNPCs || []).map((npc, idx) => (
              <div key={npc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={npc.name}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.scenarioNPCs || [])];
                      updated[idx].name = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                    }}
                    className="bg-transparent font-bold text-white text-xs"
                  />
                  <button
                    onClick={() => {
                      const updated = (worldBuilding.scenarioNPCs || []).filter((_, i) => i !== idx);
                      onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                    }}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ImagePickerWithPreview
                  label="NPC Avatar"
                  value={npc.avatar || ''}
                  onChange={(url) => {
                    const updated = [...(worldBuilding.scenarioNPCs || [])];
                    updated[idx].avatar = url;
                    onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                  }}
                  placeholder="https://... or upload portrait"
                />

                <textarea
                  value={npc.personality}
                  onChange={(e) => {
                    const updated = [...(worldBuilding.scenarioNPCs || [])];
                    updated[idx].personality = e.target.value;
                    onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                  }}
                  className="w-full bg-[#090a0f] p-1.5 rounded text-[11px] text-white h-14 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* LOCATIONS */}
        {activeTab === 'locations' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-bold text-emerald-400 uppercase">
                <span>Grounding Locations</span>
                <BuildingBlockTooltip blockKey="locations" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = [...(worldBuilding.locations || [])];
                  updated.push({
                    id: `loc-${Date.now()}`,
                    name: 'New Area',
                    description: 'Architectural details',
                  });
                  onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                }}
                className="p-1 text-emerald-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {(worldBuilding.locations || []).map((loc, idx) => (
              <div key={loc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.locations || [])];
                      updated[idx].name = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                    }}
                    className="bg-transparent font-bold text-white text-xs"
                  />
                  <button
                    onClick={() => {
                      const updated = (worldBuilding.locations || []).filter((_, i) => i !== idx);
                      onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                    }}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={loc.description}
                  onChange={(e) => {
                    const updated = [...(worldBuilding.locations || [])];
                    updated[idx].description = e.target.value;
                    onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                  }}
                  className="w-full bg-[#090a0f] p-1.5 rounded text-[11px] text-white h-14 resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* OBJECTS */}
        {activeTab === 'objects' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-bold text-purple-400 uppercase">
                <span>Objects & CYOA Mechanics</span>
                <BuildingBlockTooltip blockKey="objects" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = [...(worldBuilding.objects || [])];
                  updated.push({
                    id: `obj-${Date.now()}`,
                    name: 'New Item',
                    description: 'Description',
                    trigger_rule: 'Effect rule',
                  });
                  onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                }}
                className="p-1 text-purple-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {(worldBuilding.objects || []).map((obj, idx) => (
              <div key={obj.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={obj.name}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.objects || [])];
                      updated[idx].name = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                    }}
                    className="bg-transparent font-bold text-white text-xs"
                  />
                  <button
                    onClick={() => {
                      const updated = (worldBuilding.objects || []).filter((_, i) => i !== idx);
                      onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                    }}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={obj.description}
                  onChange={(e) => {
                    const updated = [...(worldBuilding.objects || [])];
                    updated[idx].description = e.target.value;
                    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                  }}
                  className="w-full bg-[#090a0f] p-1.5 rounded text-[11px] text-white"
                />
                <input
                  type="text"
                  value={obj.trigger_rule || ''}
                  onChange={(e) => {
                    const updated = [...(worldBuilding.objects || [])];
                    updated[idx].trigger_rule = e.target.value;
                    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                  }}
                  className="w-full bg-[#090a0f] p-1.5 rounded text-[11px] text-purple-300 font-mono"
                />
              </div>
            ))}
          </div>
        )}

        {/* PRIVATE NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1 font-bold text-[#38bdf8] uppercase">
              <span>Private Author Notes</span>
              <BuildingBlockTooltip blockKey="privateNotes" />
            </div>
            <p className="text-[10px] text-slate-400">
              Hidden from AI context. Strictly private author notes.
            </p>
            <textarea
              value={worldBuilding.privateNotes || ''}
              onChange={(e) =>
                onUpdateWorldBuilding({ ...worldBuilding, privateNotes: e.target.value })
              }
              className="w-full h-48 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8] resize-none"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
