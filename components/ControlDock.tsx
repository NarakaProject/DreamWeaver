'use client';

import React from 'react';
import { Send, Play, RotateCcw, MessageSquare, Compass, Sparkles } from 'lucide-react';

export type InputMode = 'do' | 'say' | 'story_note' | 'continue';

interface ControlDockProps {
  onSend: (content: string, type: InputMode) => void;
  onContinue: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function ControlDock({ onSend, onContinue, onUndo, disabled = false }: ControlDockProps) {
  const [mode, setMode] = React.useState<InputMode>('do');
  const [inputText, setInputText] = React.useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled) return;

    if (mode === 'continue') {
      onContinue();
      return;
    }

    if (!inputText.trim()) return;
    onSend(inputText.trim(), mode);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 bg-[#0d0f17]/95 border-t border-[#1f2430] p-4 backdrop-blur-md z-10">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Quick Action Toolbar */}
        <div className="flex items-center justify-between text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-xl border border-[#262c3e]">
            <button
              type="button"
              onClick={() => setMode('do')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'do'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Do (Action)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('say')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'say'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Say (Dialogue)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('story_note')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'story_note'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Story Note</span>
            </button>
          </div>

          {/* Quick Buttons: Continue & Undo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={disabled}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1f2538] text-slate-300 border border-[#262c3e] transition-colors disabled:opacity-50"
              title="Undo last turn"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={onContinue}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all shadow-md disabled:opacity-50"
              title="Tell AI to continue the story naturally"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Continue</span>
            </button>
          </div>
        </div>

        {/* Text Input Area */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'do'
                ? 'Describe what your character does... (e.g. *inspects the glowing pedestal*)'
                : mode === 'say'
                ? 'Type what your character says out loud...'
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
