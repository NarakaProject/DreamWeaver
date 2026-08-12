'use client';

import React from 'react';
import { WorldData, CharacterCard } from '@/lib/files/reader';
import { DbSession } from '@/lib/db';
import {
  BookOpen,
  User,
  PlusCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Trash2,
  BrainCircuit,
} from 'lucide-react';

interface SidebarProps {
  worlds: WorldData[];
  selectedWorld: WorldData | null;
  selectedCharacter: CharacterCard | null;
  sessions: DbSession[];
  activeSessionId: string | null;
  onSelectWorld: (world: WorldData) => void;
  onSelectCharacter: (char: CharacterCard) => void;
  onSelectSession: (sessionId: string) => void;
  onNewStory: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export function Sidebar({
  worlds,
  selectedWorld,
  selectedCharacter,
  sessions,
  activeSessionId,
  onSelectWorld,
  onSelectCharacter,
  onSelectSession,
  onNewStory,
  onDeleteSession,
  onOpenSettings,
  onOpenMemory,
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={`relative flex flex-col bg-[#0d0f17] border-r border-[#1a1f2c] transition-all duration-300 z-20 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1f2c]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">DreamWeaver</h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase">Local Story Engine</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181d2a] transition-colors mx-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Action: New Story */}
      <div className="p-3 border-b border-[#1a1f2c]">
        <button
          onClick={onNewStory}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-md ${
            collapsed ? 'p-2' : ''
          }`}
          title="Start New Story Session"
        >
          <PlusCircle className="w-4 h-4" />
          {!collapsed && <span>New Story Session</span>}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Worlds Selection */}
        <div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Local Worlds</span>
            </div>
          )}
          <div className="space-y-1">
            {worlds.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelectWorld(w)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-left transition-colors ${
                  selectedWorld?.id === w.id
                    ? 'bg-[#1e2538] text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-[#151924] hover:text-white'
                }`}
                title={w.name}
              >
                <Layers className="w-4 h-4 shrink-0 text-amber-400" />
                {!collapsed && <span className="truncate">{w.name}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Characters under Selected World */}
        {selectedWorld && (
          <div>
            {!collapsed && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Character Cards</span>
              </div>
            )}
            <div className="space-y-1">
              {selectedWorld.characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => onSelectCharacter(char)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-left transition-colors ${
                    selectedCharacter?.id === char.id
                      ? 'bg-[#182638] text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-[#151924] hover:text-white'
                  }`}
                  title={char.name}
                >
                  <User className="w-4 h-4 shrink-0 text-cyan-400" />
                  {!collapsed && (
                    <div className="truncate">
                      <div className="font-semibold">{char.name}</div>
                      {char.tagline && <div className="text-[10px] text-slate-400 truncate">{char.tagline}</div>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Sessions */}
        <div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Saved Story Sessions</span>
            </div>
          )}
          <div className="space-y-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-[#221c33] text-purple-300 border border-purple-500/30'
                    : 'text-slate-300 hover:bg-[#151924]'
                }`}
              >
                <button
                  onClick={() => onSelectSession(s.id)}
                  className="flex-1 text-left truncate font-medium pr-1"
                >
                  {!collapsed ? s.title : s.title.slice(0, 3)}
                </button>
                {!collapsed && (
                  <button
                    onClick={() => onDeleteSession(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#1a1f2c] space-y-1">
        <button
          onClick={onOpenMemory}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-[#181d2a] hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Memory Inspector"
        >
          <BrainCircuit className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsed && <span>Context & Memory</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-[#181d2a] hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="API Settings & Key Setup"
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          {!collapsed && <span>API Key Settings</span>}
        </button>
      </div>
    </aside>
  );
}
