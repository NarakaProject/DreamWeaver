'use client';

import React from 'react';
import { parseDreamGenText } from '@/lib/parser/dreamgen';
import { Copy, RefreshCw, Trash2, Edit2, Check, User, Sparkles } from 'lucide-react';

interface DreamGenRendererProps {
  content: string;
  role: 'user' | 'model' | 'system';
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  speaker?: string;
  userPersonaName?: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

export const DreamGenRenderer = React.memo(function DreamGenRenderer({
  content,
  role,
  type,
  speaker,
  userPersonaName = 'Player Persona',
  isStreaming = false,
  onRegenerate,
  onEdit,
  onDelete,
}: DreamGenRendererProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(content);

  const tokens = React.useMemo(() => parseDreamGenText(content), [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== content) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  // Determine attribution header display
  const displayName =
    role === 'user'
      ? speaker || userPersonaName
      : speaker && speaker.toLowerCase() !== 'narrator'
      ? speaker
      : '(narrative)';

  const isNarrator = role === 'model' && (!speaker || speaker.toLowerCase() === 'narrator');

  if (role === 'user') {
    return (
      <div className="group relative my-4 flex justify-end contain-content">
        <div className="max-w-2xl rounded-2xl bg-[#192233] border border-[#2d384e] p-4 text-[#e2e8f0] shadow-md space-y-2">
          {/* User Persona Attribution Header */}
          <div className="flex items-center justify-between text-xs font-semibold pb-1 border-b border-[#2a364d]">
            <div className="flex items-center gap-1.5 text-[#38bdf8]">
              <User className="w-3.5 h-3.5" />
              <span>{displayName}</span>
              {type && (
                <span className="ml-1 text-[10px] text-slate-400 font-mono">
                  [{type.toUpperCase()}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Copy input"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="text-base leading-relaxed">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative my-6 max-w-3xl mx-auto rounded-xl bg-[#12151e] border border-[#1f2430] p-6 shadow-md transition-colors hover:border-[#2a3142] contain-content space-y-3">
      {/* Attribution Header (NPC / Narrator) */}
      <div className="flex items-center justify-between text-xs border-b border-[#1f2430] pb-2">
        <div className="flex items-center gap-2">
          {isNarrator ? (
            <span className="text-slate-500 font-mono italic text-[11px]">
              (narrative)
            </span>
          ) : (
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{displayName}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                NPC
              </span>
            </div>
          )}
        </div>

        {/* Narrative Output Controls */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRegenerate && !isStreaming && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              title="Retry / Regenerate narrative response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
          {onEdit && !isStreaming && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Edit story turn"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy full text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onDelete && !isStreaming && (
            <button
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete turn"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 pt-1">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-32 rounded-lg bg-[#090a0f] border border-[#262c3e] p-3 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#fbbf24]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-black"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="dreamgen-prose whitespace-pre-wrap pt-1">
          {tokens.map((token) => {
            if (token.type === 'dialogue') {
              return (
                <span key={token.id} className="dreamgen-dialogue not-italic text-[#fbbf24]">
                  "
                  {token.spans.map((span, sIdx) => (
                    <span
                      key={sIdx}
                      className={`${span.isBold ? 'font-bold' : ''} ${
                        span.isItalic ? 'italic' : ''
                      }`}
                    >
                      {span.text}
                    </span>
                  ))}
                  "
                </span>
              );
            }

            return (
              <span key={token.id} className="dreamgen-prose italic text-[#c084fc]">
                {token.spans.map((span, sIdx) => (
                  <span
                    key={sIdx}
                    className={`${span.isBold ? 'font-bold' : ''} ${
                      span.isItalic ? 'italic' : ''
                    }`}
                  >
                    {span.text}
                  </span>
                ))}
              </span>
            );
          })}
          {isStreaming && (
            <span className="inline-block w-2.5 h-4 ml-1 bg-amber-400 animate-pulse-glow rounded-xs align-middle" />
          )}
        </div>
      )}
    </div>
  );
});
