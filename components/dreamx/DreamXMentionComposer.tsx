'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DreamXProfile, DreamXUserProfile, VerificationType } from '@/lib/dreamx/types';
import { DreamXVerificationBadge } from './DreamXVerificationBadge';

interface MentionTarget {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  type: 'ai' | 'human';
  verification_type?: VerificationType;
}


interface DreamXMentionComposerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function DreamXMentionComposer({
  value,
  onChange,
  placeholder = "What's happening?",
  isTextArea = true,
  rows = 2,
  className = '',
  onKeyDown
}: DreamXMentionComposerProps) {
  const [targets, setTargets] = useState<MentionTarget[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionMatchIndex, setMentionMatchIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Fetch available profiles for autocomplete list
  useEffect(() => {
    async function loadProfiles() {
      try {
        const [profRes, userRes] = await Promise.all([
          fetch('/api/dreamx/profiles'),
          fetch('/api/dreamx/user')
        ]);
        const list: MentionTarget[] = [];

        if (profRes.ok) {
          const { profiles } = await profRes.json();
          if (Array.isArray(profiles)) {
            for (const p of profiles) {
              list.push({
                id: p.id,
                name: p.display_name,
                handle: p.handle,
                avatar: p.avatar_url,
                type: 'ai',
                verification_type: p.verification_type
              });
            }
          }
        }

        if (userRes.ok) {
          const { user } = await userRes.json();
          if (user) {
            list.push({
              id: user.id,
              name: user.display_name,
              handle: user.handle,
              avatar: user.avatar_url,
              type: 'human',
              verification_type: user.verification_type
            });
          }
        }


        setTargets(list);
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadProfiles();
  }, []);

  const filteredTargets = targets.filter(t => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    const cleanHandle = t.handle.toLowerCase().replace(/^@/, '');
    return t.name.toLowerCase().includes(q) || cleanHandle.includes(q);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = newVal.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      // Ensure @ is preceded by space, newline, or is at string start
      if (/[\s\n^]/.test(charBeforeAt) || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query);
          setMentionMatchIndex(lastAtIndex);
          setShowDropdown(true);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setShowDropdown(false);
  };

  const insertMention = (target: MentionTarget) => {
    if (mentionMatchIndex === -1) return;

    const cursorPos = inputRef.current?.selectionStart || value.length;
    const beforeAt = value.slice(0, mentionMatchIndex);
    const afterCursor = value.slice(cursorPos);
    
    // Ensure handle includes @ prefix
    const cleanHandle = target.handle.startsWith('@') ? target.handle : `@${target.handle}`;
    const newValue = `${beforeAt}${cleanHandle} ${afterCursor}`;

    onChange(newValue);
    setShowDropdown(false);

    // Refocus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = beforeAt.length + cleanHandle.length + 1;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (showDropdown && filteredTargets.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredTargets.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredTargets.length) % filteredTargets.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredTargets[selectedIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }

    onKeyDown?.(e);
  };

  return (
    <div className="relative w-full">
      {isTextArea ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          className={className}
        />
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && filteredTargets.length > 0 && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-72 bg-[#0f111a] border border-white/20 rounded-xl shadow-2xl overflow-hidden py-1">
          <div className="px-3 py-1.5 text-[11px] text-white/40 font-bold uppercase tracking-wider border-b border-white/10">
            Mention User
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredTargets.map((target, idx) => (
              <button
                key={target.id}
                type="button"
                onClick={() => insertMention(target)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                  idx === selectedIndex ? 'bg-blue-600/30 text-white' : 'hover:bg-white/5 text-white/80'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-white/10 overflow-hidden">
                  {target.avatar ? (
                    <img src={target.avatar} alt={target.name} className="w-full h-full object-cover" />
                  ) : (
                    target.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-white flex items-center gap-1.5">
                    <span>{target.name}</span>
                    <DreamXVerificationBadge type={target.verification_type} />
                    {target.type === 'human' && (
                      <span className="px-1 py-0.2 text-[9px] bg-blue-500/20 text-blue-400 rounded">You</span>
                    )}
                  </div>

                  <div className="text-[11px] text-white/40 truncate">{target.handle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
