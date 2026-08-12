'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DreamGenRenderer } from '@/components/DreamGenRenderer';
import { ControlDock, InputMode } from '@/components/ControlDock';
import { SettingsModal } from '@/components/SettingsModal';
import { MemoryInspector } from '@/components/MemoryInspector';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { DbSession, DbMessage } from '@/lib/db';
import { ChatMessage, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { Sparkles, MessageSquarePlus, Key } from 'lucide-react';

export default function Home() {
  const [worlds, setWorlds] = React.useState<WorldData[]>([]);
  const [selectedWorld, setSelectedWorld] = React.useState<WorldData | null>(null);
  const [selectedCharacter, setSelectedCharacter] = React.useState<CharacterCard | null>(null);

  const [sessions, setSessions] = React.useState<DbSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const [apiKey, setApiKey] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>(DEFAULT_GEMINI_MODEL);

  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);
  const [streamingContent, setStreamingContent] = React.useState<string>('');

  const [isSettingsOpen, setIsSettingsOpen] = React.useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = React.useState<boolean>(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load API Key from localStorage
  React.useEffect(() => {
    const savedKey = localStorage.getItem('dreamweaver_gemini_key') || '';
    setApiKey(savedKey);
    if (!savedKey) {
      setIsSettingsOpen(true);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('dreamweaver_gemini_key', key);
  };

  // Load Worlds and Characters
  const fetchWorlds = async () => {
    try {
      const res = await fetch('/api/worlds');
      const data = await res.json();
      if (data.worlds && data.worlds.length > 0) {
        setWorlds(data.worlds);
        const firstWorld = data.worlds[0];
        setSelectedWorld(firstWorld);
        if (firstWorld.characters && firstWorld.characters.length > 0) {
          setSelectedCharacter(firstWorld.characters[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load worlds:', err);
    }
  };

  // Load Sessions from SQLite
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  React.useEffect(() => {
    fetchWorlds();
    fetchSessions();
  }, []);

  // Scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Load messages for an active session
  const loadSessionMessages = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: DbMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            type: m.type,
            timestamp: m.timestamp,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  // Start New Story Session
  const handleNewStory = async () => {
    if (!selectedWorld || !selectedCharacter) return;

    const newSessionId = `session-${Date.now()}`;
    const newSession: DbSession = {
      id: newSessionId,
      title: `${selectedCharacter.name} - ${new Date().toLocaleDateString()}`,
      world_id: selectedWorld.id,
      character_id: selectedCharacter.id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Save session to SQLite
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveSession', session: newSession }),
    });

    // Add initial first message from Character Card
    const initialMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'model',
      content: selectedCharacter.firstMessage || `*${selectedCharacter.name} looks at you silently.*`,
      timestamp: Date.now(),
    };

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveMessage',
        message: {
          id: initialMsg.id,
          session_id: newSessionId,
          role: initialMsg.role,
          content: initialMsg.content,
          type: 'narration',
          timestamp: initialMsg.timestamp,
        },
      }),
    });

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setMessages([initialMsg]);
  };

  // Handle User Input Submission
  const handleSendInput = async (content: string, type: InputMode) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      if (!selectedWorld || !selectedCharacter) return;
      currentSessionId = `session-${Date.now()}`;
      const newSession: DbSession = {
        id: currentSessionId,
        title: `${selectedCharacter.name} Story`,
        world_id: selectedWorld.id,
        character_id: selectedCharacter.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveSession', session: newSession }),
      });
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(currentSessionId);
    }

    // Append user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      type,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Save user message to SQLite
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveMessage',
        message: {
          id: userMsg.id,
          session_id: currentSessionId,
          role: userMsg.role,
          content: userMsg.content,
          type: userMsg.type,
          timestamp: userMsg.timestamp,
        },
      }),
    });

    // Trigger Gemini Stream Generation
    triggerStreamingResponse(updatedMessages, currentSessionId);
  };

  // Trigger AI Continuation without user text
  const handleContinue = () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!activeSessionId) return;

    triggerStreamingResponse(messages, activeSessionId);
  };

  // Stream Gemini Response
  const triggerStreamingResponse = async (history: ChatMessage[], sessionId: string) => {
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          model: selectedModel,
          worldLore: selectedWorld?.loreContent,
          characterName: selectedCharacter?.name,
          characterPersonality: selectedCharacter?.personality,
          scenarioDescription: selectedCharacter?.scenarioDescription,
          messages: history,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to stream response from Gemini');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingContent(fullText);
        }
      }

      // Finalize Model Message
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        content: fullText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setStreamingContent('');

      // Save AI response to SQLite
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveMessage',
          message: {
            id: aiMsg.id,
            session_id: sessionId,
            role: aiMsg.role,
            content: aiMsg.content,
            type: 'narration',
            timestamp: aiMsg.timestamp,
          },
        }),
      });
    } catch (err: any) {
      console.error('Streaming error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `*Story Engine Warning:* ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Undo Last Message
  const handleUndo = async () => {
    if (messages.length <= 1) return;
    const lastMsg = messages[messages.length - 1];
    setMessages((prev) => prev.slice(0, -1));
    if (lastMsg.id) {
      await fetch(`/api/sessions?messageId=${lastMsg.id}`, { method: 'DELETE' });
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    await fetch(`/api/sessions?sessionId=${sessionId}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  // Edit Message Turn
  const handleEditMessage = async (index: number, newContent: string) => {
    const updated = [...messages];
    updated[index].content = newContent;
    setMessages(updated);

    const targetMsg = updated[index];
    if (targetMsg.id && activeSessionId) {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveMessage',
          message: {
            id: targetMsg.id,
            session_id: activeSessionId,
            role: targetMsg.role,
            content: newContent,
            type: targetMsg.type || 'narration',
            timestamp: targetMsg.timestamp || Date.now(),
          },
        }),
      });
    }
  };

  // Regenerate Response
  const handleRegenerateFromIndex = (index: number) => {
    const trimmedHistory = messages.slice(0, index);
    setMessages(trimmedHistory);
    if (activeSessionId) {
      triggerStreamingResponse(trimmedHistory, activeSessionId);
    }
  };

  return (
    <div className="flex h-screen bg-[#090a0f] text-[#e2e8f0] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        worlds={worlds}
        selectedWorld={selectedWorld}
        selectedCharacter={selectedCharacter}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectWorld={(w) => {
          setSelectedWorld(w);
          if (w.characters && w.characters.length > 0) {
            setSelectedCharacter(w.characters[0]);
          }
        }}
        onSelectCharacter={(c) => setSelectedCharacter(c)}
        onSelectSession={loadSessionMessages}
        onNewStory={handleNewStory}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <Header
          world={selectedWorld}
          character={selectedCharacter}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          hasApiKey={!!apiKey}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
        />

        {/* Reading Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto my-20 text-center space-y-6">
              <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Welcome to DreamWeaver</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Select a local World and Character card from the sidebar, then click{' '}
                <strong className="text-amber-400 font-semibold">"New Story Session"</strong> to begin your privacy-first interactive narrative.
              </p>
              {!apiKey && (
                <div className="pt-2">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg"
                  >
                    <Key className="w-4 h-4" />
                    <span>Set Gemini API Key to Start</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <DreamGenRenderer
                  key={msg.id || `msg-${index}`}
                  role={msg.role}
                  content={msg.content}
                  type={msg.type}
                  onEdit={(newContent) => handleEditMessage(index, newContent)}
                  onRegenerate={msg.role === 'model' ? () => handleRegenerateFromIndex(index) : undefined}
                />
              ))}

              {/* Live Streaming Response */}
              {isStreaming && (
                <DreamGenRenderer
                  role="model"
                  content={streamingContent}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Control Dock */}
        <ControlDock
          onSend={handleSendInput}
          onContinue={handleContinue}
          onUndo={handleUndo}
          disabled={isStreaming}
        />
      </div>

      {/* Modals & Drawers */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <MemoryInspector
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        world={selectedWorld}
        character={selectedCharacter}
        messageCount={messages.length}
      />
    </div>
  );
}
