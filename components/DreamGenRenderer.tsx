'use client';

import React from 'react';
import { parseDreamGenText } from '@/lib/parser/dreamgen';
import { Copy, RefreshCw, Trash2, Edit2, Check } from 'lucide-react';

interface DreamGenRendererProps {
  content: string;
  role: 'user' | 'model' | 'system';
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

export const DreamGenRenderer = React.memo(function DreamGenRenderer({
  content,
  role,
  type,
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

  if (role === 'user') {
    return (
      <div className="group relative my-4 flex justify-end contain-content">
        <div className="max-w-2xl rounded-2xl bg-[#192233] border border-[#2d384e] p-4 text-[#e2e8f0] shadow-md">
          <div className="flex items-center justify-between text-xs font-semibold text-[#38bdf8] mb-1.5 uppercase tracking-wider">
            <span>{type ? `User [${type.toUpperCase()}]` : 'User Action'}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 hover:text-white transition-colors"
                title="Copy input"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1 hover:text-red-400 transition-colors"
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
    <div className="group relative my-6 max-w-3xl mx-auto rounded-xl bg-[#12151e] border border-[#1f2430] p-6 shadow-md transition-colors hover:border-[#2a3142] contain-content">
      {/* Narrative Output Controls */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#191d29] px-2.5 py-1 rounded-lg border border-[#262c3e] z-10">
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

      {isEditing ? (
        <div className="space-y-3">
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
        <div className="dreamgen-prose whitespace-pre-wrap">
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

            // Prose / Action token: Soft Purple & Italic by default
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
