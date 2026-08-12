'use client';

import React from 'react';
import { FullScenario } from '@/lib/scenarios/reader';
import { BuildingBlockTooltip } from './BuildingBlockTooltip';
import {
  X,
  Sparkles,
  Wand2,
  Zap,
  Layers,
  Search,
  Play,
  Edit,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface ScenarioWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onExportToBuilder: (scenario: FullScenario) => void;
  onStartPlay: (scenario: FullScenario) => void;
  onOpenSettings: () => void;
}

const GENRE_OPTIONS = [
  'High Fantasy',
  'Cyberpunk',
  'Sci-Fi Horror',
  'Grimdark',
  'Post-Apocalyptic',
  'Slice-of-Life',
  'Mystery',
  'Romance',
  'Urban Fantasy',
  'Isekai',
  'Steampunk',
];

const TONE_OPTIONS = [
  'Atmospheric & Evocative',
  'Dark & Suspenseful',
  'Fast-Paced Action',
  'Heroic & Epic',
  'Grim & Gritty',
  'Whimsical & Melancholic',
  'Philosophical',
];

export function ScenarioWizardModal({
  isOpen,
  onClose,
  apiKey,
  onExportToBuilder,
  onStartPlay,
  onOpenSettings,
}: ScenarioWizardModalProps) {
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [creationMode, setCreationMode] = React.useState<'instant' | 'modular'>('instant');

  // Step 1 Inputs
  const [idea, setIdea] = React.useState('');
  const [genre, setGenre] = React.useState('Sci-Fi Horror');
  const [tone, setTone] = React.useState('Dark & Suspenseful');

  const [isCustomGenre, setIsCustomGenre] = React.useState(false);
  const [customGenreText, setCustomGenreText] = React.useState('');

  const [isCustomTone, setIsCustomTone] = React.useState(false);
  const [customToneText, setCustomToneText] = React.useState('');

  // Generation & Loading State
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progressPercent, setProgressPercent] = React.useState(0);
  const [progressStatus, setProgressStatus] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  // Generated Draft Scenario
  const [scenarioDraft, setScenarioDraft] = React.useState<FullScenario | null>(null);

  // Linting State
  const [isLinting, setIsLinting] = React.useState(false);
  const [lintResult, setLintResult] = React.useState<{
    score: number;
    summary: string;
    inconsistencies: string[];
    suggestions: string[];
  } | null>(null);

  if (!isOpen) return null;

  // Handle Full Scenario Generation (Mode A & B Entry)
  const handleGenerateFullScenario = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    if (!idea.trim()) {
      setErrorMsg('Please describe your scenario premise or idea.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setProgressPercent(10);
    setProgressStatus('Initializing World Designer Engine...');

    const timer1 = setTimeout(() => {
      setProgressPercent(35);
      setProgressStatus('Drafting Setting Lore & World History...');
    }, 1500);

    const timer2 = setTimeout(() => {
      setProgressPercent(65);
      setProgressStatus('Creating NPCs, Locations & CYOA Objects...');
    }, 3500);

    const timer3 = setTimeout(() => {
      setProgressPercent(85);
      setProgressStatus('Synthesizing Opening Narration Prologue...');
    }, 5500);

    try {
      const res = await fetch('/api/generate/building-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          action: 'generate-full-scenario',
          idea: idea.trim(),
          genre,
          tone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate scenario.');
      }

      setProgressPercent(100);
      setProgressStatus('Scenario Generation Complete!');
      setScenarioDraft(data.scenario);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Wizard Generation Error:', err);
      setErrorMsg(err.message || 'Generation failed. Please try again.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsGenerating(false);
    }
  };

  // Handle Granular Command Generation (/GENERATE NPC, /GENERATE LOCATION, etc.)
  const handleRunCommand = async (command: string, userNote?: string) => {
    if (!apiKey || !scenarioDraft) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate/building-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          action: 'command-generate',
          command,
          scenario: scenarioDraft,
          userPrompt: userNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Command execution failed.');

      if (command === '/GENERATE CHARACTER' && data.parsedJson) {
        setScenarioDraft((prev) => {
          if (!prev) return null;
          const updatedNPCs = [...(prev.worldBuilding.scenarioNPCs || []), data.parsedJson];
          return {
            ...prev,
            worldBuilding: { ...prev.worldBuilding, scenarioNPCs: updatedNPCs },
          };
        });
      } else if (command === '/GENERATE LOCATION' && data.parsedJson) {
        setScenarioDraft((prev) => {
          if (!prev) return null;
          const updatedLocs = [...(prev.worldBuilding.locations || []), data.parsedJson];
          return {
            ...prev,
            worldBuilding: { ...prev.worldBuilding, locations: updatedLocs },
          };
        });
      } else if (command === '/GENERATE OBJECT' && data.parsedJson) {
        setScenarioDraft((prev) => {
          if (!prev) return null;
          const updatedObjs = [...(prev.worldBuilding.objects || []), data.parsedJson];
          return {
            ...prev,
            worldBuilding: { ...prev.worldBuilding, objects: updatedObjs },
          };
        });
      } else if (command === '/COMPRESS' && data.parsedJson) {
        setScenarioDraft((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            worldBuilding: {
              ...prev.worldBuilding,
              setting: data.parsedJson.setting || prev.worldBuilding.setting,
              plot: data.parsedJson.plot || prev.worldBuilding.plot,
            },
          };
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute command.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Quality Audit (/LINT)
  const handleRunLintAudit = async () => {
    if (!apiKey || !scenarioDraft) return;

    setIsLinting(true);
    try {
      const res = await fetch('/api/generate/building-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey,
        },
        body: JSON.stringify({
          action: 'lint',
          scenario: scenarioDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lint audit failed.');

      setLintResult(data.audit);
    } catch (err: any) {
      alert(err.message || 'Audit failed.');
    } finally {
      setIsLinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 contain-content">
      <div className="w-full max-w-4xl rounded-2xl bg-[#12151e] border border-[#262c3e] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2430] bg-[#0d0f17] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Wand2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>AI Scenario Wizard Studio</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase font-mono font-bold">
                  DREAMGEN ENGINE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Procedurally generate, command-refine & audit your 12 building blocks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Stepper Navigation Bar */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-[#1f2430] bg-[#090a0f] text-xs font-semibold shrink-0">
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              currentStep === 1 ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#181d2a] border border-[#262c3e] flex items-center justify-center text-[11px]">
              1
            </span>
            <span>1. Premise & Mode</span>
          </div>

          <div className="h-0.5 w-8 bg-[#1f2430]" />

          <div
            onClick={() => scenarioDraft && setCurrentStep(2)}
            className={`flex items-center gap-2 transition-colors ${
              !scenarioDraft
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : currentStep === 2
                ? 'text-amber-400 font-bold cursor-pointer'
                : 'text-slate-500 hover:text-slate-300 cursor-pointer'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#181d2a] border border-[#262c3e] flex items-center justify-center text-[11px]">
              2
            </span>
            <span>2. Command Studio</span>
          </div>

          <div className="h-0.5 w-8 bg-[#1f2430]" />

          <div
            onClick={() => scenarioDraft && setCurrentStep(3)}
            className={`flex items-center gap-2 transition-colors ${
              !scenarioDraft
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : currentStep === 3
                ? 'text-amber-400 font-bold cursor-pointer'
                : 'text-slate-500 hover:text-slate-300 cursor-pointer'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#181d2a] border border-[#262c3e] flex items-center justify-center text-[11px]">
              3
            </span>
            <span>3. Quality Audit (/LINT)</span>
          </div>

          <div className="h-0.5 w-8 bg-[#1f2430]" />

          <div
            onClick={() => scenarioDraft && setCurrentStep(4)}
            className={`flex items-center gap-2 transition-colors ${
              !scenarioDraft
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : currentStep === 4
                ? 'text-amber-400 font-bold cursor-pointer'
                : 'text-slate-500 hover:text-slate-300 cursor-pointer'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#181d2a] border border-[#262c3e] flex items-center justify-center text-[11px]">
              4
            </span>
            <span>4. Export & Play</span>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
              <span>{errorMsg}</span>
              {!apiKey && (
                <button
                  onClick={onOpenSettings}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-black font-bold text-xs"
                >
                  Configure API Key
                </button>
              )}
            </div>
          )}

          {/* STEP 1: PREMISE, GENRE & MODE SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Creation Path Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setCreationMode('instant')}
                  className={`cursor-pointer p-4 rounded-xl border transition-all space-y-2 relative ${
                    creationMode === 'instant'
                      ? 'bg-[#1e2538] border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                      : 'bg-[#141824] border-[#242b3d] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Instant Full World Generator</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono font-bold uppercase">
                      MODE A
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Type a single premise/idea and let AI draft all 12 building blocks automatically in seconds.
                  </p>
                </div>

                <div
                  onClick={() => setCreationMode('modular')}
                  className={`cursor-pointer p-4 rounded-xl border transition-all space-y-2 relative ${
                    creationMode === 'modular'
                      ? 'bg-[#1e2538] border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                      : 'bg-[#141824] border-[#242b3d] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Modular Step-by-Step Builder</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase">
                      MODE B
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Build your scenario brick-by-brick using targeted commands (/GENERATE NPC, /GENERATE PLOT).
                  </p>
                </div>
              </div>

              {/* Premise Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white">
                  Scenario Premise / Core Idea *
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="e.g. A claustrophobic deep-sea submarine trench station flooding with icy water as unknown sonar anomalies stalk the crew..."
                  className="w-full h-28 rounded-xl bg-[#090a0f] border border-[#262c3e] p-4 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              {/* Hybrid Creatable Genre Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Select Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setIsCustomGenre(false);
                        setGenre(g);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        !isCustomGenre && genre === g
                          ? 'bg-amber-500 text-black shadow-md font-bold'
                          : 'bg-[#141824] border border-[#242b3d] text-slate-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomGenre(true);
                      if (customGenreText.trim()) setGenre(customGenreText.trim());
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isCustomGenre
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                        : 'bg-[#141824] border-[#242b3d] text-slate-400 hover:text-white'
                    }`}
                  >
                    + Custom Genre
                  </button>
                </div>

                {isCustomGenre && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      value={customGenreText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomGenreText(val);
                        setGenre(val || 'Custom Genre');
                      }}
                      placeholder="Type custom genre (e.g. Eldritch Western, Cyberpunk Noir, Space Opera)..."
                      className="w-full rounded-xl bg-[#090a0f] border border-amber-500/50 p-2.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Hybrid Creatable Tone Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Narrative Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setIsCustomTone(false);
                        setTone(t);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        !isCustomTone && tone === t
                          ? 'bg-purple-500 text-white shadow-md font-bold'
                          : 'bg-[#141824] border border-[#242b3d] text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTone(true);
                      if (customToneText.trim()) setTone(customToneText.trim());
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isCustomTone
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 font-bold'
                        : 'bg-[#141824] border-[#242b3d] text-slate-400 hover:text-white'
                    }`}
                  >
                    + Custom Tone
                  </button>
                </div>

                {isCustomTone && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      value={customToneText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomToneText(val);
                        setTone(val || 'Custom Tone');
                      }}
                      placeholder="Type custom narrative tone descriptors (e.g. Satirical & Surreal, Melancholic Cyberpunk)..."
                      className="w-full rounded-xl bg-[#090a0f] border border-purple-500/50 p-2.5 text-xs text-purple-300 focus:outline-none focus:border-purple-400 font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* Live Animated Progress Bar during Generation */}
              {isGenerating && (
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-3 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{progressStatus}</span>
                    </div>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#090a0f] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MODULAR COMMAND STUDIO */}
          {currentStep === 2 && scenarioDraft && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#1f2430] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{scenarioDraft.meta.title}</h3>
                  <p className="text-xs text-slate-400">{scenarioDraft.meta.description}</p>
                </div>
                <button
                  onClick={handleGenerateFullScenario}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-amber-300 text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate World</span>
                </button>
              </div>

              {/* Building Block Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* SETTING CARD */}
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
                  <div className="flex items-center justify-between font-bold text-amber-400">
                    <span>Setting & Worldbuilding</span>
                    <button
                      onClick={() => handleRunCommand('/GENERATE SETTING')}
                      className="text-[10px] text-cyan-300 hover:underline font-mono"
                    >
                      /GENERATE SETTING
                    </button>
                  </div>
                  <p className="text-slate-300 line-clamp-4 leading-relaxed">
                    {scenarioDraft.worldBuilding.setting}
                  </p>
                </div>

                {/* PLOT CARD */}
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
                  <div className="flex items-center justify-between font-bold text-amber-400">
                    <span>Plot & Premise</span>
                    <button
                      onClick={() => handleRunCommand('/GENERATE PLOT')}
                      className="text-[10px] text-cyan-300 hover:underline font-mono"
                    >
                      /GENERATE PLOT
                    </button>
                  </div>
                  <p className="text-slate-300 line-clamp-4 leading-relaxed">
                    {scenarioDraft.worldBuilding.plot}
                  </p>
                </div>

                {/* OPENING PROLOGUE CARD */}
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2 sm:col-span-2">
                  <div className="font-bold text-amber-400">Opening Narration Prologue</div>
                  <p className="text-slate-300 line-clamp-3 italic leading-relaxed font-mono">
                    {scenarioDraft.worldBuilding.openingMessage}
                  </p>
                </div>

                {/* NPCS CARD */}
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
                  <div className="flex items-center justify-between font-bold text-amber-400">
                    <span>NPC Companions ({scenarioDraft.worldBuilding.scenarioNPCs?.length || 0})</span>
                    <button
                      onClick={() => handleRunCommand('/GENERATE CHARACTER')}
                      className="text-[10px] text-cyan-300 hover:underline font-mono"
                    >
                      + /GENERATE NPC
                    </button>
                  </div>
                  <div className="space-y-1">
                    {scenarioDraft.worldBuilding.scenarioNPCs?.map((npc, idx) => (
                      <div key={idx} className="text-slate-300 font-semibold">
                        • {npc.name} ({npc.tagline || 'Companion'})
                      </div>
                    ))}
                  </div>
                </div>

                {/* LOCATIONS CARD */}
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-2">
                  <div className="flex items-center justify-between font-bold text-emerald-400">
                    <span>Locations ({scenarioDraft.worldBuilding.locations?.length || 0})</span>
                    <button
                      onClick={() => handleRunCommand('/GENERATE LOCATION')}
                      className="text-[10px] text-cyan-300 hover:underline font-mono"
                    >
                      + /GENERATE LOCATION
                    </button>
                  </div>
                  <div className="space-y-1">
                    {scenarioDraft.worldBuilding.locations?.map((loc, idx) => (
                      <div key={idx} className="text-slate-300 font-semibold">
                        • {loc.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: QUALITY AUDIT & OPTIMIZATION STUDIO */}
          {currentStep === 3 && scenarioDraft && (
            <div className="space-y-6 text-xs">
              {/* Badging Guidance for /LINT and /COMPRESS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <Search className="w-4 h-4" />
                    <span>🔍 /LINT Quality Audit</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Audits your 12 building blocks for missing lore links, character inconsistencies, or logic gaps.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span>⚡ /COMPRESS Optimization</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Applies Semantic Cascade Compression to shrink verbose descriptions, saving up to 40% AI context tokens.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRunLintAudit}
                  disabled={isLinting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow-md disabled:opacity-50"
                >
                  {isLinting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isLinting ? 'Auditing Scenario...' : 'Run /LINT Audit'}</span>
                </button>

                <button
                  onClick={() => handleRunCommand('/COMPRESS')}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>Execute /COMPRESS</span>
                </button>
              </div>

              {/* Audit Results Box */}
              {lintResult && (
                <div className="p-4 rounded-xl bg-[#141824] border border-[#242b3d] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#242b3d] pb-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Scenario Coherence Score:</span>
                    </div>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {lintResult.score} / 100
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{lintResult.summary}</p>

                  {lintResult.suggestions?.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-bold text-amber-400 uppercase text-[10px]">
                        Recommendations:
                      </div>
                      {lintResult.suggestions.map((s, idx) => (
                        <div key={idx} className="text-slate-300">
                          • {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: EXPORT & PLAY */}
          {currentStep === 4 && scenarioDraft && (
            <div className="space-y-6 text-center max-w-xl mx-auto py-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 inline-block">
                <Sparkles className="w-10 h-10 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{scenarioDraft.meta.title} Ready!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All 12 building blocks, opening prologue, and NPC companion data have been compiled and validated.
                </p>
              </div>

              <div className="flex justify-center gap-4 pt-2">
                <button
                  onClick={() => {
                    onExportToBuilder(scenarioDraft);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-amber-300 font-bold text-xs transition-colors shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>Open in Scenario Studio</span>
                </button>

                <button
                  onClick={() => {
                    onStartPlay(scenarioDraft);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-xl"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Launch Session Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2430] bg-[#0d0f17] shrink-0">
          <button
            onClick={() => {
              if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as any);
              else onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep === 1 && (
            <button
              onClick={handleGenerateFullScenario}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Generating World...' : '✨ Auto-Generate Full World'}</span>
            </button>
          )}

          {currentStep > 1 && currentStep < 4 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg"
            >
              Next Step
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
