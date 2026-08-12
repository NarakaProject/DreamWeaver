'use client';

import React from 'react';
import { FullScenario, PersonaTemplate } from '@/lib/scenarios/reader';
import { X, User, Play, Sparkles, Plus, Check } from 'lucide-react';

interface PreStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: FullScenario | null;
  onStartGame: (scenario: FullScenario, persona: PersonaTemplate) => void;
}

export function PreStartModal({ isOpen, onClose, scenario, onStartGame }: PreStartModalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = React.useState<string>('');
  const [isCustomMode, setIsCustomMode] = React.useState<boolean>(false);

  // Custom Persona state
  const [customName, setCustomName] = React.useState('');
  const [customTagline, setCustomTagline] = React.useState('');
  const [customPersonality, setCustomPersonality] = React.useState('');
  const [customFirstMessage, setCustomFirstMessage] = React.useState('');

  React.useEffect(() => {
    if (scenario && scenario.suggestedPersonas.length > 0) {
      setSelectedPersonaId(scenario.suggestedPersonas[0].id);
      setIsCustomMode(false);
    } else {
      setIsCustomMode(true);
    }
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
      const found = scenario.suggestedPersonas.find((p) => p.id === selectedPersonaId);
      if (!found) return;
      finalPersona = found;
    }

    onStartGame(scenario, finalPersona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto contain-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Pre-Start Setup</span>
            </div>
            <h2 className="text-xl font-bold text-white">{scenario.meta.title}</h2>
            <p className="text-xs text-slate-400">Choose or create your character persona to start</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Suggested Personas vs Custom */}
        <div className="flex items-center gap-2 border-b border-[#1f2430] pb-3">
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isCustomMode
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-[#181d2a] text-slate-400 hover:text-white border border-[#262c3e]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Suggested Personas ({scenario.suggestedPersonas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            {scenario.suggestedPersonas.map((persona) => {
              const isSelected = selectedPersonaId === persona.id;
              return (
                <div
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all space-y-2 relative ${
                    isSelected
                      ? 'bg-[#1e2538] border-amber-500/80 shadow-lg'
                      : 'bg-[#181d2a] border-[#262c3e] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">{persona.name}</h4>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-amber-500 text-black">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  {persona.tagline && (
                    <p className="text-xs text-amber-300 font-medium">{persona.tagline}</p>
                  )}
                  {persona.personality && (
                    <p className="text-xs text-slate-400 line-clamp-2">{persona.personality}</p>
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
                <label className="block text-xs font-semibold text-slate-300">Character Name *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Kaelen Vane"
                  className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Tagline / Title</label>
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
              <label className="block text-xs font-semibold text-slate-300">Personality & Traits</label>
              <textarea
                value={customPersonality}
                onChange={(e) => setCustomPersonality(e.target.value)}
                placeholder="Describe character behavior, tone, goals..."
                className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">First Opening Message</label>
              <textarea
                value={customFirstMessage}
                onChange={(e) => setCustomFirstMessage(e.target.value)}
                placeholder="Optional opening message for the story..."
                className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="flex justify-end gap-3 border-t border-[#1f2430] pt-4">
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
