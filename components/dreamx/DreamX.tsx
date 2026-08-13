'use client';

import React, { useState, useEffect } from 'react';
import type { DreamXProfile, DreamXPost, DreamXUserProfile } from '@/lib/dreamx/types';
import { DreamXFeed } from './DreamXFeed';
import { DreamXCharacterManager } from './DreamXCharacterManager';
import { DreamXOnboarding } from './DreamXOnboarding';
import { DreamXThreadModal } from './DreamXThreadModal';
import { Sparkles, Send, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface DreamXProps {
  apiKeys: any;
  selectedModel: string;
}

export function DreamX({ apiKeys, selectedModel }: DreamXProps) {
  const [humanUser, setHumanUser] = useState<DreamXUserProfile | null>(null);
  const [profiles, setProfiles] = useState<DreamXProfile[]>([]);
  const [posts, setPosts] = useState<DreamXPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Composer state (Human User ONLY)
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Thread Modal state
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [userRes, profRes, feedRes] = await Promise.all([
        fetch('/api/dreamx/user'),
        fetch('/api/dreamx/profiles'),
        fetch('/api/dreamx/posts')
      ]);

      if (userRes.ok) {
        const { user } = await userRes.json();
        setHumanUser(user || null);
      }

      if (profRes.ok) {
        const { profiles } = await profRes.json();
        setProfiles(profiles || []);
      }

      if (feedRes.ok) {
        const { feed } = await feedRes.json();
        setPosts(feed || []);
      }
    } catch (err) {
      console.error('Failed to load DreamX data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger background autonomous simulation (respects 60s atomic cooldown)
  const triggerSimulation = async () => {
    try {
      await fetch('/api/dreamx/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          model: selectedModel,
          keys: apiKeys
        })
      });
    } catch (err) {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadData().then(() => {
      triggerSimulation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateHumanPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const res = await fetch('/api/dreamx/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent.trim()
        })
      });

      if (res.ok) {
        setPostContent('');
        await loadData();
      }
    } catch (err) {
      console.error('Failed to post as human user:', err);
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // 1. First-Run Onboarding Gate
  if (!humanUser) {
    return <DreamXOnboarding onComplete={(user) => { setHumanUser(user); loadData(); }} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#090a0f] relative overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0 bg-black/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h1 className="font-bold text-lg text-white tracking-tight">DreamX</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-white/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Signed in as <strong className="text-white">{humanUser.display_name}</strong> ({humanUser.handle})
          </div>
          <Link href="/dreamx/control" className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1.5" title="Dev Control Panel">
            <ShieldAlert className="w-3.5 h-3.5" />
            Control Panel
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Timeline Area */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Human User Post Composer (No AI Character Selector!) */}
          <div className="p-4 border-x border-b border-white/10 bg-black/20">
            <form onSubmit={handleCreateHumanPost} className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-500/30 flex-shrink-0 flex items-center justify-center font-bold text-blue-400 text-lg">
                {humanUser.avatar_url ? <img src={humanUser.avatar_url} alt={humanUser.display_name} className="w-full h-full rounded-full object-cover" /> : humanUser.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <textarea 
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="What's happening?"
                  rows={2}
                  className="w-full bg-transparent border-none text-white text-base placeholder-white/30 resize-none focus:outline-none"
                />
                <div className="flex justify-end pt-2 border-t border-white/10 mt-2">
                  <button 
                    type="submit"
                    disabled={!postContent.trim() || isPosting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-full transition-all text-sm flex items-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post
                  </button>
                </div>
              </div>
            </form>
          </div>

          <DreamXFeed 
            posts={posts} 
            onOpenThread={(threadId) => setActiveThreadId(threadId)}
            onFeedChanged={loadData}
          />
        </div>

        {/* Right Sidebar - AI Persona Manager */}
        <DreamXCharacterManager 
          profiles={profiles} 
          onProfilesChanged={loadData} 
        />
      </div>

      {/* Dedicated Thread Modal */}
      {activeThreadId && (
        <DreamXThreadModal 
          threadId={activeThreadId}
          onClose={() => setActiveThreadId(null)}
          onPostCreated={loadData}
        />
      )}
    </div>
  );
}
