'use client';

import React from 'react';
import {
  X,
  Search,
  BookOpen,
  Layers,
  Terminal,
  UserCheck,
  Upload,
  Cpu,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface DocsSection {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  keywords: string[];
  content: React.ReactNode;
}

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsModal({ isOpen, onClose }: DocsModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSectionId, setActiveSectionId] = React.useState('overview');

  const sections: DocsSection[] = [
    {
      id: 'overview',
      title: '1. Overview & Core Philosophy',
      category: 'Getting Started',
      icon: BookOpen,
      keywords: ['overview', 'philosophy', 'local-first', 'privacy', '12 blocks', 'dreamgen', 'story engine'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
            <h4 className="font-bold text-sm flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              Welcome to DreamWeaver Story Engine
            </h4>
            <p>
              DreamWeaver is a 100% privacy-first, local web novel and interactive roleplay story engine inspired by DreamGen and classic text adventures.
            </p>
          </div>

          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">What Makes DreamWeaver Different?</h3>
          <p>
            Standard chat AI applications (like generic ChatGPT interfaces) treat interactions as unstructured message streams. As conversations grow longer, the AI forgets character traits, world rules, and narrative constraints.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">Standard AI Chat</span>
              <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                <li>Unstructured context overflow</li>
                <li>Forgets NPC personalities quickly</li>
                <li>Inconsistent narrative tone & perspective</li>
                <li>Generic fallback responses</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#090a0f] border border-amber-500/30 space-y-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">DreamWeaver 12-Block Engine</span>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                <li>Deterministic 12-Block prompt compiler</li>
                <li>Strict speaker identity attribution</li>
                <li>Dynamic NPC discovery & summoning</li>
                <li>CYOA Custom Objects & Location grounding</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'building-blocks',
      title: '2. The 12 Building Blocks Engine',
      category: 'Worldbuilding',
      icon: Layers,
      keywords: ['building blocks', 'setting', 'plot', 'style', 'narrator', 'history', 'personas', 'objects', 'locations', 'examples', 'private notes'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">The 12 Narrative Building Blocks</h3>
          <p>
            DreamWeaver compiles 12 specialized blocks into a cohesive prompt architecture before every AI generation turn:
          </p>

          <div className="space-y-3 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-amber-400 font-bold">1. Scenario Meta (Title & Description)</div>
              <div className="text-slate-400">High-level identity, genre categories, and cover artwork context.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-cyan-400 font-bold">2. Setting & Worldbuilding</div>
              <div className="text-slate-400">Lore rules, magic systems, technology level, factions, and physical environment.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-purple-400 font-bold">3. Plot & Scene Premise</div>
              <div className="text-slate-400">Immediate objectives, plot hooks, active conflicts, and narrative directives.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-emerald-400 font-bold">4. Style & Perspective</div>
              <div className="text-slate-400">Writing voice guidelines (e.g. "2nd-person present POV, evocative prose").</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-amber-400 font-bold">5. Narrator Directives</div>
              <div className="text-slate-400">Game Master rules (e.g. "Describe sensory details, prompt for player actions").</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-sky-400 font-bold">6. History & Backstory</div>
              <div className="text-slate-400">Recap of past chapters, immediate backstory, and previous events.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-rose-400 font-bold">7. Player Personas</div>
              <div className="text-slate-400">Character profile of the active protagonist (traits, appearance, equipment).</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-indigo-400 font-bold">8. Scenario NPCs & Companions</div>
              <div className="text-slate-400">Full profiles and opening dialogue lines for secondary characters.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-emerald-400 font-bold">9. Grounding Locations</div>
              <div className="text-slate-400">Architectural features, climate, entry points, and spatial landmarks.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-purple-400 font-bold">10. CYOA Custom Objects</div>
              <div className="text-slate-400">Items, status effects, and trigger mechanics active during gameplay.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-cyan-400 font-bold">11. Reference Examples (Few-Shot)</div>
              <div className="text-slate-400">Multi-turn dialogue samples demonstrating desired response formatting.</div>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="text-slate-400 font-bold">12. Private Notes</div>
              <div className="text-slate-400">Author outlines kept strictly local and never sent in AI prompts.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'commands',
      title: '3. System Commands Reference',
      category: 'Gameplay & Controls',
      icon: Terminal,
      keywords: ['commands', 'slash commands', '/start', '/summon', '/random', 'continue', 'turn controls'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Slash Commands & Control Dock</h3>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">/Start</code>
                <span className="text-slate-400 font-medium">— Trigger Initial Prologue</span>
              </div>
              <p className="text-slate-300">
                Generates the opening scene based on the active scenario setting, opening message, and persona.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">/summon [Character Name]</code>
                <span className="text-slate-400 font-medium">— Summon NPC into Scene</span>
              </div>
              <p className="text-slate-300">
                Dynamically introduces an NPC into the narrative. Example: <code className="text-cyan-300">/summon Kakashi Hatake</code> will switch the turn selector to Kakashi and generate their entering dialogue.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">/Random + [guidance]</code>
                <span className="text-slate-400 font-medium">— Procedural Story Event</span>
              </div>
              <p className="text-slate-300">
                Triggers a randomized twist or encounter guided by your prompt string.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">Continue Button (▶)</code>
                <span className="text-slate-400 font-medium">— Advance Story Pacing</span>
              </div>
              <p className="text-slate-300">
                Sends a continuation turn to the AI model without requiring user text input.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'turns',
      title: '4. Turn Dynamics & Speaker Identity',
      category: 'Narrative Engine',
      icon: UserCheck,
      keywords: ['turn', 'speaker', 'persona', 'narrator', 'auto switch', 'identity'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Turn Selector & Identity Engine</h3>
          <p>
            The Turn Selector directly above the input box governs who is taking action in the current turn.
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d]">
              <span className="text-cyan-400 font-bold">Turn: [Your Name]</span>
              <p className="text-slate-400 text-[11px] pt-1">
                Represents actions or spoken lines by your active player persona.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d]">
              <span className="text-amber-400 font-bold">Turn: Narrator</span>
              <p className="text-slate-400 text-[11px] pt-1">
                Generates neutral environment descriptions, atmospheric narration, or world events.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#242b3d]">
              <span className="text-purple-400 font-bold">Turn: [NPC Name]</span>
              <p className="text-slate-400 text-[11px] pt-1">
                Prompts the AI model to respond explicitly in the voice of the selected NPC companion.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 space-y-1">
            <h4 className="font-bold text-xs">Automatic Turn Auto-Switching</h4>
            <p className="text-[11px]">
              When an NPC stream finishes generating, the active Turn selector automatically switches back to your player persona so you are ready to respond immediately!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'importer',
      title: '5. Scenario Creator & World-Gen JSON Importer',
      category: 'Creation Studio',
      icon: Upload,
      keywords: ['import', 'json', 'world-gen', 'dreamgen', 'wizard', 'scenario builder', 'delete'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Scenario Studio & JSON Import</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-white">1. Manual Creation & AI Wizard</h4>
              <p>
                Click <strong className="text-amber-400">+ Create Scenario</strong> in the sidebar or discovery page to launch the 12-Block Scenario Studio or the procedural AI Wizard.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white">2. World-Gen & DreamGen JSON Importer</h4>
              <p>
                DreamWeaver features a deep JSON schema parser capable of importing 3rd-party scenario files:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-1 pl-2">
                <li>Supports nested schemas (<code className="text-purple-300">plot</code>, <code className="text-purple-300">setting</code>, <code className="text-purple-300">writing_style</code>, <code className="text-purple-300">characters</code>).</li>
                <li>Automatically stringifies complex objects into structured markdown sections.</li>
                <li>Extracts player personas, NPC lists, and title metadata.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white">3. Scenario Management & Safe Deletion</h4>
              <p>
                Manage your saved scenarios directly in the catalog. Clicking the <code className="text-rose-400">🗑️ Delete</code> button triggers a safety confirmation modal before removing scenario files from disk.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'providers',
      title: '6. Multi-Provider Engine & API Setup',
      category: 'API & Models',
      icon: Cpu,
      keywords: ['providers', 'gemini', 'groq', 'openrouter', 'api key', 'models', 'combobox', 'free tier', 'temperature', 'max tokens'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Multi-Provider AI Routing</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="font-bold text-amber-400">Google Gemini</div>
              <p className="text-slate-400 text-[11px]">
                Default engine supporting <code className="text-white">gemini-2.5-flash</code> and <code className="text-white">gemini-2.5-pro</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="font-bold text-emerald-400">Groq Cloud</div>
              <p className="text-slate-400 text-[11px]">
                Ultra-fast inference provider running Llama 3.3 70B and Mixtral.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="font-bold text-purple-400">OpenRouter Hub</div>
              <p className="text-slate-400 text-[11px]">
                Access hundreds of open-source models with automatic <code className="text-purple-300">[FREE]</code> tier tagging.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white">Automatic 429 Rate Limit Fallback</h4>
            <p>
              If your active provider encounters a <code className="text-amber-400">429 Rate Limit Exceeded</code> error, DreamWeaver automatically falls back to secondary configured providers to keep your story streaming without interruption!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'persistence',
      title: '7. Data Safety & Persistence',
      category: 'Storage',
      icon: ShieldCheck,
      keywords: ['persistence', 'storage', 'sqlite', 'indexeddb', 'localstorage', 'f5 refresh', 'reload'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Session State & Local Storage</h3>

          <p>
            DreamWeaver runs 100% locally. All scenarios, sessions, and chat turns are saved immediately into local databases.
          </p>

          <div className="p-4 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Page Refresh (`F5`) & Restart Safety
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Your active session ID is synchronized with <code className="text-emerald-300">localStorage</code>. Refreshing the browser or closing the window will automatically reload your active scenario, persona, and message history without data loss.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.category.toLowerCase().includes(q) ||
        sec.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl bg-[#0d0f17] border border-[#242c3f] shadow-2xl flex flex-col h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2430] bg-[#121520]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30">
              <BookOpen className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                DreamWeaver Documentation & System Guide
              </h2>
              <p className="text-xs text-slate-400">
                GitBook-style user guide, system commands, 12-block architecture & API setup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Filter Input Box */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full rounded-lg bg-[#090a0f] border border-[#262c3e] pl-9 pr-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body (Left Nav + Right Reading Container) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-72 bg-[#090a0f] border-r border-[#1f2430] p-3 overflow-y-auto space-y-1 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
              System Manual ({filteredSections.length})
            </div>

            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = sec.id === activeSection.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-[#141824] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                    <span className="truncate">{sec.title}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Right Content Reading Container */}
          <div className="flex-1 bg-[#0d0f17] overflow-y-auto p-8 space-y-6">
            <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold uppercase tracking-wider">
              <span>{activeSection.category}</span>
              <span>/</span>
              <span className="text-white">{activeSection.title}</span>
            </div>

            {activeSection.content}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#1f2430] bg-[#121520] text-xs text-slate-400">
          <span>DreamWeaver Local Engine v0.1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1f2430] text-slate-200 hover:text-white font-semibold transition-colors"
          >
            Close Guide (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
