'use client';

import React from 'react';
import { WorldBuilding, CustomObject, PersonaTemplate } from '@/lib/scenarios/reader';
import { X, BookOpen, User, Sparkles, Plus, Trash2, Edit3, Check } from 'lucide-react';

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
  const [activeTab, setActiveTab] = React.useState<'scenario' | 'persona' | 'objects'>('scenario');

  const [setting, setSetting] = React.useState(worldBuilding.setting || '');
  const [plot, setPlot] = React.useState(worldBuilding.plot || '');
  const [style, setStyle] = React.useState(worldBuilding.style || '');
  const [narrator, setNarrator] = React.useState(worldBuilding.narrator || '');
  const [objects, setObjects] = React.useState<CustomObject[]>(worldBuilding.objects || []);

  const [personaName, setPersonaName] = React.useState(persona?.name || '');
  const [personaTagline, setPersonaTagline] = React.useState(persona?.tagline || '');
  const [personaTraits, setPersonaTraits] = React.useState(persona?.personality || '');

  React.useEffect(() => {
    setSetting(worldBuilding.setting || '');
    setPlot(worldBuilding.plot || '');
    setStyle(worldBuilding.style || '');
    setNarrator(worldBuilding.narrator || '');
    setObjects(worldBuilding.objects || []);
  }, [worldBuilding]);

  React.useEffect(() => {
    if (persona) {
      setPersonaName(persona.name);
      setPersonaTagline(persona.tagline || '');
      setPersonaTraits(persona.personality || '');
    }
  }, [persona]);

  if (!isOpen) return null;

  const handleSaveScenarioEdits = () => {
    onUpdateWorldBuilding({
      ...worldBuilding,
      setting,
      plot,
      style,
      narrator,
      objects,
    });
  };

  const handleSavePersonaEdits = () => {
    if (!persona) return;
    onUpdatePersona({
      ...persona,
      name: personaName,
      tagline: personaTagline,
      personality: personaTraits,
    });
  };

  const handleAddObject = () => {
    const updated = [
      ...objects,
      {
        id: `obj-${Date.now()}`,
        name: 'New Custom Object',
        description: 'Object state or item description...',
        trigger_rule: 'CYOA trigger rule...',
      },
    ];
    setObjects(updated);
    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
  };

  const handleRemoveObject = (index: number) => {
    const updated = objects.filter((_, i) => i !== index);
    setObjects(updated);
    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
  };

  return (
    <aside className="w-80 h-full bg-[#0d0f17] border-l border-[#1f2430] flex flex-col z-20 contain-content overscroll-contain">
      {/* Header */}
      <div className="p-4 border-b border-[#1f2430] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Live Story Context</h3>
            <p className="text-[10px] text-slate-400">Mid-game building blocks & CYOA state</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#181d2a]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#1f2430] text-xs">
        <button
          onClick={() => setActiveTab('scenario')}
          className={`flex-1 py-2.5 font-semibold transition-colors border-b-2 ${
            activeTab === 'scenario'
              ? 'border-amber-400 text-amber-300 bg-[#141824]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Scenario
        </button>
        <button
          onClick={() => setActiveTab('objects')}
          className={`flex-1 py-2.5 font-semibold transition-colors border-b-2 ${
            activeTab === 'objects'
              ? 'border-amber-400 text-amber-300 bg-[#141824]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          CYOA ({objects.length})
        </button>
        <button
          onClick={() => setActiveTab('persona')}
          className={`flex-1 py-2.5 font-semibold transition-colors border-b-2 ${
            activeTab === 'persona'
              ? 'border-cyan-400 text-cyan-300 bg-[#141824]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Persona
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'scenario' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Narrator Directives
              </label>
              <textarea
                value={narrator}
                onChange={(e) => setNarrator(e.target.value)}
                onBlur={handleSaveScenarioEdits}
                className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Setting & Environmental Lore
              </label>
              <textarea
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                onBlur={handleSaveScenarioEdits}
                className="w-full h-24 rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Active Plot Hooks
              </label>
              <textarea
                value={plot}
                onChange={(e) => setPlot(e.target.value)}
                onBlur={handleSaveScenarioEdits}
                className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Writing Style & Perspective
              </label>
              <textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                onBlur={handleSaveScenarioEdits}
                className="w-full h-16 rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'objects' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Custom Objects & CYOA Items
              </span>
              <button
                onClick={handleAddObject}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 text-black text-[10px] font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>Add Object</span>
              </button>
            </div>

            {objects.map((obj, index) => (
              <div
                key={obj.id || index}
                className="p-3 rounded-xl bg-[#12151e] border border-[#262c3e] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={obj.name}
                    onChange={(e) => {
                      const updated = [...objects];
                      updated[index].name = e.target.value;
                      setObjects(updated);
                      onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                    }}
                    className="font-bold text-amber-300 bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => handleRemoveObject(index)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  value={obj.description}
                  onChange={(e) => {
                    const updated = [...objects];
                    updated[index].description = e.target.value;
                    setObjects(updated);
                    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                  }}
                  className="w-full h-14 rounded-lg bg-[#090a0f] border border-[#1f2430] p-2 text-[11px] text-slate-300 resize-none"
                />

                <input
                  type="text"
                  value={obj.trigger_rule || ''}
                  onChange={(e) => {
                    const updated = [...objects];
                    updated[index].trigger_rule = e.target.value;
                    setObjects(updated);
                    onUpdateWorldBuilding({ ...worldBuilding, objects: updated });
                  }}
                  placeholder="Trigger Rule (optional)"
                  className="w-full rounded-lg bg-[#090a0f] border border-[#1f2430] p-2 text-[11px] text-cyan-300"
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'persona' && persona && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Character Name
              </label>
              <input
                type="text"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                onBlur={handleSavePersonaEdits}
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Tagline / Title
              </label>
              <input
                type="text"
                value={personaTagline}
                onChange={(e) => setPersonaTagline(e.target.value)}
                onBlur={handleSavePersonaEdits}
                className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Personality & Traits
              </label>
              <textarea
                value={personaTraits}
                onChange={(e) => setPersonaTraits(e.target.value)}
                onBlur={handleSavePersonaEdits}
                className="w-full h-32 rounded-xl bg-[#12151e] border border-[#262c3e] p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
