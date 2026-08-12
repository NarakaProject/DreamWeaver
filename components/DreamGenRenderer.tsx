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
  knownNPCs?: string[];
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

/**
 * Resolves raw or shortened AI speaker names to their full canonical name.
 * E.g., "Aria" -> "Aria Shadowstep", "Ignis" -> "Ignis Emberheart".
 */
export function getCanonicalSpeakerName(
  speaker: string,
  userPersonaName: string = 'Valerius',
  knownNPCs: string[] = []
): string {
  if (!speaker) return 'Narrator';
  const clean = speaker.trim();
  if (clean.toLowerCase() === 'narrator') return 'Narrator';

  if (clean.toLowerCase() === userPersonaName.toLowerCase()) {
    return userPersonaName;
  }

  const matchedNPC = knownNPCs.find(
    (npc) =>
      npc.toLowerCase() === clean.toLowerCase() ||
      npc.toLowerCase().startsWith(clean.toLowerCase())
  );
  if (matchedNPC) return matchedNPC;

  if (userPersonaName.toLowerCase().startsWith(clean.toLowerCase())) {
    return userPersonaName;
  }

  return clean;
}

export const DreamGenRenderer = React.memo(function DreamGenRenderer({
  content,
  role,
  type,
  speaker,
  userPersonaName = 'Valerius',
  knownNPCs = [],
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

  // Determine speaker classification & canonical full name
  const isUserTurn = role === 'user';
  const rawSpeaker = speaker || (isUserTurn ? userPersonaName : 'Narrator');
  const canonicalSpeaker = getCanonicalSpeakerName(rawSpeaker, userPersonaName, knownNPCs);

  const isNarrator = canonicalSpeaker.toLowerCase() === 'narrator';
  const isUserSpeaker = isUserTurn || canonicalSpeaker.toLowerCase() === userPersonaName.toLowerCase();

  return (
    <div className="group relative my-6 max-w-5xl mx-auto w-full rounded-xl bg-[#12151e] border border-[#1f2430] p-7 sm:p-8 shadow-md transition-colors hover:border-[#2a3142] contain-content space-y-4">
      {/* Identity Attribution Header */}
      <div className="flex items-center justify-between text-xs border-b border-[#1f2430] pb-2.5">
        <div className="flex items-center gap-2">
          {isUserSpeaker ? (
            <div className="flex items-center gap-1.5 font-bold text-[#38bdf8]">
              <User className="w-3.5 h-3.5" />
              <span>{canonicalSpeaker}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                PLAYER
              </span>
            </div>
          ) : isNarrator ? (
            <span className="text-slate-500 font-mono italic text-[11px]">
              (narrative)
            </span>
          ) : (
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{canonicalSpeaker}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                NPC
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
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
              title="Edit turn"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy text"
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

      {/* Editing State vs Full Story Block */}
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
        <div className="dreamgen-prose whitespace-pre-wrap pt-1 text-left">
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
