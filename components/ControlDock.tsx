'use client';

import React from 'react';
import { Send, Play, RotateCcw, MessageSquare, Compass, Sparkles, User, Lightbulb, ChevronDown } from 'lucide-react';

export type InputMode = 'do' | 'say' | 'story_note' | 'continue';

interface ControlDockProps {
  userPersonaName?: string;
  availableSpeakers?: string[];
  selectedSpeaker: string;
  onSpeakerChange: (speaker: string) => void;
  onSend: (content: string, type: InputMode, speaker: string) => void;
  onContinue: (targetSpeaker?: string) => void;
  onUndo: () => void;
  onFetchSuggestions: () => Promise<string[]>;
  disabled?: boolean;
}

export function ControlDock({
  userPersonaName = 'You',
  availableSpeakers = [],
  selectedSpeaker,
  onSpeakerChange,
  onSend,
  onContinue,
  onUndo,
  onFetchSuggestions,
  disabled = false,
}: ControlDockProps) {
  const [mode, setMode] = React.useState<InputMode>('do');
  const [inputText, setInputText] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled) return;

    if (mode === 'continue') {
      onContinue(selectedSpeaker);
      return;
    }

    if (!inputText.trim()) return;
    onSend(inputText.trim(), mode, selectedSpeaker);
    setInputText('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestClick = async () => {
    setLoadingSuggestions(true);
    try {
      const fetched = await onFetchSuggestions();
      setSuggestions(fetched);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const primaryNPC = availableSpeakers.find((s) => s !== userPersonaName && s !== 'Narrator') || 'NPC';

  return (
    <div className="sticky bottom-0 bg-[#0d0f17] border-t border-[#1f2430] p-4 backdrop-blur-none z-10 contain-content">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Suggestion Pills (if generated) */}
        {suggestions.length > 0 && (
          <div className="p-3 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Suggested Action Choices for {userPersonaName}:</span>
              </div>
              <button
                onClick={() => setSuggestions([])}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(sug);
                    setMode('do');
                  }}
                  className="text-left p-2 rounded-lg bg-[#090a0f] border border-[#1f2430] text-xs text-slate-200 hover:border-amber-500/50 hover:text-white transition-colors"
                >
                  <span className="text-amber-400 font-bold mr-2">{idx + 1}.</span>
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Turn Control Dock Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Continue As Speaker Buttons */}
          <div className="flex items-center gap-1.5 bg-[#141824] p-1 rounded-xl border border-[#262c3e]">
            <button
              type="button"
              onClick={() => {
                onSpeakerChange(userPersonaName);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedSpeaker === userPersonaName
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Turn as ${userPersonaName}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>You ({userPersonaName})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSpeakerChange(primaryNPC);
                onContinue(primaryNPC);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedSpeaker === primaryNPC
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Direct response as ${primaryNPC}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>NPC ({primaryNPC})</span>
            </button>

            {/* Custom Speaker Dropdown */}
            <div className="relative flex items-center bg-[#090a0f] rounded-lg px-2 py-1 border border-[#262c3e]">
              <select
                value={selectedSpeaker}
                onChange={(e) => onSpeakerChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-4"
              >
                <option value={userPersonaName} className="bg-[#090a0f]">
                  You ({userPersonaName})
                </option>
                {availableSpeakers.map((spk) => (
                  <option key={spk} value={spk} className="bg-[#090a0f]">
                    {spk}
                  </option>
                ))}
                <option value="Narrator" className="bg-[#090a0f]">
                  Narrator
                </option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 pointer-events-none" />
            </div>
          </div>

          {/* Quick Buttons: Suggest Next Steps, Continue & Undo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSuggestClick}
              disabled={disabled || loadingSuggestions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              title="Generate 3 context-aware choice suggestions"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{loadingSuggestions ? 'Suggesting...' : 'Suggest Next Steps'}</span>
            </button>

            <button
              type="button"
              onClick={onUndo}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1f2538] text-slate-300 border border-[#262c3e] transition-colors disabled:opacity-50"
              title="Undo last turn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={() => onContinue(selectedSpeaker)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-md disabled:opacity-50"
              title="Tell AI to continue the story"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Continue</span>
            </button>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-xl border border-[#262c3e] w-fit text-xs">
          <button
            type="button"
            onClick={() => setMode('do')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === 'do' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Do (Action)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('say')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === 'say' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Say (Dialogue)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('story_note')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              mode === 'story_note' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Story Note</span>
          </button>
        </div>

        {/* Text Input Area */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'do'
                ? `Describe what ${userPersonaName} does... (e.g. *inspects the glowing pedestal*)`
                : mode === 'say'
                ? `Type what ${userPersonaName} says out loud...`
                : 'Provide guidance or narrative notes for the AI...'
            }
            disabled={disabled}
            className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-3.5 pr-14 text-sm text-[#e2e8f0] placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all resize-none"
          />
          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            className="absolute right-3 bottom-4 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-30 transition-all shadow-md"
            title="Send Input"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
