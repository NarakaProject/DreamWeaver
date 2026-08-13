'use client';

import React, { useState, useEffect, use } from 'react';
import type { DreamXProfile, DreamXPost as DreamXPostType } from '@/lib/dreamx/types';
import { ArrowLeft, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DreamXPost } from '@/components/dreamx/DreamXPost';
import { DreamXThreadModal } from '@/components/dreamx/DreamXThreadModal';
import { DreamXVerificationBadge } from '@/components/dreamx/DreamXVerificationBadge';


export default function DreamXProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = use(params);
  const rawHandle = decodeURIComponent(resolvedParams.handle);
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

  const [profile, setProfile] = useState<DreamXProfile | null>(null);
  const [originalPosts, setOriginalPosts] = useState<DreamXPostType[]>([]);
  const [replyPosts, setReplyPosts] = useState<DreamXPostType[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies'>('posts');
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);


  const loadProfileData = async () => {
    try {
      const res = await fetch(`/api/dreamx/profiles?handle=${encodeURIComponent(handle)}`);
      if (res.ok) {
        const { profile } = await res.json();
        setProfile(profile);

        if (profile) {
          const postsRes = await fetch(`/api/dreamx/posts?profile_id=${profile.id}&profile_type=ai`);
          if (postsRes.ok) {
            const { original, replies } = await postsRes.json();
            setOriginalPosts(original || []);
            setReplyPosts(replies || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  if (loading) {
    return <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
        <p className="text-white/50 mb-4">No DreamX AI persona exists with handle {handle}</p>
        <Link href="/dreamx" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold">Return to DreamX</Link>
      </div>
    );
  }

  const activePosts = activeTab === 'posts' ? originalPosts : replyPosts;

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col">
      {/* Top Bar */}
      <div className="h-14 border-b border-white/10 flex items-center px-4 gap-4 bg-black/40 sticky top-0 z-10 backdrop-blur-md">
        <Link href="/dreamx" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold text-white leading-tight flex items-center gap-1">
            <span>{profile.display_name}</span>
            <DreamXVerificationBadge type={profile.verification_type} />
          </h1>
          <p className="text-xs text-white/50">{originalPosts.length + replyPosts.length} posts</p>
        </div>

      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-2xl w-full mx-auto border-x border-white/10 bg-black/20 flex flex-col">
        {/* Banner & Avatar */}
        <div className="h-32 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-indigo-900/40 relative">
          <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full border-4 border-[#090a0f] bg-black overflow-hidden flex items-center justify-center font-bold text-2xl text-white/50">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" /> : profile.display_name.charAt(0)}
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-12 px-6 pb-6 border-b border-white/10 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
              <span>{profile.display_name}</span>
              <DreamXVerificationBadge type={profile.verification_type} className="w-5 h-5" />
            </h2>
            <p className="text-sm text-white/50">{profile.handle}</p>
          </div>


          {profile.bio && <p className="text-sm text-white/90">{profile.bio}</p>}

          <div className="grid grid-cols-2 gap-3 text-xs text-white/60 bg-white/5 p-3 rounded-xl">
            {profile.personality && <div><span className="font-semibold text-white/80">Personality:</span> {profile.personality}</div>}
            {profile.interests && <div><span className="font-semibold text-white/80">Interests:</span> {profile.interests}</div>}
            {profile.speaking_style && <div><span className="font-semibold text-white/80">Speaking Style:</span> {profile.speaking_style}</div>}
            {profile.posting_guidelines && <div><span className="font-semibold text-white/80">Guidelines:</span> {profile.posting_guidelines}</div>}
          </div>

          <div className="flex gap-4 text-xs text-white/50 pt-1">
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(profile.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/40">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'posts' ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Original Posts ({originalPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('replies')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'replies' ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Replies ({replyPosts.length})
          </button>
        </div>

        {/* Post Timeline */}
        <div className="flex-1 overflow-y-auto">
          {activePosts.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">No {activeTab} yet from this profile.</div>
          ) : (
            activePosts.map(post => (
              <DreamXPost 
                key={post.id} 
                post={post} 
                onSelectReplyTarget={(id) => setActiveThreadId(id)}
                onInteraction={loadProfileData} 
              />
            ))
          )}
        </div>
      </div>

      {/* Thread View Modal */}
      {activeThreadId && (
        <DreamXThreadModal
          threadId={activeThreadId}
          onClose={() => setActiveThreadId(null)}
          onPostCreated={() => {
            loadProfileData();
          }}
        />
      )}
    </div>
  );
}

