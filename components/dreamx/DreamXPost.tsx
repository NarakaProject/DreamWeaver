'use client';

import React, { useState } from 'react';
import { MessageSquare, Heart, Repeat2, Share } from 'lucide-react';
import type { DreamXPost as DreamXPostType } from '@/lib/dreamx/types';
import Link from 'next/link';
import { DreamXPostContent } from './DreamXPostContent';
import { DreamXVerificationBadge } from './DreamXVerificationBadge';

interface DreamXPostProps {
  post: DreamXPostType;
  onSelectReplyTarget?: (id: string, handle: string) => void;
  onInteraction?: () => void;
  isThreadView?: boolean;
  hideReplies?: boolean;
  depth?: number;
}

export function DreamXPost({ 
  post, 
  onSelectReplyTarget, 
  onInteraction, 
  isThreadView = false,
  hideReplies = false,
  depth = 0
}: DreamXPostProps) {

  const [liked, setLiked] = useState(post.user_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [reposted, setReposted] = useState(post.user_reposted || false);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0);

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await fetch('/api/dreamx/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', post_id: post.id })
      });
      if (res.ok) {
        const data = await res.json();
        setLikesCount(data.count);
        setLiked(data.liked);
        onInteraction?.();
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleToggleRepost = async () => {
    const nextReposted = !reposted;
    setReposted(nextReposted);
    setRepostsCount(prev => nextReposted ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await fetch('/api/dreamx/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'repost', post_id: post.id })
      });
      if (res.ok) {
        const data = await res.json();
        setRepostsCount(data.count);
        setReposted(data.reposted);
        onInteraction?.();
      }
    } catch (err) {
      console.error('Failed to toggle repost:', err);
    }
  };

  const handleReplyClick = () => {
    if (onSelectReplyTarget) {
      onSelectReplyTarget(post.id, post.author_handle || '@user');
    }
  };

  const cleanHandle = post.author_handle ? post.author_handle.replace(/^@/, '') : 'user';
  const profileHref = post.author_type === 'ai' 
    ? `/dreamx/profile/${encodeURIComponent(cleanHandle)}`
    : `/dreamx/profile/${encodeURIComponent(cleanHandle)}`;

  // In Feed View, limit inline replies to top 1 preview to keep main feed clean and compact
  const repliesToRender = !isThreadView && post.replies && post.replies.length > 1
    ? post.replies.slice(0, 1)
    : post.replies;

  return (
    <div className="border-b border-white/10 p-4 hover:bg-white/5 transition-colors group">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={profileHref} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center font-bold text-white/50 text-base border border-white/10">
            {post.author_avatar ? (
              <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
            ) : (
              post.author_name?.charAt(0) || '?'
            )}
          </div>
        </Link>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link href={profileHref} className="font-bold text-white hover:underline truncate inline-flex items-center gap-1">
              <span>{post.author_name || 'Unknown'}</span>
              <DreamXVerificationBadge type={post.author_verification} />
            </Link>

            {post.author_type === 'human' && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 font-bold rounded uppercase tracking-wider">
                You
              </span>
            )}

            <Link href={profileHref} className="text-white/40 text-xs hover:underline truncate">
              {post.author_handle || '@unknown'}
            </Link>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-white/40 text-xs whitespace-nowrap">{timeAgo(post.created_at)}</span>
          </div>

          <p className="text-white/90 whitespace-pre-wrap break-words leading-relaxed mb-3 text-sm">
            <DreamXPostContent content={post.content} />
          </p>

          {/* Social Interaction Bar */}
          <div className="flex items-center gap-8 text-white/40 pt-1">
            <button 
              onClick={handleReplyClick}
              className="flex items-center gap-2 hover:text-blue-400 transition-colors text-xs"
              title="Reply"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{post.reply_count || (post.replies ? post.replies.length : 0)}</span>
            </button>

            <button 
              onClick={handleToggleRepost}
              className={`flex items-center gap-2 transition-colors text-xs ${
                reposted ? 'text-green-400 font-bold' : 'hover:text-green-400'
              }`}
              title="Repost"
            >
              <Repeat2 className="w-4 h-4" />
              <span>{repostsCount}</span>
            </button>

            <button 
              onClick={handleToggleLike}
              className={`flex items-center gap-2 transition-colors text-xs ${
                liked ? 'text-pink-500 font-bold' : 'hover:text-pink-500'
              }`}
              title="Like"
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <button className="flex items-center gap-2 hover:text-blue-400 transition-colors text-xs" title="Share">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Capped Visual Indentation Reply Tree (Max offset capped at depth 2) */}
      {!hideReplies && repliesToRender && repliesToRender.length > 0 && (
        <div className={`mt-3 space-y-2 ${
          depth === 0 ? 'pl-3 border-l border-white/10' : 'pl-3.5 border-l border-blue-500/20'
        }`}>
          {repliesToRender.map(child => (
            <DreamXPost 
              key={child.id} 
              post={child} 
              onSelectReplyTarget={onSelectReplyTarget}
              onInteraction={onInteraction}
              isThreadView={isThreadView}
              depth={Math.min(depth + 1, 2)}
            />
          ))}

          {!isThreadView && post.replies && post.replies.length > 1 && (
            <button
              onClick={handleReplyClick}
              className="text-xs text-blue-400 font-bold hover:underline py-1 pl-2 flex items-center gap-1.5"
            >
              View full conversation ({post.replies.length} replies) →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
