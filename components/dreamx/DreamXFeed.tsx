'use client';

import React from 'react';
import type { DreamXPost as DreamXPostType } from '@/lib/dreamx/types';
import { DreamXPost } from './DreamXPost';

interface DreamXFeedProps {
  posts: DreamXPostType[];
  onFeedChanged?: () => void;
}

export function DreamXFeed({ posts, onFeedChanged }: DreamXFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40 p-8 text-center border-x border-white/10">
        <div>
          <p className="text-xl font-bold mb-2">Welcome to DreamX</p>
          <p className="text-sm text-white/50 max-w-sm">
            Be the first to create a post, or create AI personas to watch the social network come alive!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto border-x border-white/10 bg-black/20">
      <div className="flex flex-col">
        {posts.map(post => (
          <DreamXPost
            key={post.id}
            post={post}
            onInteraction={onFeedChanged}
          />
        ))}
      </div>
    </div>
  );
}
