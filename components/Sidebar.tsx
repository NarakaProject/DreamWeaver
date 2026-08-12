'use client';

import React from 'react';
import { FullScenario, PersonaTemplate } from '@/lib/scenarios/types';
import { DbSession } from '@/lib/db';
import {
  Home,
  Gamepad2,
  BookOpen,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Trash2,
  BrainCircuit,
  User,
  PlusCircle,
  Upload,
} from 'lucide-react';

export type SidebarNavView = 'discovery' | 'play' | 'scenarios' | 'saved_sessions';

export function formatSessionTitle(title: string): string {
  if (!title) return 'Untitled Session';
  // Re-format legacy persona-first titles like "[Male / Other] USER (Naraka) (Naruto)" into "Naruto ([Male / Other] USER...)"
  const bracketMatch = title.match(/^(\[[^\]]+\][^(]+(?:\([^)]+\))?)\s*\(([^)]+)\)$/);
  if (bracketMatch) {
    const personaPart = bracketMatch[1].trim();
    const scenarioPart = bracketMatch[2].trim();
    return `${scenarioPart} (${personaPart})`;
  }
  return title;
}

interface SidebarProps {
  currentView: SidebarNavView;
  onNavigate: (view: SidebarNavView) => void;
  scenarios: FullScenario[];
  activeScenario: FullScenario | null;
  activePersona: PersonaTemplate | null;
  sessions: DbSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateScenario: () => void;
  onOpenWizard?: () => void;
  onOpenImportModal?: () => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  scenarios,
  activeScenario,
  activePersona,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateScenario,
  onOpenWizard,
  onOpenImportModal,
  onOpenSettings,
  onOpenMemory,
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [sessionSearch, setSessionSearch] = React.useState('');
  const [showCreateDropdown, setShowCreateDropdown] = React.useState(false);

  const filteredSessions = React.useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const term = sessionSearch.toLowerCase();
    return sessions.filter((s) => {
      const formatted = formatSessionTitle(s.title);
      return (
        s.title.toLowerCase().includes(term) ||
        formatted.toLowerCase().includes(term)
      );
    });
  }, [sessions, sessionSearch]);

  return (
    <aside
      className={`relative flex flex-col bg-[#0d0f17] border-r border-[#1a1f2c] transition-all duration-300 z-20 contain-content overscroll-contain ${
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

      {/* Main Navigation Links */}
      <div className="p-3 border-b border-[#1a1f2c] space-y-1">
        <button
          onClick={() => onNavigate('discovery')}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
            currentView === 'discovery'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-300 hover:bg-[#151924] hover:text-white'
          }`}
          title="Discovery / Home"
        >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Discovery & Home</span>}
        </button>

        {activeSessionId && (
          <button
            onClick={() => onNavigate('play')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
              currentView === 'play'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-300 hover:bg-[#151924] hover:text-white'
            }`}
            title="Active Session"
          >
            <Gamepad2 className="w-4 h-4 shrink-0 text-cyan-400" />
            {!collapsed && <span>Active Session</span>}
          </button>
        )}

        <button
          onClick={() => onNavigate('scenarios')}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
            currentView === 'scenarios'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-300 hover:bg-[#151924] hover:text-white'
          }`}
          title="Your Scenarios"
        >
          <BookOpen className="w-4 h-4 shrink-0 text-purple-400" />
          {!collapsed && <span>Your Scenarios</span>}
        </button>

        <button
          onClick={() => onNavigate('saved_sessions')}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
            currentView === 'saved_sessions'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-slate-300 hover:bg-[#151924] hover:text-white'
          }`}
          title="Saved Sessions"
        >
          <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
          {!collapsed && <span>Saved Sessions ({sessions.length})</span>}
        </button>
      </div>

      {/* Dynamic Scoped Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Active Session Scoped Info */}
        {currentView === 'play' && activeScenario && !collapsed && (
          <div className="p-3 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2.5 text-xs">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Active Game Session
            </div>
            <div>
              <div className="font-bold text-white truncate">{activeScenario.meta.title}</div>
              <div className="text-[11px] text-slate-400">{activeScenario.meta.category}</div>
            </div>
            {activePersona && (
              <div className="pt-2 border-t border-[#1f2430] flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-cyan-300 truncate">{activePersona.name}</div>
                  <div className="text-[10px] text-slate-400">Player Persona</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Sessions View List */}
        {currentView === 'saved_sessions' && (
          <div className="space-y-3">
            {!collapsed && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Filter sessions..."
                  className="w-full rounded-lg bg-[#12151e] border border-[#262c3e] pl-8 pr-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
            <div className="space-y-1">
              {filteredSessions.map((s) => {
                const formattedTitle = formatSessionTitle(s.title);
                return (
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
                      title={formattedTitle}
                    >
                      {!collapsed ? formattedTitle : formattedTitle.slice(0, 3)}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Scenarios Manager List */}
        {currentView === 'scenarios' && (
          <div className="space-y-3">
            {!collapsed && (
              <div className="relative">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold text-xs transition-all hover:bg-amber-500/30"
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create New Scenario</span>
                  </div>
                  <span className="text-[10px]">▼</span>
                </button>

                {showCreateDropdown && (
                  <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl bg-[#141824] border border-[#242b3d] shadow-2xl p-1.5 z-30 space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setShowCreateDropdown(false);
                        onCreateScenario();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-slate-200 hover:bg-[#1f2638] hover:text-white transition-colors"
                    >
                      <span>🛠️</span>
                      <div>
                        <div className="font-bold">Manual Creation</div>
                        <div className="text-[10px] text-slate-400">Build 12 blocks manually</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowCreateDropdown(false);
                        if (onOpenWizard) onOpenWizard();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-amber-300 hover:bg-[#1f2638] transition-colors"
                    >
                      <span>🪄</span>
                      <div>
                        <div className="font-bold">AI-Assisted Wizard</div>
                        <div className="text-[10px] text-amber-400/80">Procedural 12-block generator</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowCreateDropdown(false);
                        if (onOpenImportModal) onOpenImportModal();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-purple-300 hover:bg-[#1f2638] transition-colors border-t border-[#1f2430] pt-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <div>
                        <div className="font-bold">Import Scenario / World</div>
                        <div className="text-[10px] text-purple-400/80">Import World-Gen / DreamGen JSON</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1">
              {scenarios.map((sc) => (
                <div
                  key={sc.meta.id}
                  className="p-2 rounded-lg text-xs text-slate-300 hover:bg-[#151924] transition-colors truncate font-medium"
                >
                  {!collapsed ? sc.meta.title : sc.meta.title.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#1a1f2c] space-y-1">
        <button
          onClick={onOpenMemory}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-[#181d2a] hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Memory & Context Inspector"
        >
          <BrainCircuit className="w-4 h-4 text-emerald-400 shrink-0" />
          {!collapsed && <span>Context Inspector</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-[#181d2a] hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="API & Advanced Settings"
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          {!collapsed && <span>API Settings</span>}
        </button>
      </div>
    </aside>
  );
}
