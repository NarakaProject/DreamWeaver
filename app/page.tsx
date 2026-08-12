'use client';

import React from 'react';
import { Sidebar, SidebarNavView } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DreamGenRenderer } from '@/components/DreamGenRenderer';
import { ControlDock } from '@/components/ControlDock';
import { SettingsModal } from '@/components/SettingsModal';
import { MemoryInspector } from '@/components/MemoryInspector';
import { ScenarioDiscovery } from '@/components/ScenarioDiscovery';
import { PreStartModal } from '@/components/PreStartModal';
import { ScenarioBuilder } from '@/components/ScenarioBuilder';
import { ScenarioWizardModal } from '@/components/ScenarioWizardModal';
import { RightInspectorPanel } from '@/components/RightInspectorPanel';

import { FullScenario, PersonaTemplate, WorldBuilding } from '@/lib/scenarios/reader';
import { DbSession, DbMessage } from '@/lib/db';
import { ChatMessage, DEFAULT_GEMINI_MODEL } from '@/lib/gemini/client';
import { splitMultiSpeakerText } from '@/lib/parser/dreamgen';

export default function Home() {
  const [scenarios, setScenarios] = React.useState<FullScenario[]>([]);
  const [activeScenario, setActiveScenario] = React.useState<FullScenario | null>(null);
  const [activePersona, setActivePersona] = React.useState<PersonaTemplate | null>(null);
  const [activeWorldBuilding, setActiveWorldBuilding] = React.useState<WorldBuilding | null>(null);

  const [sessions, setSessions] = React.useState<DbSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);

  const [viewMode, setViewMode] = React.useState<SidebarNavView>('discovery');

  // Modals & Panels State
  const [isPreStartOpen, setIsPreStartOpen] = React.useState(false);
  const [preStartScenario, setPreStartScenario] = React.useState<FullScenario | null>(null);

  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [builderInitialScenario, setBuilderInitialScenario] = React.useState<FullScenario | null>(null);
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);

  const [isRightInspectorOpen, setIsRightInspectorOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = React.useState(false);

  // Settings State
  const [apiKey, setApiKey] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>(DEFAULT_GEMINI_MODEL);
  const [availableModels, setAvailableModels] = React.useState<{ id: string; displayName: string }[]>([]);
  const [temperature, setTemperature] = React.useState<number>(0.8);
  const [maxTokens, setMaxTokens] = React.useState<number>(2048);

  // Active Turn Speaker State
  const [selectedSpeaker, setSelectedSpeaker] = React.useState<string>('You');

  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);
  const [streamingContent, setStreamingContent] = React.useState<string>('');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchDynamicModels = async (key: string) => {
    if (!key) return;
    try {
      const res = await fetch(`/api/gemini/models?apiKey=${encodeURIComponent(key)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          if (!data.models.some((m: any) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dynamic Gemini models:', err);
    }
  };

  // Load Settings from localStorage
  React.useEffect(() => {
    const savedKey = localStorage.getItem('dreamweaver_gemini_key') || '';
    const savedTemp = localStorage.getItem('dreamweaver_temperature');
    const savedTokens = localStorage.getItem('dreamweaver_max_tokens');

    setApiKey(savedKey);
    if (savedTemp) setTemperature(parseFloat(savedTemp));
    if (savedTokens) setMaxTokens(parseInt(savedTokens));

    if (!savedKey) {
      setIsSettingsOpen(true);
    } else {
      fetchDynamicModels(savedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('dreamweaver_gemini_key', key);
    fetchDynamicModels(key);
  };

  const handleSaveTemperature = (temp: number) => {
    setTemperature(temp);
    localStorage.setItem('dreamweaver_temperature', temp.toString());
  };

  const handleSaveMaxTokens = (tokens: number) => {
    setMaxTokens(tokens);
    localStorage.setItem('dreamweaver_max_tokens', tokens.toString());
  };

  // Load Scenarios & Sessions
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
            speaker: m.speaker,
            timestamp: m.timestamp,
          }))
        );
      }

      const sessionObj = sessions.find((s) => s.id === sessionId);
      if (sessionObj) {
        const foundScen = scenarios.find((sc) => sc.meta.id === sessionObj.world_id);
        if (foundScen) {
          setActiveScenario(foundScen);
          setActiveWorldBuilding(foundScen.worldBuilding);
          const foundPers = foundScen.suggestedPersonas.find(
            (p) => p.id === sessionObj.character_id
          );
          if (foundPers) {
            setActivePersona(foundPers);
            setSelectedSpeaker(foundPers.name);
          }
        }
      }

      setViewMode('play');
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  const handleOpenPlayFlow = (scenario: FullScenario) => {
    setPreStartScenario(scenario);
    setIsPreStartOpen(true);
  };

  const handleStartGame = async (scenario: FullScenario, persona: PersonaTemplate) => {
    setActiveScenario(scenario);
    setActivePersona(persona);
    setActiveWorldBuilding(scenario.worldBuilding);
    setSelectedSpeaker(persona.name);

    const newSessionId = `session-${Date.now()}`;
    const newSession: DbSession = {
      id: newSessionId,
      title: `${persona.name} (${scenario.meta.title})`,
      world_id: scenario.meta.id,
      character_id: persona.id,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveSession', session: newSession }),
    });

    let initialSpeaker = 'Narrator';
    let rawOpening = scenario.worldBuilding.openingMessage;

    if (!rawOpening || !rawOpening.trim()) {
      const primaryNPC = scenario.worldBuilding.scenarioNPCs?.[0];
      if (primaryNPC?.firstMessage) {
        rawOpening = primaryNPC.firstMessage;
        initialSpeaker = primaryNPC.name;
      } else if (persona.firstMessage) {
        rawOpening = persona.firstMessage;
        initialSpeaker = persona.name;
      } else {
        rawOpening = `*The story begins as ${persona.name} enters the scene.*`;
        initialSpeaker = 'Narrator';
      }
    }

    // Interpolate {{user}}, {{persona}}, {{USER}}, {{USER_PERSONA_NAME}} placeholders with persona.name
    const initialContent = rawOpening.replace(
      /\{\{(user|persona|USER|USER_PERSONA_NAME)\}\}/gi,
      persona.name
    );

    const initialMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'model',
      content: initialContent,
      speaker: initialSpeaker,
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
          speaker: initialMsg.speaker,
          timestamp: initialMsg.timestamp,
        },
      }),
    });

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setMessages([initialMsg]);
    setViewMode('play');
  };

  const handleOpenBuilder = (scenario?: FullScenario) => {
    setBuilderInitialScenario(scenario || null);
    setIsBuilderOpen(true);
  };

  // Send User Action / Dialogue Input
  const handleSendInput = async (content: string, speakerOverride?: string) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!activeSessionId) return;

    const speakerName = speakerOverride || selectedSpeaker || activePersona?.name || 'Valerius';

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      type: 'narration',
      speaker: speakerName,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Save message to SQLite
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
          speaker: userMsg.speaker,
          timestamp: userMsg.timestamp,
        },
      }),
    });

    triggerStreamingResponse(updatedMessages, activeSessionId, speakerOverride);
  };

  const handleContinue = (targetSpeaker?: string) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!activeSessionId) return;

    triggerStreamingResponse(messages, activeSessionId, targetSpeaker);
  };

  // Fetch Action Suggestions for User Persona
  const handleFetchSuggestions = async (): Promise<string[]> => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return [];
    }

    try {
      const res = await fetch('/api/chat/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          model: selectedModel,
          characterName: activePersona?.name || 'Player',
          settingLore: activeWorldBuilding?.setting,
          plotHooks: activeWorldBuilding?.plot,
          messages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.suggestions || [];
      }
    } catch (err) {
      console.error('Failed to fetch action suggestions:', err);
    }
    return [];
  };

  // Gemini Stream Generation
  const triggerStreamingResponse = async (
    history: ChatMessage[],
    sessionId: string,
    targetSpeaker?: string
  ) => {
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
          targetSpeaker: targetSpeaker || (selectedSpeaker !== activePersona?.name ? selectedSpeaker : undefined),
          messages: history,
          temperature,
          maxOutputTokens: maxTokens,
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

      const defaultSpeaker = targetSpeaker || (selectedSpeaker !== activePersona?.name ? selectedSpeaker : 'Narrator');
      const sections = splitMultiSpeakerText(fullText, defaultSpeaker);

      const createdMessages: ChatMessage[] = [];

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-${i}`,
          role: 'model',
          content: sec.content,
          speaker: sec.speaker,
          timestamp: Date.now() + i * 10,
        };

        createdMessages.push(aiMsg);

        // Save AI turn section to SQLite
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
              speaker: aiMsg.speaker,
              timestamp: aiMsg.timestamp,
            },
          }),
        });
      }

      setMessages((prev) => [...prev, ...createdMessages]);
      setStreamingContent('');
    } catch (err: any) {
      console.error('Streaming error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `*Story Engine Error:* ${err.message}`,
        speaker: 'Narrator',
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
            speaker: targetMsg.speaker,
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

  const sceneNPCs = React.useMemo(() => {
    if (!activeScenario) return [];
    const npcNames: string[] = [];
    if (activeWorldBuilding?.scenarioNPCs) {
      activeWorldBuilding.scenarioNPCs.forEach((npc) => npcNames.push(npc.name));
    }
    activeScenario.suggestedPersonas.forEach((p) => {
      if (p.name !== activePersona?.name && !npcNames.includes(p.name)) {
        npcNames.push(p.name);
      }
    });
    return npcNames;
  }, [activeScenario, activeWorldBuilding, activePersona]);

  const npcAvatars = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (activeWorldBuilding?.scenarioNPCs) {
      activeWorldBuilding.scenarioNPCs.forEach((npc) => {
        if (npc.avatar) map[npc.name] = npc.avatar;
      });
    }
    return map;
  }, [activeWorldBuilding]);

  return (
    <div className="flex h-screen bg-[#090a0f] text-[#e2e8f0] overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentView={viewMode}
        onNavigate={(view) => setViewMode(view)}
        scenarios={scenarios}
        activeScenario={activeScenario}
        activePersona={activePersona}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={loadSessionMessages}
        onDeleteSession={handleDeleteSession}
        onCreateScenario={() => handleOpenBuilder()}
        onOpenWizard={() => setIsWizardOpen(true)}
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
          availableModels={availableModels}
          hasApiKey={!!apiKey}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMemory={() => setIsRightInspectorOpen(!isRightInspectorOpen)}
        />

        {/* Dynamic View */}
        {viewMode === 'discovery' || viewMode === 'scenarios' ? (
          <ScenarioDiscovery
            scenarios={scenarios}
            onPlayScenario={handleOpenPlayFlow}
            onEditScenario={handleOpenBuilder}
            onCreateScenario={() => handleOpenBuilder()}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Reading Viewport */}
            <main className="flex-1 overflow-y-auto px-6 py-8 contain-content overscroll-contain">
              {messages.length === 0 ? (
                <div className="max-w-xl mx-auto my-20 text-center space-y-6">
                  <h2 className="text-2xl font-bold text-white">Starting Scenario Session...</h2>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((msg, index) => (
                    <DreamGenRenderer
                      key={msg.id || `msg-${index}`}
                      role={msg.role}
                      content={msg.content}
                      type={msg.type}
                      speaker={msg.speaker}
                      userPersonaName={activePersona?.name || 'Valerius'}
                      userAvatar={activePersona?.avatar}
                      knownNPCs={sceneNPCs}
                      npcAvatars={npcAvatars}
                      isFirstMessage={index === 0}
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
                      speaker={selectedSpeaker !== activePersona?.name ? selectedSpeaker : 'Narrator'}
                      userPersonaName={activePersona?.name || 'Valerius'}
                      userAvatar={activePersona?.avatar}
                      knownNPCs={sceneNPCs}
                      npcAvatars={npcAvatars}
                      isStreaming={true}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </main>

            {/* Input Dock (Confined strictly to Center Column) */}
            <ControlDock
              userPersonaName={activePersona?.name || 'You'}
              availableSpeakers={sceneNPCs}
              selectedSpeaker={selectedSpeaker}
              onSpeakerChange={setSelectedSpeaker}
              onSend={handleSendInput}
              onContinue={handleContinue}
              onUndo={handleUndo}
              onFetchSuggestions={handleFetchSuggestions}
              disabled={isStreaming}
            />
          </div>
        )}
      </div>

      {/* Full-Height Right Column (Live Story Inspector) */}
      {viewMode === 'play' && isRightInspectorOpen && activeWorldBuilding && (
        <div className="w-[380px] lg:w-[420px] h-full border-l border-[#1f2430] bg-[#0d0f17] flex flex-col shrink-0 z-30">
          <RightInspectorPanel
            isOpen={isRightInspectorOpen}
            onClose={() => setIsRightInspectorOpen(false)}
            worldBuilding={activeWorldBuilding}
            persona={activePersona}
            onUpdateWorldBuilding={(wb) => setActiveWorldBuilding(wb)}
            onUpdatePersona={(p) => setActivePersona(p)}
          />
        </div>
      )}

      {/* Modals & Flow Controllers */}
      <PreStartModal
        isOpen={isPreStartOpen}
        onClose={() => setIsPreStartOpen(false)}
        scenario={preStartScenario}
        onStartGame={handleStartGame}
      />

      <ScenarioBuilder
        key={builderInitialScenario ? builderInitialScenario.meta.id : 'create-new-scenario'}
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        initialScenario={builderInitialScenario}
        onSaveSuccess={fetchScenarios}
      />

      <ScenarioWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        apiKey={apiKey}
        onExportToBuilder={(scenario) => {
          setBuilderInitialScenario(scenario);
          setIsBuilderOpen(true);
        }}
        onStartPlay={(scenario) => {
          handleOpenPlayFlow(scenario);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        temperature={temperature}
        onSaveTemperature={handleSaveTemperature}
        maxTokens={maxTokens}
        onSaveMaxTokens={handleSaveMaxTokens}
        onModelsFetched={setAvailableModels}
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
