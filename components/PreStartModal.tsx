'use client';

import React from 'react';
import { FullScenario, PersonaTemplate } from '@/lib/scenarios/reader';
import { X, User, Play, Sparkles, Plus, Check, Edit3, Save } from 'lucide-react';
import { ImagePickerWithPreview } from './ImagePickerWithPreview';

interface PreStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: FullScenario | null;
  onStartGame: (scenario: FullScenario, persona: PersonaTemplate) => void;
}

export function PreStartModal({ isOpen, onClose, scenario, onStartGame }: PreStartModalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = React.useState<string>('');
  const [isCustomMode, setIsCustomMode] = React.useState<boolean>(false);
  const [personasCopy, setPersonasCopy] = React.useState<PersonaTemplate[]>([]);
  const [editingPersonaId, setEditingPersonaId] = React.useState<string | null>(null);

  // Custom Persona state
  const [customName, setCustomName] = React.useState('');
  const [customTagline, setCustomTagline] = React.useState('');
  const [customPersonality, setCustomPersonality] = React.useState('');
  const [customFirstMessage, setCustomFirstMessage] = React.useState('');

  React.useEffect(() => {
    if (scenario && scenario.suggestedPersonas.length > 0) {
      setPersonasCopy(scenario.suggestedPersonas);
      setSelectedPersonaId(scenario.suggestedPersonas[0].id);
      setIsCustomMode(false);
    } else {
      setPersonasCopy([]);
      setIsCustomMode(true);
    }
    setEditingPersonaId(null);
  }, [scenario]);

  if (!isOpen || !scenario) return null;

  const handleStart = () => {
    let finalPersona: PersonaTemplate;

    if (isCustomMode) {
      if (!customName.trim()) return;
      finalPersona = {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        tagline: customTagline.trim() || 'Custom Player Character',
        personality: customPersonality.trim() || 'Adaptable and observant player character.',
        firstMessage:
          customFirstMessage.trim() || `*${customName.trim()} steps into the story scenario.*`,
      };
    } else {
      const found = personasCopy.find((p) => p.id === selectedPersonaId);
      if (!found) return;
      finalPersona = found;
    }

    onStartGame(scenario, finalPersona);
    onClose();
  };

  const updatePersonaField = (id: string, field: keyof PersonaTemplate, value: string) => {
    setPersonasCopy((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const coverUrl = scenario.meta.coverImage || scenario.worldBuilding.images?.coverImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 contain-content">
      <div className="w-full max-w-3xl rounded-2xl bg-[#12151e] border border-[#262c3e] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative">
        {/* Cover Art Banner Header */}
        <div className="relative h-40 sm:h-48 w-full bg-[#090a0f] overflow-hidden shrink-0 border-b border-[#1f2430]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={scenario.meta.title}
              className="w-full h-full object-cover object-center brightness-90"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-950 via-[#12151e] to-amber-950 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12151e] via-[#12151e]/50 to-transparent" />

          {/* Top Floating Close Button & Category Badge */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-none border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider">
              {scenario.meta.category || 'Roleplay Scenario'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scenario Title Overlay */}
          <div className="absolute bottom-4 left-6 right-6 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Pre-Start Setup</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
              {scenario.meta.title}
            </h2>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* World Description & Subtitle */}
          <div className="space-y-2 border-b border-[#1f2430] pb-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {scenario.meta.description}
            </p>
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Choose or customize your character persona to start</span>
            </p>
          </div>

          {/* Mode Switcher: Suggested Personas vs Custom */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                !isCustomMode
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#181d2a] text-slate-400 hover:text-white border border-[#262c3e]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Suggested Personas ({personasCopy.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isCustomMode
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#181d2a] text-slate-400 hover:text-white border border-[#262c3e]'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Custom Persona</span>
            </button>
          </div>

          {/* Suggested Personas Grid */}
          {!isCustomMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personasCopy.map((persona) => {
                const isSelected = selectedPersonaId === persona.id;
                const isEditing = editingPersonaId === persona.id;

                return (
                  <div
                    key={persona.id}
                    className={`p-4 rounded-xl border transition-all relative flex flex-col gap-3 ${
                      isSelected
                        ? 'bg-[#1e2538] border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                        : 'bg-[#181d2a] border-[#262c3e] hover:border-slate-500'
                    }`}
                  >
                    {/* Card Header & Radio Trigger */}
                    <div
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className="cursor-pointer flex items-start gap-3.5"
                    >
                      {/* Persona Avatar Portrait */}
                      {persona.avatar ? (
                        <img
                          src={persona.avatar}
                          alt={persona.name}
                          className="w-12 h-12 rounded-full object-cover border border-amber-500/40 shrink-0 mt-0.5"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-base shrink-0 mt-0.5">
                          {persona.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Persona Summary */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white truncate">{persona.name}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPersonaId(isEditing ? null : persona.id);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-[#12151e] transition-colors"
                              title="Edit persona details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-amber-500 text-black">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                        {persona.tagline && (
                          <p className="text-xs text-amber-300 font-medium truncate">
                            {persona.tagline}
                          </p>
                        )}
                        {!isEditing && persona.personality && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {persona.personality}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inline Edit Drawer */}
                    {isEditing && (
                      <div className="pt-3 border-t border-[#262c3e] space-y-3 text-xs animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Name</label>
                          <input
                            type="text"
                            value={persona.name}
                            onChange={(e) => updatePersonaField(persona.id, 'name', e.target.value)}
                            className="w-full rounded-lg bg-[#090a0f] border border-[#262c3e] p-2 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Tagline / Class</label>
                          <input
                            type="text"
                            value={persona.tagline || ''}
                            onChange={(e) => updatePersonaField(persona.id, 'tagline', e.target.value)}
                            className="w-full rounded-lg bg-[#090a0f] border border-[#262c3e] p-2 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">Personality & Backstory</label>
                          <textarea
                            value={persona.personality}
                            onChange={(e) => updatePersonaField(persona.id, 'personality', e.target.value)}
                            className="w-full h-20 rounded-lg bg-[#090a0f] border border-[#262c3e] p-2 text-xs text-white resize-none"
                          />
                        </div>

                        <ImagePickerWithPreview
                          label="Avatar Portrait"
                          value={persona.avatar || ''}
                          assetType="avatar"
                          contextHint={`${persona.name} ${persona.tagline || ''}`}
                          onChange={(url) => updatePersonaField(persona.id, 'avatar', url)}
                        />

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPersonaId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold"
                          >
                            <Save className="w-3 h-3" />
                            <span>Done Editing</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Custom Persona Builder Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Character Name *
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Kaelen Vane"
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tagline / Title
                  </label>
                  <input
                    type="text"
                    value={customTagline}
                    onChange={(e) => setCustomTagline(e.target.value)}
                    placeholder="e.g. Rogue Arcanist"
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Personality & Traits
                </label>
                <textarea
                  value={customPersonality}
                  onChange={(e) => setCustomPersonality(e.target.value)}
                  placeholder="Describe character behavior, tone, goals..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  First Opening Message
                </label>
                <textarea
                  value={customFirstMessage}
                  onChange={(e) => setCustomFirstMessage(e.target.value)}
                  placeholder="Optional opening message for the story..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1f2430] bg-[#0d0f17] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!isCustomMode && !selectedPersonaId}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Start Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
