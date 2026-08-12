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
  ChevronDown,
  Info,
  CheckCircle,
  HelpCircle,
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
  const [expandedBlockId, setExpandedBlockId] = React.useState<number | null>(11);

  const blockAccordions = [
    {
      id: 1,
      name: '1. Meta & Scenario Title',
      badge: 'Identity',
      color: 'text-amber-400 border-amber-500/30',
      summary: 'Sets the scenario title, category, description, and cover artwork.',
      explanation: 'Defines the top-level identity of your story world in the catalog and prompt headers.',
      guidelines: 'Use distinct, evocative titles and precise tags (e.g. "Cyberpunk", "Anime", "Dark Fantasy").',
      example: 'Title: "Naruto: Hidden Leaf Era" | Category: "Anime Fantasy" | Tags: ["Ninja", "Action", "Interactive"]',
    },
    {
      id: 2,
      name: '2. Setting & Worldbuilding',
      badge: 'Lore',
      color: 'text-cyan-400 border-cyan-500/30',
      summary: 'Establishes physical laws, magic systems, technology tier, and factions.',
      explanation: 'Provides the foundational rules of reality that the AI must respect throughout all narrative turns.',
      guidelines: 'State hard rules clearly. Define magic limits, technological limits, and political climate.',
      example: '"Konohagakure village under the Third Hokage. Shinobi manipulate chakra channels to cast ninjutsu. Chakra is finite and requires stamina."',
    },
    {
      id: 3,
      name: '3. Plot & Scene Premise',
      badge: 'Objectives',
      color: 'text-purple-400 border-purple-500/30',
      summary: 'Defines active plot hooks, immediate objectives, and main conflicts.',
      explanation: 'Guides the AI narrator on what the current scene is about and what stakes are at play.',
      guidelines: 'Focus on active tension and immediate goals. Avoid resolving the outcome beforehand.',
      example: '"Investigate reports of rogue ninjas lurking near the Anbu scroll archives before dawn."',
    },
    {
      id: 4,
      name: '4. Style & Perspective',
      badge: 'Prose Style',
      color: 'text-emerald-400 border-emerald-500/30',
      summary: 'Controls narrative voice, POV (2nd/3rd person), prose pacing, and sensory depth.',
      explanation: 'Directs how the AI formats text, describes action, and maintains narrative mood.',
      guidelines: 'Be specific about perspective (e.g. "Use 2nd-person present POV: You move through the shadows").',
      example: '"Fast-paced, cinematic action prose. 2nd-person present POV. Emphasize sound and motion."',
    },
    {
      id: 5,
      name: '5. Narrator Directives',
      badge: 'GM Rules',
      color: 'text-amber-400 border-amber-500/30',
      summary: 'Provides instructions for the AI Game Master on turn pacing and scene boundaries.',
      explanation: 'Acts as system instructions telling the AI how to behave as a game master.',
      guidelines: 'Instruct the AI to end turns after environmental reactions, prompting player choice.',
      example: '"Act as a reactive Game Master. Describe sensory consequences, then prompt the player for their next move."',
    },
    {
      id: 6,
      name: '6. History & Backstory',
      badge: 'Timeline',
      color: 'text-sky-400 border-sky-500/30',
      summary: 'Tracks prior chapter outcomes, past events, and immediate pre-scene lore.',
      explanation: 'Provides chronological context so the AI remembers events that occurred before the current turn.',
      guidelines: 'Summarize past events in clear bullet points or short paragraphs.',
      example: '"12 years ago, the Nine-Tails attacked Konoha. Yesterday, Team 7 graduated from the Academy."',
    },
    {
      id: 7,
      name: '7. Player Personas',
      badge: 'Protagonist',
      color: 'text-rose-400 border-rose-500/30',
      summary: 'Character profile for the active player protagonist (traits, appearance, gear).',
      explanation: 'Informs the AI who the player character is, how they speak, and what abilities they possess.',
      guidelines: 'Include distinctive traits, speech quirks, and active equipment.',
      example: 'Name: "Naruto Uzumaki" | Traits: "Loud, determined, fierce loyalty, wields Shadow Clone Jutsu."',
    },
    {
      id: 8,
      name: '8. Scenario NPCs & Companions',
      badge: 'Characters',
      color: 'text-indigo-400 border-indigo-500/30',
      summary: 'Catalog of secondary characters and companions that the AI can portray.',
      explanation: 'Gives individual profiles and voice guidelines for non-player characters in the scene.',
      guidelines: 'Define clear speech patterns, motivation, and opening dialogue lines for each NPC.',
      example: 'Name: "Kakashi Hatake" | Speech: "Laid-back, polite, reading Make-Out Paradise." | First Line: \'"Sorry I\'m late, a black cat crossed my path."\'',
    },
    {
      id: 9,
      name: '9. Grounding Locations',
      badge: 'Environment',
      color: 'text-emerald-400 border-emerald-500/30',
      summary: 'Environmental features, spatial architecture, lighting, and ambient cues.',
      explanation: 'Anchors scenes in physical space so characters don\'t float in generic voids.',
      guidelines: 'Include sensory details (smell of rain, flickering torches, echoing footsteps).',
      example: 'Name: "Hokage Archives" | Details: "Dusty scroll shelves, faint ink smell, moonlit stained-glass windows."',
    },
    {
      id: 10,
      name: '10. Custom Objects & Gameplay Rules',
      badge: 'OBJECTS',
      color: 'text-purple-400 border-purple-500/30',
      summary: 'Inventory items, status rules, key items, and conditional mechanics active in gameplay.',
      explanation: 'Manages inventory items, magical artifacts, status rules, and conditional triggers active during story turns.',
      guidelines: 'Define item names, descriptions, and trigger conditions (e.g. "Equipping Kunai enables combat actions").',
      example: 'Name: "Scroll of Seals" | Rule: "Unlocks forbidden Multi-Shadow Clone technique when opened."',
    },
    {
      id: 11,
      name: '11. Reference Examples (Few-Shot Learning)',
      badge: 'Few-Shot',
      color: 'text-cyan-400 border-cyan-500/30',
      summary: 'Multi-turn sample dialogues demonstrating desired response formatting, tone, and pacing.',
      explanation: 'Few-shot examples teach the AI by showing, not telling. By providing sample turns in Block 11, the AI mirrors the exact formatting, tone, and pacing of your examples.',
      guidelines: 'Provide 1-3 high-quality turn interactions demonstrating the exact prose depth and dialogue formatting you want.',
      example: 'User: "[Action]: I inspect the glowing seal on the vault door."\nModel: "*The paper talisman sizzles with blue chakra as your fingertips touch the wax boundary.* \\"Be careful, Naruto,\\" Kakashi warns from the shadows."',
    },
    {
      id: 12,
      name: '12. Private Author Notes',
      badge: 'Local Scratchpad',
      color: 'text-slate-400 border-slate-500/30',
      summary: 'Author scratchpad for secret plot outlines, solution hints, and draft ideas.',
      explanation: 'Keeps private notes 100% local. This block is strictly hidden from AI API requests.',
      guidelines: 'Use freely for personal outlines — it will never be sent in prompts.',
      example: '"Secret Outline: The imposter ninja is actually Kabuto in disguise."',
    },
  ];

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
            Standard chat AI applications treat interactions as unstructured message streams. As conversations grow longer, generic AI forgets character traits, world rules, and narrative constraints.
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
                <li>Custom Objects & Location grounding</li>
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
      keywords: ['building blocks', 'setting', 'plot', 'style', 'narrator', 'history', 'personas', 'objects', 'locations', 'examples', 'few-shot', 'private notes'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">The 12 Narrative Building Blocks (Interactive Guide)</h3>
          <p>
            DreamWeaver compiles 12 specialized blocks into a cohesive prompt architecture before every AI turn. Click any block below to expand detailed writing guidelines and concrete examples:
          </p>

          {/* Interactive Accordion List */}
          <div className="space-y-3 pt-1">
            {blockAccordions.map((block) => {
              const isExpanded = expandedBlockId === block.id;
              return (
                <div
                  key={block.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-[#121624] border-sky-500/50 shadow-lg'
                      : 'bg-[#090a0f] border-[#242b3d] hover:border-[#38435e]'
                  }`}
                >
                  {/* Accordion Header Bar */}
                  <button
                    type="button"
                    onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded ${block.color}`}>
                        {block.badge}
                      </span>
                      <span className="font-bold text-white text-xs truncate">
                        {block.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 shrink-0 min-w-0">
                      <span className="text-[11px] hidden sm:inline text-slate-400 truncate max-w-xs md:max-w-md">{block.summary}</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />}
                    </div>
                  </button>

                  {/* Accordion Content Body */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#1f2430] space-y-4 bg-[#0a0c14] text-xs">
                      {/* Plain English Explanation */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-sky-300 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>What This Block Controls</span>
                        </h4>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {block.explanation}
                        </p>
                      </div>

                      {/* Writing Guidelines */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Best Practices & Writing Guidelines</span>
                        </h4>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {block.guidelines}
                        </p>
                      </div>

                      {/* Deep-Dive Highlight for Block 11 (Few-Shot Examples) */}
                      {block.id === 11 && (
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 space-y-3">
                          <h4 className="font-bold text-xs text-cyan-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Deep-Dive: How Few-Shot Learning Shapes AI Quality
                          </h4>
                          <p className="text-[11px] leading-relaxed">
                            <strong>Few-Shot Prompting</strong> in plain English means <em>"teaching the AI by showing, not telling."</em> By providing 1-3 sample dialogues in Block 11, the AI mirrors your exact dialogue tags, action beat formatting, and narrative pacing!
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                            <div className="p-3 rounded-lg bg-[#090a0f] border border-rose-500/30 space-y-1">
                              <span className="text-rose-400 font-bold uppercase text-[10px]">Without Block 11 (Standard Prompt)</span>
                              <p className="text-slate-400 italic">
                                "Naruto looks around the archives. He sees old scrolls on the shelf and wonders what Kakashi will do next."
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-[#090a0f] border border-emerald-500/30 space-y-1">
                              <span className="text-emerald-400 font-bold uppercase text-[10px]">With Block 11 (Few-Shot Guided)</span>
                              <p className="text-emerald-200/90 font-mono">
                                *The paper talisman sizzles with blue chakra.* "Be careful, Naruto," Kakashi warns from the shadows.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Concrete Example */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-300">Concrete Sample Payload</h4>
                        <pre className="p-3 rounded-lg bg-[#05060a] border border-[#1f2430] font-mono text-[10px] text-amber-300/90 whitespace-pre-wrap leading-relaxed">
                          {block.example}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'commands',
      title: '3. Scenario Commands & Scripting (Optional)',
      category: 'Gameplay & Controls',
      icon: Terminal,
      keywords: ['commands', 'slash commands', '/start', '/summon', '/random', 'continue', 'turn controls', 'scripting'],
      content: (
        <div className="space-y-5 text-slate-300 leading-relaxed text-xs">
          <h3 className="text-sm font-bold text-white border-b border-[#242c3f] pb-2">Control Dock Actions vs Optional Scenario Scripts</h3>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
            <h4 className="font-bold text-xs flex items-center gap-2 text-amber-400">
              <HelpCircle className="w-4 h-4" />
              Core Engine Features vs Optional Scenario Scripts
            </h4>
            <p className="text-[11px] leading-relaxed">
              Slash commands like <code className="text-amber-300">/Start</code>, <code className="text-amber-300">/summon</code>, and <code className="text-amber-300">/Random</code> are <strong>Optional Scenario-Level Scripts</strong> defined inside <em>Narrator Directives</em>. They are primarily used in dynamic sandbox scenarios (e.g., "The Chat: Summon Anyone"). Standard stories rely on built-in Control Dock features.
            </p>
          </div>

          {/* Section 1: Built-in Core Engine Features */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-sky-400">1. Built-in Core Control Dock Actions</h4>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-cyan-400">Turn Selector Dropdown</span>
                <span className="text-[10px] text-slate-400">(Player / Narrator / NPC)</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Explicitly attributes who is taking action in the turn. The AI will strictly format its output matching the selected speaker's perspective.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">Continue Button (▶)</span>
                <span className="text-[10px] text-slate-400">(Pacing Advance)</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Advances narrative time without requiring user text input. Perfect when you want the AI narrator to continue describing the scene.
              </p>
            </div>
          </div>

          {/* Section 2: Optional Scenario Scripts */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-amber-400">2. Optional Scenario-Level Slash Commands</h4>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px]">/Start</code>
                <span className="text-slate-400 text-[11px]">— Triggers Prologue Generator</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Optional scenario script that launches the initial opening scene based on scenario settings and personas.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px]">/summon [Name]</code>
                <span className="text-slate-400 text-[11px]">— Dynamic Character Summon</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Optional scenario script to introduce any character into sandbox scenes (e.g. <code className="text-cyan-300">/summon Kakashi Hatake</code>).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#242b3d] space-y-1.5">
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-[11px]">/Random + [guidance]</code>
                <span className="text-slate-400 text-[11px]">— Randomized Twist Script</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Optional scenario trigger to roll random encounters or plot twists.
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
