'use client';

import React from 'react';
import { WorldBuilding, PersonaTemplate, LocationItem, CustomObject, PromptExample } from '@/lib/scenarios/reader';
import { BuildingBlockTooltip } from './BuildingBlockTooltip';
import { ImagePickerWithPreview } from './ImagePickerWithPreview';
import { X, Sparkles, User, Plus, Trash2, ChevronDown, ChevronRight, MapPin, Package, FileText, Layers, BookOpen, Image as ImageIcon } from 'lucide-react';

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
  // Vertical Accordion Collapsible State for all 12 Building Blocks
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    privateNotes: false,
    plot: true,
    style: true,
    setting: false,
    history: false,
    persona: true,
    characters: true,
    locations: false,
    objects: false,
    narrator: true,
    examples: false,
    images: false,
  });

  if (!isOpen) return null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-96 bg-[#0d0f17] border-l border-[#1a1f2c] flex flex-col h-full z-20 contain-content overscroll-contain max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1f2c] shrink-0 bg-[#090a0f]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-sm text-white">Live Story Inspector</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181d2a] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Vertical Accordion Scrollable Container (No Horizontal Scrollbar) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 text-xs w-full box-border">
        {/* 1. PRIVATE NOTES */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('privateNotes')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-[#38bdf8]">
              {openSections.privateNotes ? (
                <ChevronDown className="w-4 h-4 text-[#38bdf8]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>1. Private Notes</span>
              <BuildingBlockTooltip blockKey="privateNotes" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Hidden from AI</span>
          </div>

          {openSections.privateNotes && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <p className="text-[11px] text-slate-400">
                Secret outlines and draft ideas. Strictly hidden from Gemini.
              </p>
              <textarea
                value={worldBuilding.privateNotes || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, privateNotes: e.target.value })
                }
                placeholder="Keep your plot secrets or draft ideas here..."
                className="w-full h-32 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8] resize-none"
              />
            </div>
          )}
        </div>

        {/* 2. PLOT */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('plot')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.plot ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>2. Plot & Premise</span>
              <BuildingBlockTooltip blockKey="plot" />
            </div>
          </div>

          {openSections.plot && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <textarea
                value={worldBuilding.plot || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, plot: e.target.value })
                }
                placeholder="Main objective and active plot hooks..."
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* 3. STYLE */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('style')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.style ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>3. Style & Perspective</span>
              <BuildingBlockTooltip blockKey="style" />
            </div>
          </div>

          {openSections.style && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <textarea
                value={worldBuilding.style || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, style: e.target.value })
                }
                placeholder="2nd-person present POV, dark fantasy prose..."
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* 4. SETTING */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('setting')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.setting ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>4. Setting & Worldbuilding</span>
              <BuildingBlockTooltip blockKey="setting" />
            </div>
          </div>

          {openSections.setting && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <textarea
                value={worldBuilding.setting || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, setting: e.target.value })
                }
                placeholder="World lore, magic systems, tech level..."
                className="w-full h-28 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* 5. HISTORY */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('history')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.history ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>5. History & Backstory</span>
              <BuildingBlockTooltip blockKey="history" />
            </div>
          </div>

          {openSections.history && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <textarea
                value={worldBuilding.history || ''}
                onChange={(e) =>
                  onUpdateWorldBuilding({ ...worldBuilding, history: e.target.value })
                }
                placeholder="Recap of previous chapters..."
                className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* 6. YOUR PERSONA */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('persona')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-cyan-400">
              {openSections.persona ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>6. Your Persona</span>
              <BuildingBlockTooltip blockKey="persona" />
            </div>
            {persona && <span className="text-[10px] text-cyan-300 font-bold">{persona.name}</span>}
          </div>

          {openSections.persona && persona && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
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
                placeholder="Tagline / Title"
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-xs text-white"
              />

              <ImagePickerWithPreview
                label="Persona Avatar"
                value={persona.avatar || ''}
                assetType="avatar"
                contextHint={`${persona.name || 'Protagonist'} ${persona.tagline || ''}, ${persona.personality || ''}`}
                onChange={(url) => onUpdatePersona({ ...persona, avatar: url })}
                placeholder="https://... or upload avatar"
              />

              <textarea
                value={persona.personality}
                onChange={(e) => onUpdatePersona({ ...persona, personality: e.target.value })}
                placeholder="Personality traits..."
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-white resize-none"
              />
            </div>
          )}
        </div>

        {/* 7. CHARACTERS */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('characters')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.characters ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>7. Characters ({worldBuilding.scenarioNPCs?.length || 0})</span>
              <BuildingBlockTooltip blockKey="characters" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(worldBuilding.scenarioNPCs || [])];
                updated.push({
                  id: `npc-${Date.now()}`,
                  name: 'New Companion',
                  personality: 'Loyal companion',
                  firstMessage: '',
                });
                onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                setOpenSections((prev) => ({ ...prev, characters: true }));
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {openSections.characters && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              {(worldBuilding.scenarioNPCs || []).map((npc, idx) => (
                <div key={npc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2.5 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={npc.name}
                      onChange={(e) => {
                        const updated = [...(worldBuilding.scenarioNPCs || [])];
                        updated[idx].name = e.target.value;
                        onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (worldBuilding.scenarioNPCs || []).filter((_, i) => i !== idx);
                        onUpdateWorldBuilding({ ...worldBuilding, scenarioNPCs: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <ImagePickerWithPreview
                    label="NPC Avatar"
                    value={npc.avatar || ''}
                    assetType="avatar"
                    contextHint={`${npc.name || 'NPC Companion'} ${npc.tagline || ''}, ${npc.personality || ''}`}
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
                    placeholder="Personality & motivations..."
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white h-16 resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 8. LOCATIONS */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('locations')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
              {openSections.locations ? (
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>8. Locations ({worldBuilding.locations?.length || 0})</span>
              <BuildingBlockTooltip blockKey="locations" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(worldBuilding.locations || [])];
                updated.push({
                  id: `loc-${Date.now()}`,
                  name: 'New Area',
                  description: 'Architectural details',
                });
                onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                setOpenSections((prev) => ({ ...prev, locations: true }));
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {openSections.locations && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              {(worldBuilding.locations || []).map((loc, idx) => (
                <div key={loc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const updated = [...(worldBuilding.locations || [])];
                        updated[idx].name = e.target.value;
                        onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (worldBuilding.locations || []).filter((_, i) => i !== idx);
                        onUpdateWorldBuilding({ ...worldBuilding, locations: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
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
                    placeholder="Environmental features, ambient noise..."
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white h-16 resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 9. OBJECTS */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('objects')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-purple-400">
              {openSections.objects ? (
                <ChevronDown className="w-4 h-4 text-purple-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>9. Objects ({worldBuilding.objects?.length || 0})</span>
              <BuildingBlockTooltip blockKey="objects" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(worldBuilding.objects || [])];
                updated.push({
                  id: `obj-${Date.now()}`,
                  name: 'New Item',
                  description: 'Description',
                  trigger_rule: 'Effect rule',
                });
                onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                setOpenSections((prev) => ({ ...prev, objects: true }));
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-[10px] font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {openSections.objects && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              {(worldBuilding.objects || []).map((obj, idx) => (
                <div key={obj.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => {
                        const updated = [...(worldBuilding.objects || [])];
                        updated[idx].name = e.target.value;
                        onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (worldBuilding.objects || []).filter((_, i) => i !== idx);
                        onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
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
                    placeholder="Description"
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white"
                  />
                  <input
                    type="text"
                    value={obj.trigger_rule || ''}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.objects || [])];
                      updated[idx].trigger_rule = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                    }}
                    placeholder="Trigger rule / debuff mechanic"
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-purple-300 font-mono"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 10. NARRATOR */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('narrator')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.narrator ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>10. Narrator & Directives</span>
              <BuildingBlockTooltip blockKey="narrator" />
            </div>
          </div>

          {openSections.narrator && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">GM Directives</label>
                <textarea
                  value={worldBuilding.narrator || ''}
                  onChange={(e) =>
                    onUpdateWorldBuilding({ ...worldBuilding, narrator: e.target.value })
                  }
                  placeholder="Game Master pacing directives..."
                  className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-slate-300">Opening Prologue</label>
                <textarea
                  value={worldBuilding.openingMessage || ''}
                  onChange={(e) =>
                    onUpdateWorldBuilding({ ...worldBuilding, openingMessage: e.target.value })
                  }
                  placeholder="Opening narration prologue..."
                  className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* 11. EXAMPLES */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('examples')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.examples ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>11. Reference Examples ({worldBuilding.examples?.length || 0})</span>
              <BuildingBlockTooltip blockKey="examples" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(worldBuilding.examples || [])];
                updated.push({ user: '', model: '' });
                onUpdateWorldBuilding({ ...worldBuilding, examples: updated });
                setOpenSections((prev) => ({ ...prev, examples: true }));
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {openSections.examples && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              {(worldBuilding.examples || []).map((ex, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">Example #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const updated = (worldBuilding.examples || []).filter((_, i) => i !== idx);
                        onUpdateWorldBuilding({ ...worldBuilding, examples: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={ex.user}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.examples || [])];
                      updated[idx].user = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, examples: updated });
                    }}
                    placeholder="User Turn Example..."
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white h-14 resize-none"
                  />
                  <textarea
                    value={ex.model}
                    onChange={(e) => {
                      const updated = [...(worldBuilding.examples || [])];
                      updated[idx].model = e.target.value;
                      onUpdateWorldBuilding({ ...worldBuilding, examples: updated });
                    }}
                    placeholder="Model Response Example..."
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-amber-300 h-14 resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 12. IMAGES */}
        <div className="border border-[#1f2430] rounded-xl bg-[#12151e] overflow-hidden w-full box-border">
          <div
            onClick={() => toggleSection('images')}
            className="flex items-center justify-between p-3 bg-[#151926] hover:bg-[#1a2030] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              {openSections.images ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span>12. Images & Cover Art</span>
              <BuildingBlockTooltip blockKey="images" />
            </div>
          </div>

          {openSections.images && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              <ImagePickerWithPreview
                label="Cover Image"
                value={worldBuilding.images?.coverImage || ''}
                assetType="cover"
                contextHint={`${worldBuilding.setting || 'Fantasy world story background'}`}
                onChange={(url) =>
                  onUpdateWorldBuilding({
                    ...worldBuilding,
                    images: { ...worldBuilding.images, coverImage: url },
                  })
                }
                placeholder="https://... or upload cover"
              />
              <ImagePickerWithPreview
                label="Background Image"
                value={worldBuilding.images?.backgroundImage || ''}
                assetType="location"
                contextHint={`${worldBuilding.setting || 'Fantasy environmental background'}`}
                onChange={(url) =>
                  onUpdateWorldBuilding({
                    ...worldBuilding,
                    images: { ...worldBuilding.images, backgroundImage: url },
                  })
                }
                placeholder="https://... or upload background"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
