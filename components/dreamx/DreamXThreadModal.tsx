'use client';

import React, { useState, useEffect } from 'react';
import type { DreamXPost as DreamXPostType } from '@/lib/dreamx/types';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { DreamXPost } from './DreamXPost';
import { DreamXMentionComposer } from './DreamXMentionComposer';

interface DreamXThreadModalProps {
  threadId: string;
  onClose: () => void;
  onPostCreated: () => void;
}

export function DreamXThreadModal({ threadId, onClose, onPostCreated }: DreamXThreadModalProps) {
  const [root, setRoot] = useState<DreamXPostType | null>(null);
  const [replies, setReplies] = useState<DreamXPostType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Target reply post state
  const [replyTarget, setReplyTarget] = useState<{ id: string; handle: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadThread = async () => {
    try {
      const res = await fetch(`/api/dreamx/posts?thread_id=${threadId}`);
      if (res.ok) {
        const data = await res.json();
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
      console.error('Failed to load conversation thread:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReplyTarget(null);
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

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
        await loadThread();
        onPostCreated();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f111a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-2 text-white font-bold">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <span>Conversation</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8 text-white/50"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : root ? (
            <div className="space-y-4">
              {/* Root Post Card */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <DreamXPost 
                  post={root}
                  onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
                  onInteraction={loadThread}
                />
              </div>

              {/* Flat Chronological Conversation List */}
              <div className="space-y-2">
                <div className="text-xs text-white/40 font-bold px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Replies ({replies.length})</span>
                  <span className="text-[10px] text-white/30 font-normal">Flat Chronological Order</span>
                </div>

                {replies.length === 0 ? (
                  <p className="text-sm text-white/30 italic py-4 px-2">No replies yet. Be the first to respond!</p>
                ) : (
                  replies.map(reply => (
                    <div 
                      key={reply.id} 
                      className={`transition-colors rounded-xl overflow-hidden ${
                        replyTarget?.id === reply.id ? 'ring-1 ring-blue-500 bg-blue-500/5' : ''
                      }`}
                    >
                      <DreamXPost 
                        post={reply}
                        onSelectReplyTarget={(id, handle) => setReplyTarget({ id, handle })}
                        onInteraction={loadThread}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-white/40 text-center p-4">Post not found.</p>
          )}
        </div>

        {/* Reply Composer */}
        {replyTarget && (
          <div className="p-4 border-t border-white/10 bg-black/60">
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
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm"
              />

              <button
                type="submit"
                disabled={isSubmitting || !replyContent.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Reply
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
