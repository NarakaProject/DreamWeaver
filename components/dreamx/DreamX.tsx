'use client';

import React, { useState, useEffect } from 'react';
import type { DreamXProfile, DreamXPost } from '@/lib/dreamx/types';
import { DreamXFeed } from './DreamXFeed';
import { DreamXCharacterManager } from './DreamXCharacterManager';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface DreamXProps {
  apiKeys: any;
  selectedModel: string;
}

export function DreamX({ apiKeys, selectedModel }: DreamXProps) {
  const [profiles, setProfiles] = useState<DreamXProfile[]>([]);
  const [posts, setPosts] = useState<DreamXPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Composer state
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [postContext, setPostContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = async () => {
    try {
      const [profRes, feedRes] = await Promise.all([
        fetch('/api/dreamx/profiles'),
        fetch('/api/dreamx/posts')
      ]);
      if (profRes.ok) {
        const { profiles } = await profRes.json();
        setProfiles(profiles || []);
        if (profiles.length > 0 && !selectedProfileId) {
          setSelectedProfileId(profiles[0].id);
        }
      }
      if (feedRes.ok) {
        const { feed } = await feedRes.json();
        setPosts(feed || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeneratePost = async () => {
    if (!selectedProfileId) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/dreamx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          profile_id: selectedProfileId,
          context: postContext,
          provider: 'gemini',
          model: selectedModel,
          keys: apiKeys
        })
      });
      if (res.ok) {
        setPostContext('');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#090a0f] relative overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0 bg-black/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h1 className="font-bold text-lg text-white tracking-tight">DreamX</h1>
        </div>
        <div className="text-sm text-white/40">Isolated Subsystem Network</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Feed Area */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Composer */}
          <div className="p-4 border-x border-b border-white/10 bg-black/20">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex-shrink-0" />
              <div className="flex-1">
                <select 
                  value={selectedProfileId}
                  onChange={e => setSelectedProfileId(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded px-3 py-2 text-white w-full mb-3"
                >
                  <option value="" disabled>Select a profile to post as...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.display_name} ({p.handle})</option>
                  ))}
                </select>
                
                <textarea 
                  value={postContext}
                  onChange={e => setPostContext(e.target.value)}
                  placeholder="What should this character post about? (Leave blank for random)"
                  className="w-full bg-transparent border-none text-white text-lg placeholder-white/30 resize-none focus:outline-none min-h-[80px]"
                />
                
                <div className="flex justify-end pt-2 border-t border-white/10 mt-2">
                  <button 
                    onClick={handleGeneratePost}
                    disabled={!selectedProfileId || isGenerating}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Generate Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DreamXFeed 
            posts={posts} 
            profiles={profiles} 
            onReplyGenerated={loadData}
            apiKeys={apiKeys}
            selectedModel={selectedModel}
          />
        </div>

        {/* Right Sidebar - Character Manager */}
        <DreamXCharacterManager 
          profiles={profiles} 
          onProfilesChanged={loadData} 
        />
      </div>
    </div>
  );
}
