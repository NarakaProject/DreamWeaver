'use client';

import React, { useState } from 'react';
import type { DreamXUserProfile } from '@/lib/dreamx/types';
import { Sparkles, UserCheck } from 'lucide-react';

interface DreamXOnboardingProps {
  onComplete: (user: DreamXUserProfile) => void;
}

export function DreamXOnboarding({ onComplete }: DreamXOnboardingProps) {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [interests, setInterests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !handle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dreamx/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          handle: handle.trim(),
          avatar_url: avatarUrl.trim(),
          bio: bio.trim(),
          personality: personality.trim(),
          interests: interests.trim(),
        })
      });

      if (res.ok) {
        const { user } = await res.json();
        onComplete(user);
      }
    } catch (err) {
      console.error('Failed to create DreamX user profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12151e] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Welcome to DreamX</h2>
              <p className="text-xs text-white/50">Create your independent human identity to enter the network</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Display Name *</label>
            <input 
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Vance"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">@handle *</label>
            <input 
              required
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="e.g. @alexvance"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Avatar URL (Optional)</label>
            <input 
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Bio</label>
            <textarea 
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
              placeholder="Tell the network who you are..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1">Interests</label>
            <input 
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder="e.g. Tech, Sci-Fi, Coffee, Writing"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim() || !handle.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              <UserCheck className="w-5 h-5" />
              Enter Social Network
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
