'use client';

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DreamGenRenderer } from '@/components/DreamGenRenderer';
import { ControlDock, InputMode } from '@/components/ControlDock';
import { SettingsModal } from '@/components/SettingsModal';
import { MemoryInspector } from '@/components/MemoryInspector';
import { ScenarioDiscovery } from '@/components/ScenarioDiscovery';
import { PreStartModal } from '@/components/PreStartModal';
import { ScenarioBuilder } from '@/components/ScenarioBuilder';
import { RightInspectorPanel } from '@/components/RightInspectorPanel';

import { FullScenario, PersonaTemplate, WorldBuilding } from '@/lib/scenarios/reader';
import { DbSession, DbMessage } from '@/lib/db';
import { ChatMessage, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { Key } from 'lucide-react';

export default function Home() {
  const [scenarios, setScenarios] = React.useState<FullScenario[]>([]);
  const [activeScenario, setActiveScenario] = React.useState<FullScenario | null>(null);
  const [activePersona, setActivePersona] = React.useState<PersonaTemplate | null>(null);
  const [activeWorldBuilding, setActiveWorldBuilding] = React.useState<WorldBuilding | null>(null);

  const [sessions, setSessions] = React.useState<DbSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const [viewMode, setViewMode] = React.useState<'discovery' | 'play'>('discovery');

  // Modals & Panels State
  const [isPreStartOpen, setIsPreStartOpen] = React.useState(false);
  const [preStartScenario, setPreStartScenario] = React.useState<FullScenario | null>(null);

  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [builderInitialScenario, setBuilderInitialScenario] = React.useState<FullScenario | null>(null);

  const [isRightInspectorOpen, setIsRightInspectorOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = React.useState(false);

  const [apiKey, setApiKey] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>(DEFAULT_GEMINI_MODEL);

  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);
  const [streamingContent, setStreamingContent] = React.useState<string>('');

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

  // Load Scenarios from local API
  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      if (data.scenarios) {
        setScenarios(data.scenarios);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  // Load SQLite Sessions
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
    fetchScenarios();
    fetchSessions();
  }, []);

  // Scroll to bottom during message streaming
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Load Session Messages from SQLite
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

      // Attach scenario if matched
      const sessionObj = sessions.find((s) => s.id === sessionId);
      if (sessionObj) {
        const foundScen = scenarios.find((sc) => sc.meta.id === sessionObj.world_id);
        if (foundScen) {
          setActiveScenario(foundScen);
          setActiveWorldBuilding(foundScen.worldBuilding);
          const foundPers = foundScen.suggestedPersonas.find(
            (p) => p.id === sessionObj.character_id
          );
          if (foundPers) setActivePersona(foundPers);
        }
      }

      setViewMode('play');
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  // Start Play Flow from Discovery Card
  const handleOpenPlayFlow = (scenario: FullScenario) => {
    setPreStartScenario(scenario);
    setIsPreStartOpen(true);
  };

  // Confirm Game Start from PreStartModal
  const handleStartGame = async (scenario: FullScenario, persona: PersonaTemplate) => {
    setActiveScenario(scenario);
    setActivePersona(persona);
    setActiveWorldBuilding(scenario.worldBuilding);

    const newSessionId = `session-${Date.now()}`;
    const newSession: DbSession = {
      id: newSessionId,
      title: `${persona.name} (${scenario.meta.title})`,
      world_id: scenario.meta.id,
      character_id: persona.id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Save session to SQLite
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveSession', session: newSession }),
    });

    // Opening initial message
    const initialMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'model',
      content: persona.firstMessage || `*${persona.name} looks around slowly.*`,
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
    setViewMode('play');
  };

  // Edit Scenario Builder
  const handleOpenBuilder = (scenario?: FullScenario) => {
    setBuilderInitialScenario(scenario || null);
    setIsBuilderOpen(true);
  };

  // Send User Action / Dialogue Input
  const handleSendInput = async (content: string, type: InputMode) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!activeSessionId) return;

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
          session_id: activeSessionId,
          role: userMsg.role,
          content: userMsg.content,
          type: userMsg.type,
          timestamp: userMsg.timestamp,
        },
      }),
    });

    triggerStreamingResponse(updatedMessages, activeSessionId);
  };

  const handleContinue = () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!activeSessionId) return;

    triggerStreamingResponse(messages, activeSessionId);
  };

  // Gemini Stream Generation
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
          narratorDirectives: activeWorldBuilding?.narrator,
          settingLore: activeWorldBuilding?.setting,
          plotHooks: activeWorldBuilding?.plot,
          writingStyle: activeWorldBuilding?.style,
          customObjects: activeWorldBuilding?.objects || [],
          fewShotExamples: activeWorldBuilding?.examples || [],
          characterName: activePersona?.name,
          characterPersonality: activePersona?.personality,
          characterTagline: activePersona?.tagline,
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

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        content: fullText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setStreamingContent('');

      // Save AI turn to SQLite
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
        content: `*Story Engine Error:* ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleUndo = async () => {
    if (messages.length <= 1) return;
    const lastMsg = messages[messages.length - 1];
    setMessages((prev) => prev.slice(0, -1));
    if (lastMsg.id) {
      await fetch(`/api/sessions?messageId=${lastMsg.id}`, { method: 'DELETE' });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await fetch(`/api/sessions?sessionId=${sessionId}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
      setViewMode('discovery');
    }
  };

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

  const handleRegenerateFromIndex = (index: number) => {
    const trimmedHistory = messages.slice(0, index);
    setMessages(trimmedHistory);
    if (activeSessionId) {
      triggerStreamingResponse(trimmedHistory, activeSessionId);
    }
  };

  // Convert Scenarios for Sidebar legacy compatibility
  const sidebarWorlds = React.useMemo(() => {
    return scenarios.map((sc) => ({
      id: sc.meta.id,
      name: sc.meta.title,
      description: sc.meta.description,
      loreContent: sc.worldBuilding.setting,
      characters: sc.suggestedPersonas.map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        personality: p.personality,
        firstMessage: p.firstMessage,
      })),
    }));
  }, [scenarios]);

  return (
    <div className="flex h-screen bg-[#090a0f] text-[#e2e8f0] overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        worlds={sidebarWorlds}
        selectedWorld={
          activeScenario
            ? {
                id: activeScenario.meta.id,
                name: activeScenario.meta.title,
                description: activeScenario.meta.description,
                loreContent: activeWorldBuilding?.setting || '',
                characters: activeScenario.suggestedPersonas,
              }
            : null
        }
        selectedCharacter={activePersona}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectWorld={() => setViewMode('discovery')}
        onSelectCharacter={() => {}}
        onSelectSession={loadSessionMessages}
        onNewStory={() => setViewMode('discovery')}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
      />

      {/* Main Center Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <Header
          world={
            activeScenario
              ? {
                  id: activeScenario.meta.id,
                  name: activeScenario.meta.title,
                  description: activeScenario.meta.description,
                  loreContent: activeWorldBuilding?.setting || '',
                  characters: activeScenario.suggestedPersonas,
                }
              : null
          }
          character={activePersona}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          hasApiKey={!!apiKey}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMemory={() => setIsRightInspectorOpen(!isRightInspectorOpen)}
        />

        {/* Dynamic View: Discovery Card Grid vs Active Roleplay Session */}
        {viewMode === 'discovery' ? (
          <ScenarioDiscovery
            scenarios={scenarios}
            onPlayScenario={handleOpenPlayFlow}
            onEditScenario={handleOpenBuilder}
            onCreateScenario={() => handleOpenBuilder()}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Reading Viewport */}
            <main className="flex-1 overflow-y-auto px-6 py-8 contain-content overscroll-contain">
              {messages.length === 0 ? (
                <div className="max-w-xl mx-auto my-20 text-center space-y-6">
                  <h2 className="text-2xl font-bold text-white">Starting Scenario Session...</h2>
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
                      onRegenerate={
                        msg.role === 'model' ? () => handleRegenerateFromIndex(index) : undefined
                      }
                    />
                  ))}

                  {/* Streaming Output */}
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

            {/* In-Game Tabbed Right Panel (DreamGen Parity) */}
            {isRightInspectorOpen && activeWorldBuilding && (
              <RightInspectorPanel
                isOpen={isRightInspectorOpen}
                onClose={() => setIsRightInspectorOpen(false)}
                worldBuilding={activeWorldBuilding}
                persona={activePersona}
                onUpdateWorldBuilding={(wb) => setActiveWorldBuilding(wb)}
                onUpdatePersona={(p) => setActivePersona(p)}
              />
            )}
          </div>
        )}

        {/* Input Dock (Active during Play mode) */}
        {viewMode === 'play' && (
          <ControlDock
            onSend={handleSendInput}
            onContinue={handleContinue}
            onUndo={handleUndo}
            disabled={isStreaming}
          />
        )}
      </div>

      {/* Modals & Flow Controllers */}
      <PreStartModal
        isOpen={isPreStartOpen}
        onClose={() => setIsPreStartOpen(false)}
        scenario={preStartScenario}
        onStartGame={handleStartGame}
      />

      <ScenarioBuilder
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        initialScenario={builderInitialScenario}
        onSaveSuccess={fetchScenarios}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <MemoryInspector
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        world={
          activeScenario
            ? {
                id: activeScenario.meta.id,
                name: activeScenario.meta.title,
                description: activeScenario.meta.description,
                loreContent: activeWorldBuilding?.setting || '',
                characters: activeScenario.suggestedPersonas,
              }
            : null
        }
        character={activePersona}
        messageCount={messages.length}
      />
    </div>
  );
}
