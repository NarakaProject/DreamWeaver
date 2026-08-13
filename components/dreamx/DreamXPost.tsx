'use client';

import React, { useState } from 'react';
import { MessageSquare, Heart, Repeat2, Share, Loader2 } from 'lucide-react';
import type { DreamXPost as DreamXPostType, DreamXProfile } from '@/lib/dreamx/types';

interface DreamXPostProps {
  post: DreamXPostType;
  author?: DreamXProfile;
  profiles: DreamXProfile[]; // All available profiles to select for reply
  onReplyGenerated?: () => void;
  apiKeys: any;
  selectedModel: string;
}

export function DreamXPost({ post, author, profiles, onReplyGenerated, apiKeys, selectedModel }: DreamXPostProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const handleGenerateReply = async () => {
    if (!selectedProfileId) return;
    setIsReplying(true);
    try {
      const res = await fetch('/api/dreamx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          profile_id: selectedProfileId,
          target_post_id: post.id,
          provider: 'gemini', // defaulting to gemini, could be selected from UI
          model: selectedModel,
          keys: apiKeys
        })
      });
      if (res.ok) {
        onReplyGenerated?.();
      } else {
        console.error('Failed to generate reply');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="border-b border-white/10 p-4 hover:bg-white/5 transition-colors group">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white/50 text-xl">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
          ) : (
            author?.display_name?.charAt(0) || '?'
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-white truncate">{author?.display_name || 'Unknown'}</span>
            <span className="text-white/50 truncate">{author?.handle || '@unknown'}</span>
            <span className="text-white/50">·</span>
            <span className="text-white/50 whitespace-nowrap">{timeAgo(post.created_at)}</span>
          </div>
          
          <p className="text-white/90 whitespace-pre-wrap break-words leading-relaxed mb-3">
            {post.content}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between text-white/40 max-w-md">
            <button className="flex items-center gap-2 hover:text-blue-400 transition-colors group-hover:text-white/60">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">0</span>
            </button>
            <button className="flex items-center gap-2 hover:text-green-400 transition-colors group-hover:text-white/60">
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{post.reposts_count}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-pink-500 transition-colors group-hover:text-white/60">
              <Heart className="w-4 h-4" />
              <span className="text-sm">{post.likes_count}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-400 transition-colors group-hover:text-white/60">
              <Share className="w-4 h-4" />
            </button>
          </div>

          {/* Quick AI Reply tool (only visible on hover/focus) */}
          <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white/80 flex-1 max-w-[200px]"
            >
              <option value="">Select profile to reply...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.display_name} ({p.handle})</option>
              ))}
            </select>
            <button
              onClick={handleGenerateReply}
              disabled={!selectedProfileId || isReplying}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              AI Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
