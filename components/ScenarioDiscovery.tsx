'use client';

import React from 'react';
import { FullScenario } from '@/lib/scenarios/types';
import { Search, Plus, Play, Edit3, Compass, Sparkles, Tag, Layers, Upload, Trash2 } from 'lucide-react';

interface ScenarioDiscoveryProps {
  scenarios: FullScenario[];
  onPlayScenario: (scenario: FullScenario) => void;
  onEditScenario: (scenario: FullScenario) => void;
  onDeleteScenario?: (scenario: FullScenario) => void;
  onCreateScenario: () => void;
  onOpenWizard?: () => void;
  onOpenImportModal?: () => void;
}

export function ScenarioDiscovery({
  scenarios,
  onPlayScenario,
  onEditScenario,
  onDeleteScenario,
  onCreateScenario,
  onOpenWizard,
  onOpenImportModal,
}: ScenarioDiscoveryProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [showDropdown, setShowDropdown] = React.useState(false);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    scenarios.forEach((s) => set.add(s.meta.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [scenarios]);

  const filteredScenarios = React.useMemo(() => {
    return scenarios.filter((s) => {
      const matchesSearch =
        s.meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.meta.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.meta.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'All' || (s.meta.category || 'General') === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [scenarios, searchQuery, selectedCategory]);

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto space-y-8 contain-content overscroll-contain">
      {/* Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#171c2c] via-[#121520] to-[#0d0f17] border border-[#242c3f] p-8 shadow-xl overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DreamGen-Style Scenario Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Discover & Create Interactive Scenarios
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            100% Privacy-First & Local. Choose a scenario below to select your character persona, or create your own custom worldbuilding rules with CYOA objects and narrator directives.
          </p>
        </div>
      </div>

      {/* Toolbar: Search, Filter & Create Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scenarios by title, description, or tag..."
              className="w-full rounded-xl bg-[#12151e] border border-[#262c3e] pl-10 pr-4 py-2.5 text-sm text-[#e2e8f0] placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-[#12151e] text-slate-400 border border-[#262c3e] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button Dropdown */}
        <div className="relative w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Scenario</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#141824] border border-[#242b3d] shadow-2xl p-2 z-30 space-y-1 text-xs">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onCreateScenario();
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-slate-200 hover:bg-[#1f2638] hover:text-white transition-colors"
              >
                <span className="text-base">🛠️</span>
                <div>
                  <div className="font-bold text-white">Manual Creation</div>
                  <div className="text-[11px] text-slate-400">Build 12 blocks manually in editor</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onOpenWizard) onOpenWizard();
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-amber-300 hover:bg-[#1f2638] transition-colors"
              >
                <span className="text-base">🪄</span>
                <div>
                  <div className="font-bold text-amber-400">AI-Assisted Wizard</div>
                  <div className="text-[11px] text-amber-400/80">Procedural 12-block generator & studio</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onOpenImportModal) onOpenImportModal();
                }}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left text-purple-300 hover:bg-[#1f2638] transition-colors border-t border-[#1f2430] pt-2"
              >
                <Upload className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-purple-300">Import Scenario / World</div>
                  <div className="text-[11px] text-purple-400/80">Import JSON file from World-Gen or DreamGen</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Cards Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#12151e] border border-[#262c3e] space-y-3">
          <Compass className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No scenarios found</h3>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or click "Create Scenario" to build a new world.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <div
              key={scenario.meta.id}
              className="group relative rounded-2xl bg-[#12151e] border border-[#1f2430] hover:border-[#38435e] transition-all duration-200 shadow-lg flex flex-col overflow-hidden"
            >
              {/* Cover Image Header */}
              <div className="h-44 w-full bg-[#181d2a] relative overflow-hidden">
                {scenario.meta.coverImage ? (
                  <img
                    src={scenario.meta.coverImage}
                    alt={scenario.meta.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b2234] to-[#0f121b]">
                    <Layers className="w-12 h-12 text-amber-500/30" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-black/80 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                    {scenario.meta.mode || 'ROLEPLAY'}
                  </span>
                  {scenario.meta.category && (
                    <span className="px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-semibold text-slate-300 border border-slate-700">
                      {scenario.meta.category}
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditScenario(scenario)}
                    className="p-2 rounded-lg bg-black/80 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="Edit Scenario"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteScenario && (
                    <button
                      onClick={() => onDeleteScenario(scenario)}
                      className="p-2 rounded-lg bg-black/80 text-rose-400 hover:text-rose-300 border border-slate-700 transition-colors"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {scenario.meta.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {scenario.meta.description}
                  </p>

                  {/* Tags */}
                  {scenario.meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scenario.meta.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181d2a] text-[10px] text-slate-300 border border-[#262c3e]"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-[#1a1f2c] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {scenario.suggestedPersonas.length} Suggested Persona(s)
                  </span>
                  <button
                    onClick={() => onPlayScenario(scenario)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Play</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
