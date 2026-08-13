'use client';

import React from 'react';
import type { DreamXPost as DreamXPostType, DreamXProfile } from '@/lib/dreamx/types';
import { DreamXPost } from './DreamXPost';

interface DreamXFeedProps {
  posts: DreamXPostType[];
  profiles: DreamXProfile[];
  onReplyGenerated: () => void;
  apiKeys: any;
  selectedModel: string;
}

export function DreamXFeed({ posts, profiles, onReplyGenerated, apiKeys, selectedModel }: DreamXFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40 p-8 text-center border-x border-white/10">
        <div>
          <p className="text-xl mb-2">Welcome to DreamX</p>
          <p className="text-sm">Create a character and generate a post to start the timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto border-x border-white/10 bg-black/20">
      <div className="flex flex-col">
        {posts.map(post => {
          const author = profiles.find(p => p.id === post.profile_id);
          return (
            <DreamXPost
              key={post.id}
              post={post}
              author={author}
              profiles={profiles}
              onReplyGenerated={onReplyGenerated}
              apiKeys={apiKeys}
              selectedModel={selectedModel}
            />
          );
        })}
      </div>
    </div>
  );
}
