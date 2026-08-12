'use client';

import React from 'react';
import { FullScenario, CustomObject, LocationItem, PromptExample, PersonaTemplate } from '@/lib/scenarios/reader';
import { BuildingBlockTooltip } from './BuildingBlockTooltip';
import { ImagePickerWithPreview } from './ImagePickerWithPreview';
import { X, Plus, Trash2, Save, Sparkles, BookOpen, Layers, User, MapPin, Package, FileText } from 'lucide-react';

interface ScenarioBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialScenario?: FullScenario | null;
  onSaveSuccess?: () => void;
}

export function ScenarioBuilder({
  isOpen,
  onClose,
  initialScenario,
  onSaveSuccess,
}: ScenarioBuilderProps) {
  const [activeTab, setActiveTab] = React.useState<
    'meta' | 'narrative' | 'personas' | 'npcs' | 'locations' | 'objects' | 'examples' | 'notes'
  >('meta');

  // Meta State
  const [id, setId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('High Fantasy');
  const [tagsStr, setTagsStr] = React.useState('');
  const [coverImage, setCoverImage] = React.useState('');

  // 12 Building Blocks State
  const [setting, setSetting] = React.useState('');
  const [plot, setPlot] = React.useState('');
  const [style, setStyle] = React.useState('');
  const [narrator, setNarrator] = React.useState('');
  const [openingMessage, setOpeningMessage] = React.useState('');
  const [history, setHistory] = React.useState('');
  const [privateNotes, setPrivateNotes] = React.useState('');

  // Collections
  const [personas, setPersonas] = React.useState<PersonaTemplate[]>([]);
  const [scenarioNPCs, setScenarioNPCs] = React.useState<PersonaTemplate[]>([]);
  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [objects, setObjects] = React.useState<CustomObject[]>([]);
  const [examples, setExamples] = React.useState<PromptExample[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (initialScenario) {
      setId(initialScenario.meta.id);
      setTitle(initialScenario.meta.title);
      setDescription(initialScenario.meta.description);
      setCategory(initialScenario.meta.category || 'High Fantasy');
      setTagsStr((initialScenario.meta.tags || []).join(', '));
      setCoverImage(initialScenario.meta.coverImage || '');

      setSetting(initialScenario.worldBuilding.setting || '');
      setPlot(initialScenario.worldBuilding.plot || '');
      setStyle(initialScenario.worldBuilding.style || '');
      setNarrator(initialScenario.worldBuilding.narrator || '');
      setOpeningMessage(initialScenario.worldBuilding.openingMessage || '');
      setHistory(initialScenario.worldBuilding.history || '');
      setPrivateNotes(initialScenario.worldBuilding.privateNotes || '');

      setPersonas(initialScenario.suggestedPersonas || []);
      setScenarioNPCs(initialScenario.worldBuilding.scenarioNPCs || []);
      setLocations(initialScenario.worldBuilding.locations || []);
      setObjects(initialScenario.worldBuilding.objects || []);
      setExamples(initialScenario.worldBuilding.examples || []);
    } else {
      setId(`scenario-${Date.now()}`);
      setTitle('');
      setDescription('');
      setCategory('High Fantasy');
      setTagsStr('');
      setCoverImage('');

      setSetting('');
      setPlot('');
      setStyle('Atmospheric, evocative roleplay prose. 2nd-person present POV.');
      setNarrator('Act as an interactive RPG Game Master. Maintain tension and react dynamically to player choices.');
      setOpeningMessage('');
      setHistory('');
      setPrivateNotes('');

      setPersonas([
        {
          id: `persona-${Date.now()}`,
          name: 'Hero',
          tagline: 'Protagonist',
          personality: 'Brave and observant player character.',
          avatar: '',
          firstMessage: '',
        },
      ]);
      setScenarioNPCs([]);
      setLocations([]);
      setObjects([]);
      setExamples([]);
    }
  }, [initialScenario, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Scenario Title is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const fullScenario: FullScenario = {
      meta: {
        id: id || `scenario-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
        mode: 'roleplay',
        coverImage,
      },
      worldBuilding: {
        setting,
        plot,
        style,
        narrator,
        openingMessage,
        history,
        privateNotes,
        objects,
        locations,
        examples,
        scenarioNPCs,
        images: { coverImage },
      },
      suggestedPersonas: personas,
    };

    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullScenario),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save scenario');
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save scenario to disk.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content">
      <div className="w-full max-w-4xl rounded-2xl bg-[#12151e] border border-[#262c3e] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2430] bg-[#0d0f17]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialScenario ? 'Edit Scenario' : 'Scenario Studio (12 Building Blocks)'}
              </h2>
              <p className="text-xs text-slate-400">Configure lore, NPCs, locations, objects & GM rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-[#1f2430] bg-[#0d0f17] overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('meta')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'meta'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Meta & Cover</span>
          </button>

          <button
            onClick={() => setActiveTab('narrative')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'narrative'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lore & Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('personas')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'personas'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Your Persona ({personas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('npcs')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'npcs'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>NPCs ({scenarioNPCs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'locations'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('objects')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'objects'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Objects ({objects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Private Notes</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: META & IMAGES */}
          {activeTab === 'meta' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Scenario Title
                  <BuildingBlockTooltip blockKey="plot" />
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Shadows Over Eldoria"
                  className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief synopsis of the scenario..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] px-4 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center">
                  <span className="font-semibold text-slate-300">Cover Art Image</span>
                  <BuildingBlockTooltip blockKey="images" />
                </div>
                <ImagePickerWithPreview
                  value={coverImage}
                  onChange={setCoverImage}
                  placeholder="https://... or click Upload File"
                />
              </div>
            </div>
          )}

          {/* TAB 2: NARRATIVE LORE & RULES */}
          {activeTab === 'narrative' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-amber-400 flex items-center">
                  Scenario Opening Narration / Prologue
                  <BuildingBlockTooltip blockKey="history" />
                </label>
                <p className="text-[11px] text-slate-400">
                  Atmospheric opening prologue introducing setting, backstory, and immediate call to action. Supports <code className="text-amber-300">{"{{user}}"}</code> placeholder.
                </p>
                <textarea
                  value={openingMessage}
                  onChange={(e) => setOpeningMessage(e.target.value)}
                  placeholder="*Centuries ago, the Obsidian Spire cracked open...* (Use {{user}} for player name)"
                  className="w-full h-32 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-amber-400 flex items-center">
                  Setting & Worldbuilding
                  <BuildingBlockTooltip blockKey="setting" />
                </label>
                <textarea
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  placeholder="World lore, magic systems, tech level..."
                  className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-amber-400 flex items-center">
                  Plot & Scene Premise
                  <BuildingBlockTooltip blockKey="plot" />
                </label>
                <textarea
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder="Main objective and plot hooks..."
                  className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-amber-400 flex items-center">
                    Style & Perspective
                    <BuildingBlockTooltip blockKey="style" />
                  </label>
                  <textarea
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="2nd-person present POV, dark prose..."
                    className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-amber-400 flex items-center">
                    Narrator Directives
                    <BuildingBlockTooltip blockKey="narrator" />
                  </label>
                  <textarea
                    value={narrator}
                    onChange={(e) => setNarrator(e.target.value)}
                    placeholder="Game Master rules and pacing directives..."
                    className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-amber-400 flex items-center">
                  History & Backstory
                  <BuildingBlockTooltip blockKey="history" />
                </label>
                <textarea
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Recap of past chapters or immediate backstory..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: YOUR PERSONA */}
          {activeTab === 'personas' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-cyan-400 uppercase tracking-wider flex items-center">
                  Player Personas
                  <BuildingBlockTooltip blockKey="persona" />
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setPersonas((prev) => [
                      ...prev,
                      {
                        id: `persona-${Date.now()}`,
                        name: 'New Hero',
                        tagline: 'Protagonist',
                        personality: 'Brave and inquisitive.',
                        avatar: '',
                        firstMessage: '',
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Persona</span>
                </button>
              </div>

              {personas.map((p, idx) => (
                <div key={p.id || idx} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Persona #{idx + 1}</span>
                    {personas.length > 1 && (
                      <button
                        onClick={() => setPersonas((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...personas];
                        updated[idx].name = e.target.value;
                        setPersonas(updated);
                      }}
                      placeholder="Name"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={p.tagline || ''}
                      onChange={(e) => {
                        const updated = [...personas];
                        updated[idx].tagline = e.target.value;
                        setPersonas(updated);
                      }}
                      placeholder="Tagline / Class"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white"
                    />
                  </div>

                  <ImagePickerWithPreview
                    label="Persona Avatar Portrait"
                    value={p.avatar || ''}
                    onChange={(url) => {
                      const updated = [...personas];
                      updated[idx].avatar = url;
                      setPersonas(updated);
                    }}
                    placeholder="https://... or upload avatar"
                  />

                  <textarea
                    value={p.personality}
                    onChange={(e) => {
                      const updated = [...personas];
                      updated[idx].personality = e.target.value;
                      setPersonas(updated);
                    }}
                    placeholder="Personality & Traits..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: NPCS & COMPANIONS */}
          {activeTab === 'npcs' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  Scenario NPCs & Companions
                  <BuildingBlockTooltip blockKey="characters" />
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setScenarioNPCs((prev) => [
                      ...prev,
                      {
                        id: `npc-${Date.now()}`,
                        name: 'New Companion',
                        tagline: 'Ally',
                        personality: 'Loyal and perceptive companion.',
                        avatar: '',
                        firstMessage: '"Greetings," they say.',
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add NPC</span>
                </button>
              </div>

              {scenarioNPCs.map((npc, idx) => (
                <div key={npc.id || idx} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">NPC #{idx + 1}</span>
                    <button
                      onClick={() => setScenarioNPCs((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={npc.name}
                      onChange={(e) => {
                        const updated = [...scenarioNPCs];
                        updated[idx].name = e.target.value;
                        setScenarioNPCs(updated);
                      }}
                      placeholder="NPC Name"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={npc.tagline || ''}
                      onChange={(e) => {
                        const updated = [...scenarioNPCs];
                        updated[idx].tagline = e.target.value;
                        setScenarioNPCs(updated);
                      }}
                      placeholder="Tagline / Title"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white"
                    />
                  </div>

                  <ImagePickerWithPreview
                    label="NPC Avatar Portrait"
                    value={npc.avatar || ''}
                    onChange={(url) => {
                      const updated = [...scenarioNPCs];
                      updated[idx].avatar = url;
                      setScenarioNPCs(updated);
                    }}
                    placeholder="https://... or upload NPC portrait"
                  />

                  <textarea
                    value={npc.personality}
                    onChange={(e) => {
                      const updated = [...scenarioNPCs];
                      updated[idx].personality = e.target.value;
                      setScenarioNPCs(updated);
                    }}
                    placeholder="NPC Personality & Motivations..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white resize-none"
                  />
                  <textarea
                    value={npc.firstMessage}
                    onChange={(e) => {
                      const updated = [...scenarioNPCs];
                      updated[idx].firstMessage = e.target.value;
                      setScenarioNPCs(updated);
                    }}
                    placeholder="First Speaking Opening Message..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-amber-300/90 resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: LOCATIONS */}
          {activeTab === 'locations' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                  Grounding Locations
                  <BuildingBlockTooltip blockKey="locations" />
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setLocations((prev) => [
                      ...prev,
                      {
                        id: `loc-${Date.now()}`,
                        name: 'New Area',
                        description: 'Architectural details and ambient setting.',
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>
              </div>

              {locations.map((loc, idx) => (
                <div key={loc.id || idx} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => {
                        const updated = [...locations];
                        updated[idx].name = e.target.value;
                        setLocations(updated);
                      }}
                      placeholder="Location Name"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs font-bold text-white flex-1 mr-3"
                    />
                    <button
                      onClick={() => setLocations((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={loc.description}
                    onChange={(e) => {
                      const updated = [...locations];
                      updated[idx].description = e.target.value;
                      setLocations(updated);
                    }}
                    placeholder="Environmental features, ambient noise, entry points..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: OBJECTS */}
          {activeTab === 'objects' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-purple-400 uppercase tracking-wider flex items-center">
                  CYOA Custom Objects & Status Rules
                  <BuildingBlockTooltip blockKey="objects" />
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setObjects((prev) => [
                      ...prev,
                      {
                        id: `obj-${Date.now()}`,
                        name: 'New Item',
                        description: 'Artifact description',
                        trigger_rule: 'Effect rule when used or equipped.',
                      },
                    ])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Object</span>
                </button>
              </div>

              {objects.map((obj, idx) => (
                <div key={obj.id || idx} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => {
                        const updated = [...objects];
                        updated[idx].name = e.target.value;
                        setObjects(updated);
                      }}
                      placeholder="Item Name"
                      className="rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs font-bold text-white flex-1 mr-3"
                    />
                    <button
                      onClick={() => setObjects((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={obj.description}
                    onChange={(e) => {
                      const updated = [...objects];
                      updated[idx].description = e.target.value;
                      setObjects(updated);
                    }}
                    placeholder="Description"
                    className="w-full rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={obj.trigger_rule || ''}
                    onChange={(e) => {
                      const updated = [...objects];
                      updated[idx].trigger_rule = e.target.value;
                      setObjects(updated);
                    }}
                    placeholder="Trigger rule / debuff mechanic (optional)"
                    className="w-full rounded-lg bg-[#12151e] border border-[#262c3e] p-2 text-xs text-purple-300 font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 7: PRIVATE NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#38bdf8] flex items-center">
                  Private Author Notes
                  <BuildingBlockTooltip blockKey="privateNotes" />
                </label>
                <p className="text-[11px] text-slate-400">
                  Secret outlines and draft ideas. This section is strictly <strong>hidden from Gemini</strong> and will never be sent in API prompts.
                </p>
                <textarea
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Keep your plot secrets, solution hints, or personal notes here..."
                  className="w-full h-64 rounded-xl bg-[#090a0f] border border-[#262c3e] p-4 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#38bdf8] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2430] bg-[#0d0f17]">
          <div className="text-xs text-slate-400">All 12 Building Blocks validated</div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Scenario'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
