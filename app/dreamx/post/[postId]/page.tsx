'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { DreamXPost as DreamXPostType, DreamXUserProfile } from '@/lib/dreamx/types';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { DreamXPost } from '@/components/dreamx/DreamXPost';
import { DreamXMentionComposer } from '@/components/dreamx/DreamXMentionComposer';

export default function PostConversationPage() {
  const params = useParams();
  const postId = params.postId as string;

  const [humanUser, setHumanUser] = useState<DreamXUserProfile | null>(null);
  const [root, setRoot] = useState<DreamXPostType | null>(null);
  const [replies, setReplies] = useState<DreamXPostType[]>([]);
  const [loading, setLoading] = useState(true);

  // Target reply state
  const [replyTarget, setReplyTarget] = useState<{ id: string; handle: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadConversation = async () => {
    try {
      const [userRes, postRes] = await Promise.all([
        fetch('/api/dreamx/user'),
        fetch(`/api/dreamx/posts?thread_id=${postId}`)
      ]);

      if (userRes.ok) {
        const { user } = await userRes.json();
        setHumanUser(user || null);
      }

      if (postRes.ok) {
        const data = await postRes.json();
        setRoot(data.root);
        setReplies(data.conversation || data.replies || []);
        if (!replyTarget) {
          const targetPost = data.target || data.root;
          if (targetPost) {
            setReplyTarget({ id: targetPost.id, handle: targetPost.author_handle || '@user' });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      loadConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyTarget) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/dreamx/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          reply_to_post_id: replyTarget.id
        })
      });

      if (res.ok) {
        setReplyContent('');
        await loadConversation();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white/50">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const targetHandle = replyTarget?.handle || root?.author_handle || '@user';

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col">
      {/* Top Bar Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-4 gap-4 bg-black/40 sticky top-0 z-20 backdrop-blur-md">
        <Link href="/dreamx" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg text-white">Post</h1>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto border-x border-white/10 bg-black/20 flex flex-col min-h-screen">
        {root ? (
          <>
            {/* ROOT POST — Continuous timeline surface */}
            <DreamXPost 
              post={root}
              onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
              onInteraction={loadConversation}
            />

            {/* REPLY COMPOSER — Positioned immediately BELOW root post and ABOVE replies */}
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="text-xs text-white/50 mb-2 font-medium flex items-center justify-between">
                <span>Replying to <span className="text-blue-400 font-bold">{targetHandle}</span></span>
                {replyTarget && root && replyTarget.id !== root.id && (
                  <button 
                    type="button"
                    onClick={() => setReplyTarget({ id: root.id, handle: root.author_handle || '@user' })}
                    className="text-[10px] text-white/40 hover:text-white underline"
                  >
                    Reply to Root Post
                  </button>
                )}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex-shrink-0 flex items-center justify-center font-bold text-blue-400 text-base">
                  {humanUser?.avatar_url ? (
                    <img src={humanUser.avatar_url} alt={humanUser.display_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    humanUser?.display_name?.charAt(0) || 'U'
                  )}
                </div>

                <div className="flex-1">
                  <DreamXMentionComposer
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="Post your reply"
                    rows={2}
                    className="w-full bg-transparent border-none text-white text-base placeholder-white/30 resize-none focus:outline-none min-h-[60px]"
                  />

                  <div className="flex justify-end items-center pt-2 border-t border-white/10 mt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !replyContent.trim()}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 text-sm shadow-md"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Reply
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* FLAT CHRONOLOGICAL REPLIES TIMELINE */}
            <div className="flex-1">
              {replies.map((reply) => (
                <div 
                  key={reply.id}
                  className={`transition-colors ${
                    replyTarget?.id === reply.id ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <DreamXPost 
                    post={reply}
                    onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
                    onInteraction={loadConversation}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-white/40 py-12 p-4">
            Post not found.
          </div>
        )}
      </div>
    </div>
  );
}
