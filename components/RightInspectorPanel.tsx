'use client';

import React from 'react';
import { WorldBuilding, PersonaTemplate, LocationItem, CustomObject, PromptExample } from '@/lib/scenarios/reader';
import { BuildingBlockTooltip } from './BuildingBlockTooltip';
import { ImagePickerWithPreview } from './ImagePickerWithPreview';
import { X, Sparkles, User, Plus, Trash2, ChevronDown, ChevronRight, MapPin, Package, FileText, Layers, BookOpen, Image as ImageIcon, Save, CheckCircle2, AlertCircle } from 'lucide-react';

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
  // Local editable draft state to allow batch commits & uncommitted status badges
  const [draftWorldBuilding, setDraftWorldBuilding] = React.useState<WorldBuilding>(worldBuilding);
  const [draftPersona, setDraftPersona] = React.useState<PersonaTemplate | null>(persona);
  const [isDirty, setIsDirty] = React.useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState('');

  // Sync prop changes into draft state when external props update and not dirty
  React.useEffect(() => {
    if (!isDirty) {
      setDraftWorldBuilding(worldBuilding);
      setDraftPersona(persona);
    }
  }, [worldBuilding, persona, isDirty]);

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

  const handleUpdateWorldBuildingDraft = (updated: WorldBuilding) => {
    setDraftWorldBuilding(updated);
    setIsDirty(true);
  };

  const handleUpdatePersonaDraft = (updated: PersonaTemplate) => {
    setDraftPersona(updated);
    setIsDirty(true);
  };

  const handleSaveChanges = () => {
    onUpdateWorldBuilding(draftWorldBuilding);
    if (draftPersona) {
      onUpdatePersona(draftPersona);
    }
    setIsDirty(false);
    setSaveSuccessMsg('Context Committed!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
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

      {/* Vertical Accordion Scrollable Container */}
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
                value={draftWorldBuilding.privateNotes || ''}
                onChange={(e) =>
                  handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, privateNotes: e.target.value })
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
              <span>2. Plot & Story Premise</span>
              <BuildingBlockTooltip blockKey="plot" />
            </div>
          </div>

          {openSections.plot && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-2 w-full box-border">
              <textarea
                value={draftWorldBuilding.plot || ''}
                onChange={(e) =>
                  handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, plot: e.target.value })
                }
                placeholder="Main scene objectives and active conflicts..."
                className="w-full h-28 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
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
                value={draftWorldBuilding.style || ''}
                onChange={(e) =>
                  handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, style: e.target.value })
                }
                placeholder="Writing style and POV directives..."
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
                value={draftWorldBuilding.setting || ''}
                onChange={(e) =>
                  handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, setting: e.target.value })
                }
                placeholder="World lore, ambient rules, magic system..."
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
                value={draftWorldBuilding.history || ''}
                onChange={(e) =>
                  handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, history: e.target.value })
                }
                placeholder="Recap of past events and scene context..."
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
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
              <span>6. Your Persona ({draftPersona?.name || 'Protagonist'})</span>
              <BuildingBlockTooltip blockKey="persona" />
            </div>
          </div>

          {openSections.persona && draftPersona && (
            <div className="p-3 bg-[#0d0f17] border-t border-[#1f2430] space-y-3 w-full box-border">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Name</label>
                <input
                  type="text"
                  value={draftPersona.name || ''}
                  onChange={(e) =>
                    handleUpdatePersonaDraft({ ...draftPersona, name: e.target.value })
                  }
                  placeholder="Character Name"
                  className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Tagline / Class</label>
                <input
                  type="text"
                  value={draftPersona.tagline || ''}
                  onChange={(e) =>
                    handleUpdatePersonaDraft({ ...draftPersona, tagline: e.target.value })
                  }
                  placeholder="Tagline / Title"
                  className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-xs text-white"
                />
              </div>

              <ImagePickerWithPreview
                label="Persona Avatar"
                value={draftPersona.avatar || ''}
                assetType="avatar"
                contextHint={`${draftPersona.name || 'Protagonist'} ${draftPersona.tagline || ''}, ${draftPersona.personality || ''}`}
                onChange={(url) => handleUpdatePersonaDraft({ ...draftPersona, avatar: url })}
                placeholder="https://... or upload avatar"
              />

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Personality & Traits</label>
                <textarea
                  value={draftPersona.personality}
                  onChange={(e) =>
                    handleUpdatePersonaDraft({ ...draftPersona, personality: e.target.value })
                  }
                  placeholder="Character behavioral traits..."
                  className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. CHARACTERS & NPCS */}
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
              <span>7. Characters ({draftWorldBuilding.scenarioNPCs?.length || 0})</span>
              <BuildingBlockTooltip blockKey="characters" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(draftWorldBuilding.scenarioNPCs || [])];
                updated.push({
                  id: `npc-${Date.now()}`,
                  name: 'New Companion',
                  tagline: 'Ally',
                  personality: 'Trait description',
                  firstMessage: '',
                });
                handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, scenarioNPCs: updated });
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
              {(draftWorldBuilding.scenarioNPCs || []).map((npc, idx) => (
                <div key={npc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={npc.name}
                      onChange={(e) => {
                        const updated = [...(draftWorldBuilding.scenarioNPCs || [])];
                        updated[idx].name = e.target.value;
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, scenarioNPCs: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (draftWorldBuilding.scenarioNPCs || []).filter((_, i) => i !== idx);
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, scenarioNPCs: updated });
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
                      const updated = [...(draftWorldBuilding.scenarioNPCs || [])];
                      updated[idx].avatar = url;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, scenarioNPCs: updated });
                    }}
                    placeholder="https://... or upload portrait"
                  />

                  <textarea
                    value={npc.personality}
                    onChange={(e) => {
                      const updated = [...(draftWorldBuilding.scenarioNPCs || [])];
                      updated[idx].personality = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, scenarioNPCs: updated });
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
              <span>8. Locations ({draftWorldBuilding.locations?.length || 0})</span>
              <BuildingBlockTooltip blockKey="locations" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(draftWorldBuilding.locations || [])];
                updated.push({
                  id: `loc-${Date.now()}`,
                  name: 'New Area',
                  description: 'Architectural details',
                });
                handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, locations: updated });
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
              {(draftWorldBuilding.locations || []).map((loc, idx) => (
                <div key={loc.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const updated = [...(draftWorldBuilding.locations || [])];
                        updated[idx].name = e.target.value;
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, locations: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (draftWorldBuilding.locations || []).filter((_, i) => i !== idx);
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, locations: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={loc.description}
                    onChange={(e) => {
                      const updated = [...(draftWorldBuilding.locations || [])];
                      updated[idx].description = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, locations: updated });
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
              <span>9. Objects ({draftWorldBuilding.objects?.length || 0})</span>
              <BuildingBlockTooltip blockKey="objects" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(draftWorldBuilding.objects || [])];
                updated.push({
                  id: `obj-${Date.now()}`,
                  name: 'New Item',
                  description: 'Description',
                  trigger_rule: 'Effect rule',
                });
                handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, objects: updated });
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
              {(draftWorldBuilding.objects || []).map((obj, idx) => (
                <div key={obj.id || idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => {
                        const updated = [...(draftWorldBuilding.objects || [])];
                        updated[idx].name = e.target.value;
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, objects: updated });
                      }}
                      className="bg-transparent font-bold text-white text-xs focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => {
                        const updated = (draftWorldBuilding.objects || []).filter((_, i) => i !== idx);
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, objects: updated });
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
                      const updated = [...(draftWorldBuilding.objects || [])];
                      updated[idx].description = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, objects: updated });
                    }}
                    placeholder="Description"
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white"
                  />
                  <input
                    type="text"
                    value={obj.trigger_rule || ''}
                    onChange={(e) => {
                      const updated = [...(draftWorldBuilding.objects || [])];
                      updated[idx].trigger_rule = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, objects: updated });
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
                  value={draftWorldBuilding.narrator || ''}
                  onChange={(e) =>
                    handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, narrator: e.target.value })
                  }
                  placeholder="Game Master pacing directives..."
                  className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-slate-300">Opening Prologue</label>
                <textarea
                  value={draftWorldBuilding.openingMessage || ''}
                  onChange={(e) =>
                    handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, openingMessage: e.target.value })
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
              <span>11. Reference Examples ({draftWorldBuilding.examples?.length || 0})</span>
              <BuildingBlockTooltip blockKey="examples" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = [...(draftWorldBuilding.examples || [])];
                updated.push({ user: '', model: '' });
                handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, examples: updated });
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
              {(draftWorldBuilding.examples || []).map((ex, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2 w-full box-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">Example Pair #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const updated = (draftWorldBuilding.examples || []).filter((_, i) => i !== idx);
                        handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, examples: updated });
                      }}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={ex.user}
                    onChange={(e) => {
                      const updated = [...(draftWorldBuilding.examples || [])];
                      updated[idx].user = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, examples: updated });
                    }}
                    placeholder="User Turn Action Example..."
                    className="w-full bg-[#090a0f] p-2 rounded-lg border border-[#262c3e] text-xs text-white h-14 resize-none"
                  />
                  <textarea
                    value={ex.model}
                    onChange={(e) => {
                      const updated = [...(draftWorldBuilding.examples || [])];
                      updated[idx].model = e.target.value;
                      handleUpdateWorldBuildingDraft({ ...draftWorldBuilding, examples: updated });
                    }}
                    placeholder="GM Model Response Example..."
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
                value={draftWorldBuilding.images?.coverImage || ''}
                assetType="cover"
                contextHint={`${draftWorldBuilding.setting || 'Fantasy world story background'}`}
                onChange={(url) =>
                  handleUpdateWorldBuildingDraft({
                    ...draftWorldBuilding,
                    images: { ...draftWorldBuilding.images, coverImage: url },
                  })
                }
                placeholder="https://... or upload cover"
              />
              <ImagePickerWithPreview
                label="Background Image"
                value={draftWorldBuilding.images?.backgroundImage || ''}
                assetType="location"
                contextHint={`${draftWorldBuilding.setting || 'Fantasy environmental background'}`}
                onChange={(url) =>
                  handleUpdateWorldBuildingDraft({
                    ...draftWorldBuilding,
                    images: { ...draftWorldBuilding.images, backgroundImage: url },
                  })
                }
                placeholder="https://... or upload background"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar with Status Badge */}
      <div className="p-3 bg-[#090a0f] border-t border-[#1a1f2c] shrink-0 flex items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          {saveSuccessMsg ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </span>
          ) : isDirty ? (
            <span className="text-amber-400 flex items-center gap-1 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>🟡 Unsaved Changes</span>
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>🟢 Synced with AI Context</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={!isDirty}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-40 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save & Commit Changes</span>
        </button>
      </div>
    </aside>
  );
}
