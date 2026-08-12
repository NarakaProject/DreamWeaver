'use client';

import React from 'react';
import { Send, Play, RotateCcw, Lightbulb, ChevronDown, User, Sparkles } from 'lucide-react';

interface ControlDockProps {
  userPersonaName?: string;
  availableSpeakers?: string[];
  selectedSpeaker: string;
  onSpeakerChange: (speaker: string) => void;
  onSend: (content: string, speaker: string) => void;
  onContinue: (targetSpeaker?: string) => void;
  onUndo: () => void;
  onFetchSuggestions: () => Promise<string[]>;
  disabled?: boolean;
}

export function ControlDock({
  userPersonaName = 'Valerius',
  availableSpeakers = [],
  selectedSpeaker,
  onSpeakerChange,
  onSend,
  onContinue,
  onUndo,
  onFetchSuggestions,
  disabled = false,
}: ControlDockProps) {
  const [inputText, setInputText] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || !inputText.trim()) return;

    onSend(inputText.trim(), selectedSpeaker);
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

  return (
    <div className="sticky bottom-0 bg-[#0d0f17] border-t border-[#1f2430] p-3 backdrop-blur-none z-10 contain-content">
      <div className="max-w-7xl mx-auto w-full space-y-2.5">
        {/* Contextual Action Suggestions Dock */}
        {suggestions.length > 0 && (
          <div className="p-3 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Suggested Choices for {userPersonaName}:</span>
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
                  onClick={() => setInputText(sug)}
                  className="text-left p-2 rounded-lg bg-[#090a0f] border border-[#1f2430] text-xs text-slate-200 hover:border-amber-500/50 hover:text-white transition-colors"
                >
                  <span className="text-amber-400 font-bold mr-2">{idx + 1}.</span>
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Consolidated Single-Row Control Bar */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Left: Speaker Selector Dropdown */}
          <div className="relative flex items-center bg-[#141824] border border-[#262c3e] rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold mr-1">
              {selectedSpeaker === userPersonaName ? (
                <User className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="text-[11px] text-slate-400">Turn:</span>
            </div>
            <select
              value={selectedSpeaker}
              onChange={(e) => onSpeakerChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-5 max-w-[200px] truncate"
            >
              <option value={userPersonaName} className="bg-[#0d0f17]">
                You ({userPersonaName})
              </option>
              {availableSpeakers.map((spk) => (
                <option key={spk} value={spk} className="bg-[#0d0f17]">
                  {spk}
                </option>
              ))}
              <option value="Narrator" className="bg-[#0d0f17]">
                (narrative)
              </option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Center: Suggest Next Steps Button */}
          <button
            type="button"
            onClick={handleSuggestClick}
            disabled={disabled || loadingSuggestions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            title="Generate 3 context-aware action choices"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{loadingSuggestions ? 'Suggesting...' : 'Suggest Next Steps'}</span>
          </button>

          {/* Right: Undo & Continue Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1f2538] text-slate-300 border border-[#262c3e] text-xs font-semibold transition-colors disabled:opacity-50"
              title="Undo last turn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={() => onContinue(selectedSpeaker)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-md disabled:opacity-50"
              title="Tell AI to continue the story"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Continue</span>
            </button>
          </div>
        </div>

        {/* Single Unified Text Input Box */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type your action or dialogue... (use "quotes" for speech, *asterisks* for actions)`}
            disabled={disabled}
            className="w-full h-20 rounded-xl bg-[#12151e] border border-[#262c3e] p-3 pr-12 text-sm text-[#e2e8f0] placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all resize-none"
          />
          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-30 transition-all shadow-md"
            title="Send Input"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
