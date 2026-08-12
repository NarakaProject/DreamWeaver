'use client';

import React from 'react';
import { parseDreamGenText, extractCyoaOptions, CyoaOption } from '@/lib/parser/dreamgen';
import { Copy, RefreshCw, Trash2, Edit2, Check, User, Sparkles, Compass } from 'lucide-react';

interface DreamGenRendererProps {
  content: string;
  role: 'user' | 'model' | 'system';
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  speaker?: string;
  userPersonaName?: string;
  userAvatar?: string;
  knownNPCs?: string[];
  npcAvatars?: Record<string, string>;
  isStreaming?: boolean;
  isFirstMessage?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onSelectCyoaOption?: (optionText: string) => void;
}

/**
 * Resolves raw or shortened AI speaker names to their full canonical name.
 */
export function getCanonicalSpeakerName(
  speaker: string,
  userPersonaName: string = 'Valerius',
  knownNPCs: string[] = []
): string {
  if (!speaker) return 'Narrator';
  const clean = speaker.trim();
  if (clean.toLowerCase() === 'narrator') return 'Narrator';

  // Filter raw prompt placeholders
  const isPlaceholder =
    clean.toLowerCase() === 'npc_name' ||
    clean.toLowerCase() === 'npc_name_or_description' ||
    clean.toLowerCase() === 'summoned' ||
    clean.toLowerCase() === '{{user}}' ||
    clean.toLowerCase() === 'model';

  if (isPlaceholder) {
    const validNPC = knownNPCs.find(
      (n) =>
        n.toLowerCase() !== 'npc_name' &&
        n.toLowerCase() !== 'npc_name_or_description' &&
        n.toLowerCase() !== 'summoned' &&
        n.toLowerCase() !== '{{user}}' &&
        n.toLowerCase() !== userPersonaName.toLowerCase()
    );
    if (validNPC) return validNPC;
    return 'Narrator';
  }

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
  userAvatar,
  knownNPCs = [],
  npcAvatars = {},
  isStreaming = false,
  isFirstMessage = false,
  onRegenerate,
  onEdit,
  onDelete,
  onSelectCyoaOption,
}: DreamGenRendererProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(content);

  // Extract clean narrative text & interactive CYOA option choices
  const { cleanText, options: cyoaOptions } = React.useMemo(
    () => extractCyoaOptions(content),
    [content]
  );

  const tokens = React.useMemo(() => parseDreamGenText(cleanText), [cleanText]);

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
  const avatarUrl = isUserSpeaker ? userAvatar : npcAvatars[canonicalSpeaker];

  return (
    <div className="group relative my-6 max-w-7xl mx-auto w-full rounded-xl bg-[#12151e] border border-[#1f2430] p-7 sm:p-8 shadow-md transition-colors hover:border-[#2a3142] contain-content space-y-4">
      {/* Identity Attribution Header with Avatar Support */}
      <div className="flex items-center justify-between text-xs border-b border-[#1f2430] pb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar Image / Fallback Badge */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={canonicalSpeaker}
              className="w-7 h-7 rounded-full object-cover border border-[#2a3142] shrink-0"
              onError={(e) => {
                // hide broken avatar gracefully
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}

          {isUserSpeaker ? (
            <div className="flex items-center gap-1.5 font-bold text-[#38bdf8]">
              {!avatarUrl && <User className="w-4 h-4" />}
              <span className="text-sm tracking-wide">{canonicalSpeaker}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase font-mono">
                PLAYER
              </span>
            </div>
          ) : isNarrator ? (
            <span className="text-slate-500 font-mono italic text-xs">
              (narrative)
            </span>
          ) : (
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              {!avatarUrl && <Sparkles className="w-4 h-4 text-amber-400" />}
              <span className="text-sm tracking-wide">{canonicalSpeaker}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-mono">
                NPC
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRegenerate && !isStreaming && !isFirstMessage && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              title="Retry / Regenerate narrative response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
          {onEdit && !isStreaming && !isFirstMessage && (
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
          {onDelete && !isStreaming && !isFirstMessage && (
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

      {/* Interactive Extracted CYOA Option Pills */}
      {!isEditing && cyoaOptions.length > 0 && (
        <div className="pt-3 border-t border-[#1f2430]/70 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Choose The Next Step</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {cyoaOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectCyoaOption && onSelectCyoaOption(opt.content)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181d2a] hover:bg-[#202738] border border-[#2a3142] hover:border-cyan-500/50 text-xs font-semibold text-cyan-200 hover:text-white transition-all shadow-sm active:scale-95 text-left"
              >
                <span className="font-bold text-cyan-400">{opt.label}:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {opt.content !== opt.label ? opt.content : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
