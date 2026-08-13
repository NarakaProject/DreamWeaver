'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { DreamXPost as DreamXPostType, DreamXUserProfile } from '@/lib/dreamx/types';
import { ArrowLeft, MessageSquare, Loader2, Send, Sparkles } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col">
      {/* Top Bar Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 gap-4 bg-black/40 sticky top-0 z-20 backdrop-blur-md">
        <Link href="/dreamx" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h1 className="font-bold text-lg text-white">Post Conversation</h1>
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col space-y-4 pb-28">
        {root ? (
          <>
            {/* Root Post Card */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <DreamXPost 
                post={root}
                onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
                onInteraction={loadConversation}
              />
            </div>

            {/* Flat Chronological Conversation List */}
            <div className="space-y-3">
              <div className="text-xs text-white/40 font-bold px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>Replies ({replies.length})</span>
                <span className="text-[10px] text-white/30 font-normal">Flat Chronological Order</span>
              </div>

              {replies.length === 0 ? (
                <p className="text-sm text-white/30 italic py-6 text-center bg-white/5 rounded-xl border border-white/5">
                  No replies yet in this conversation. Be the first to respond!
                </p>
              ) : (
                replies.map((reply) => (
                  <div 
                    key={reply.id}
                    className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all ${
                      replyTarget?.id === reply.id ? 'ring-1 ring-blue-500 bg-blue-500/10 border-blue-500/30' : ''
                    }`}
                  >
                    <DreamXPost 
                      post={reply}
                      onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
                      onInteraction={loadConversation}
                    />
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-white/40 py-12">
            Post conversation not found.
          </div>
        )}
      </div>

      {/* Floating Bottom Reply Composer */}
      {replyTarget && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0f111a]/95 backdrop-blur-md p-4 z-30">
          <div className="max-w-2xl mx-auto w-full">
            <div className="text-xs text-blue-400 mb-2 font-medium flex items-center justify-between">
              <span>Replying to <span className="font-bold">{replyTarget.handle}</span></span>
              {root && replyTarget.id !== root.id && (
                <button 
                  onClick={() => setReplyTarget({ id: root.id, handle: root.author_handle || '@user' })}
                  className="text-[10px] text-white/40 hover:text-white underline"
                >
                  Reply to Root Post
                </button>
              )}
            </div>
            <form onSubmit={handleSendReply} className="flex gap-2">
              <DreamXMentionComposer
                value={replyContent}
                onChange={setReplyContent}
                isTextArea={false}
                placeholder="Post your reply..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm"
              />

              <button
                type="submit"
                disabled={isSubmitting || !replyContent.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 text-sm shadow-md"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Reply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
