import React, { useState, useEffect, useRef } from 'react';
import { Mail, X, Send, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Conversation {
  id: string;
  created_at: number;
  updated_at: number;
  last_message_id: string | null;
  last_read_message_rowid: number;
  unread_count: number;
  other_participant: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url?: string;
  };
  last_message?: {
    body: string;
    sender_id: string;
    created_at: number;
  };
}

interface Message {
  rowid: number;
  id: string;
  sender_id: string;
  body: string;
  created_at: number;
}

export function DreamXMessages({ activeUserId }: { activeUserId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/dreamx/dm/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (convId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dreamx/dm/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Mark read
        if (data.messages.length > 0) {
          const maxRowid = Math.max(...data.messages.map((m: Message) => m.rowid));
          await fetch(`/api/dreamx/dm/conversations/${convId}/read`, {
            method: 'POST',
            body: JSON.stringify({ messageRowid: maxRowid })
          });
          setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchConversations();
  }, [isOpen]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
    } else {
      setMessages([]);
    }
  }, [activeConv]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeConv) return;
    
    const body = draft;
    setDraft('');
    
    try {
      const res = await fetch(`/api/dreamx/dm/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages(prev => [...prev, message]);
        // Re-fetch conversations to update last message
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
        title="Direct Messages"
      >
        <Mail className="w-5 h-5 text-white/80" />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#090a0f]">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="w-full max-w-md bg-[#0f111a] h-full shadow-2xl relative flex flex-col border-l border-white/10 transform transition-transform">
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center px-4 shrink-0 bg-black/20">
              {activeConv ? (
                <>
                  <button onClick={() => setActiveConv(null)} className="p-2 -ml-2 rounded-full hover:bg-white/10 mr-2">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                      {activeConv.other_participant.avatar_url ? (
                        <img src={activeConv.other_participant.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                          {activeConv.other_participant.display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-white text-sm truncate">{activeConv.other_participant.display_name}</h3>
                      <p className="text-xs text-white/50 truncate">{activeConv.other_participant.handle}</p>
                    </div>
                  </div>
                </>
              ) : (
                <h2 className="font-bold text-white flex-1">Messages</h2>
              )}
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {!activeConv ? (
                // Conversations List
                <div className="flex-1">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-white/40 text-sm">No messages yet.</div>
                  ) : (
                    conversations.map(conv => (
                      <button 
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className="w-full p-4 border-b border-white/5 hover:bg-white/5 flex gap-3 text-left items-center transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0">
                          {conv.other_participant.avatar_url ? (
                            <img src={conv.other_participant.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-white/60">
                              {conv.other_participant.display_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h3 className="font-bold text-white text-sm truncate">{conv.other_participant.display_name}</h3>
                            {conv.last_message && (
                              <span className="text-xs text-white/40 shrink-0 ml-2">
                                {new Date(conv.last_message.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {conv.last_message && (
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-white/50'}`}>
                              {conv.last_message.sender_id === activeUserId ? 'You: ' : ''}{conv.last_message.body}
                            </p>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {conv.unread_count}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                // Active Chat
                <div className="flex-1 flex flex-col p-4">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {loading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.sender_id === activeUserId;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
                              {msg.body}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Composer */}
                  <form onSubmit={handleSend} className="mt-4 shrink-0 flex gap-2">
                    <input 
                      type="text"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="Start a new message"
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={!draft.trim()}
                      className="w-10 h-10 shrink-0 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-400 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
