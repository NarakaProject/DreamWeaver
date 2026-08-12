'use client';

import React from 'react';
import { HelpCircle, X, Sparkles } from 'lucide-react';

export type BuildingBlockType =
  | 'privateNotes'
  | 'plot'
  | 'style'
  | 'setting'
  | 'history'
  | 'persona'
  | 'characters'
  | 'locations'
  | 'objects'
  | 'narrator'
  | 'examples'
  | 'images';

interface BuildingBlockInfo {
  title: string;
  description: string;
  aiImpact: string;
  formattingTip: string;
}

export const BUILDING_BLOCK_GUIDANCE: Record<BuildingBlockType, BuildingBlockInfo> = {
  privateNotes: {
    title: '1. Private Notes',
    description: 'Confidential author notes, outlines, or secret plans for this scenario.',
    aiImpact: '🔒 Strictly hidden from Gemini. Never included in AI prompt context.',
    formattingTip: 'Use freely for personal reminders, plot twists, or scene draft ideas.',
  },
  plot: {
    title: '2. Plot & Story Premise',
    description: 'Main narrative goals, active conflicts, and open-ended scene hooks.',
    aiImpact: 'Drives the overarching direction, stakes, and narrative momentum.',
    formattingTip: 'Bullet points with clear objectives (e.g. "Recover the Sunstone before midnight").',
  },
  style: {
    title: '3. Style & Perspective',
    description: 'Writing perspective (1st/2nd/3rd person), tone, and formatting constraints.',
    aiImpact: 'Controls vocabulary, sentence rhythm, atmosphere, and POV.',
    formattingTip: 'Specify POV and tone (e.g. "2nd-person present POV. Dark, suspenseful fantasy").',
  },
  setting: {
    title: '4. Setting & Worldbuilding',
    description: 'Lore, history, magic systems, tech level, and social structures.',
    aiImpact: 'Provides environmental rules, atmospheric details, and world constraints.',
    formattingTip: 'Summarize key faction lore, ambient weather, and spatial environment.',
  },
  history: {
    title: '5. History & Backstory',
    description: 'Recap of previous chapters or immediate backstory leading into this turn.',
    aiImpact: 'Ensures continuity with prior events and established character actions.',
    formattingTip: 'Keep concise recaps of major turning points in past chapters.',
  },
  persona: {
    title: '6. Your Persona (Player Identity)',
    description: 'The protagonist character controlled strictly by the user.',
    aiImpact: 'Defines your name, traits, and background. AI NEVER roleplays as this character.',
    formattingTip: 'Define unique skills, motives, and avatar portrait URL.',
  },
  characters: {
    title: '7. Characters & NPCs',
    description: 'Companions, allies, and antagonists belonging to the world.',
    aiImpact: 'Allows AI to roleplay as these specific characters with distinct voices.',
    formattingTip: 'Provide avatar image, personality traits, and first speaking message.',
  },
  locations: {
    title: '8. Locations & Spatial Grounding',
    description: 'Key places and architectural settings in the active scene.',
    aiImpact: 'Helps Gemini place characters accurately within room bounds and landmarks.',
    formattingTip: 'Define specific areas (e.g. "The Citadel Vault - heavy iron doors, glowing runes").',
  },
  objects: {
    title: '9. Objects & CYOA Status Rules',
    description: 'Key items, artifacts, debuffs, or status conditions.',
    aiImpact: 'Enforces interactive mechanics (e.g. "Holding Sunstone illuminates dark rooms").',
    formattingTip: 'Include trigger rules describing item effects or status changes.',
  },
  narrator: {
    title: '10. Narrator Directives',
    description: 'Game Master rules for pacing, CYOA mechanics, and scene framing.',
    aiImpact: 'Guides how the AI manages suspense, sensory descriptions, and scene shifts.',
    formattingTip: 'Direct GM behavior (e.g. "Maintain high tension, react dynamically to actions").',
  },
  examples: {
    title: '11. Few-Shot Reference Examples',
    description: 'Sample user and model turns demonstrating ideal narrative style.',
    aiImpact: 'Teaches Gemini exact dialogue formatting and prose patterns via few-shot learning.',
    formattingTip: 'Provide 1-2 exemplary turn pairs showing formatting standards.',
  },
  images: {
    title: '12. Images & Cover Art',
    description: 'Visual media assets for cover art and scene backgrounds.',
    aiImpact: 'Enhances visual UI immersion for cards and background rendering.',
    formattingTip: 'Provide URL or local file path to hero art assets.',
  },
};

interface TooltipProps {
  blockKey: BuildingBlockType;
}

export function BuildingBlockTooltip({ blockKey }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const info = BUILDING_BLOCK_GUIDANCE[blockKey];

  if (!info) return null;

  return (
    <div className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="p-0.5 rounded-full text-slate-400 hover:text-amber-400 transition-colors focus:outline-none"
        title="View Building Block Guidance"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute left-6 top-0 z-50 w-72 p-3.5 rounded-xl bg-[#191d29] border border-[#2a3142] shadow-2xl text-xs space-y-2 font-normal text-left">
          <div className="flex items-center justify-between border-b border-[#262c3e] pb-1.5 font-bold text-amber-400">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{info.title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-slate-200">{info.description}</p>

          <div className="p-2 rounded-lg bg-[#12151e] border border-[#1f2430] space-y-1">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              AI Prompt Impact
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{info.aiImpact}</p>
          </div>

          <div className="p-2 rounded-lg bg-[#12151e] border border-[#1f2430] space-y-1">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Formatting Advice
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{info.formattingTip}</p>
          </div>
        </div>
      )}
    </div>
  );
}
