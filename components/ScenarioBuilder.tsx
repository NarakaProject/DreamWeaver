'use client';

import React from 'react';
import { FullScenario, CustomObject, PersonaTemplate } from '@/lib/scenarios/reader';
import { X, Save, Plus, Trash2, Layers, BookOpen, User, Sparkles } from 'lucide-react';

interface ScenarioBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  initialScenario?: FullScenario | null;
  onSaveSuccess: () => void;
}

export function ScenarioBuilder({
  isOpen,
  onClose,
  initialScenario,
  onSaveSuccess,
}: ScenarioBuilderProps) {
  const [activeTab, setActiveTab] = React.useState<'meta' | 'building' | 'objects' | 'personas'>('meta');

  // Form State
  const [id, setId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('Fantasy');
  const [tagsStr, setTagsStr] = React.useState('');
  const [mode, setMode] = React.useState<'roleplay' | 'story'>('roleplay');
  const [coverImage, setCoverImage] = React.useState('');

  const [setting, setSetting] = React.useState('');
  const [plot, setPlot] = React.useState('');
  const [style, setStyle] = React.useState('');
  const [narrator, setNarrator] = React.useState('');

  const [objects, setObjects] = React.useState<CustomObject[]>([]);
  const [personas, setPersonas] = React.useState<PersonaTemplate[]>([]);

  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (initialScenario) {
      setId(initialScenario.meta.id);
      setTitle(initialScenario.meta.title);
      setDescription(initialScenario.meta.description);
      setCategory(initialScenario.meta.category || 'Fantasy');
      setTagsStr(initialScenario.meta.tags.join(', '));
      setMode(initialScenario.meta.mode || 'roleplay');
      setCoverImage(initialScenario.meta.coverImage || '');

      setSetting(initialScenario.worldBuilding.setting || '');
      setPlot(initialScenario.worldBuilding.plot || '');
      setStyle(initialScenario.worldBuilding.style || '');
      setNarrator(initialScenario.worldBuilding.narrator || '');

      setObjects(initialScenario.worldBuilding.objects || []);
      setPersonas(initialScenario.suggestedPersonas || []);
    } else {
      setId(`scenario-${Date.now()}`);
      setTitle('');
      setDescription('');
      setCategory('Dark Fantasy');
      setTagsStr('Action, Mystery');
      setMode('roleplay');
      setCoverImage('');

      setSetting('');
      setPlot('');
      setStyle('Atmospheric, evocative prose.');
      setNarrator('Act as an interactive RPG Game Master.');

      setObjects([]);
      setPersonas([]);
    }
  }, [initialScenario, isOpen]);

  if (!isOpen) return null;

  const handleAddObject = () => {
    setObjects((prev) => [
      ...prev,
      {
        id: `obj-${Date.now()}`,
        name: 'New Item / Entity',
        description: 'Description of the item or status rule...',
        trigger_rule: 'Trigger rule when activated...',
      },
    ]);
  };

  const handleRemoveObject = (index: number) => {
    setObjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPersona = () => {
    setPersonas((prev) => [
      ...prev,
      {
        id: `persona-${Date.now()}`,
        name: 'New Character',
        tagline: 'Character Title',
        personality: 'Character traits...',
        firstMessage: '"Hello there," says the character.',
      },
    ]);
  };

  const handleRemovePersona = (index: number) => {
    setPersonas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const scenarioId = id.trim() || `scenario-${Date.now()}`;
    const fullScenario: FullScenario = {
      meta: {
        id: scenarioId,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        mode,
        coverImage: coverImage.trim(),
      },
      worldBuilding: {
        setting,
        plot,
        style,
        narrator,
        objects,
        examples: [],
      },
      suggestedPersonas: personas,
    };

    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullScenario),
      });

      if (res.ok) {
        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to save scenario:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-3xl h-[85vh] rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl flex flex-col space-y-4 contain-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialScenario ? 'Edit Scenario' : 'Create New Scenario'}
              </h2>
              <p className="text-xs text-slate-400">Build custom world rules, CYOA objects, and personas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#1f2430] pb-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'meta' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Metadata</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('building')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'building' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Worldbuilding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('objects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'objects' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>CYOA Objects ({objects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'personas' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Suggested Personas ({personas.length})</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Scenario Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Shadows Over Eldoria"
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Dark Fantasy, Cyberpunk"
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary hook of the scenario..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="Infiltration, Magic, Stealth"
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                  >
                    <option value="roleplay">Role-Play</option>
                    <option value="story">Story</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Cover Image URL</label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'building' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Narrator Directives & System Behavior</label>
                <textarea
                  value={narrator}
                  onChange={(e) => setNarrator(e.target.value)}
                  placeholder="Directives for how the AI Game Master should act..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Setting & World Rules</label>
                <textarea
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  placeholder="Environmental lore, geography, rules..."
                  className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Plot Hooks & Initial Storyline</label>
                <textarea
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder="Core objective, mystery, or conflict..."
                  className="w-full h-20 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Writing Style & Perspective</label>
                <textarea
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g. Atmospheric, evocative prose with 2nd-person perspective..."
                  className="w-full h-16 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'objects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Custom Entities & CYOA Attributes tracked actively by Gemini
                </p>
                <button
                  type="button"
                  onClick={handleAddObject}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Object</span>
                </button>
              </div>

              {objects.map((obj, i) => (
                <div key={obj.id || i} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => {
                        const updated = [...objects];
                        updated[i].name = e.target.value;
                        setObjects(updated);
                      }}
                      placeholder="Object Name"
                      className="font-bold text-xs text-amber-400 bg-transparent focus:outline-none border-b border-amber-500/40 pb-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveObject(i)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={obj.description}
                    onChange={(e) => {
                      const updated = [...objects];
                      updated[i].description = e.target.value;
                      setObjects(updated);
                    }}
                    placeholder="Description of item / state..."
                    className="w-full rounded-lg bg-[#12151e] border border-[#1f2430] p-2 text-xs text-slate-200"
                  />

                  <input
                    type="text"
                    value={obj.trigger_rule || ''}
                    onChange={(e) => {
                      const updated = [...objects];
                      updated[i].trigger_rule = e.target.value;
                      setObjects(updated);
                    }}
                    placeholder="Trigger Rule (e.g. When held, grants thermal magic...)"
                    className="w-full rounded-lg bg-[#12151e] border border-[#1f2430] p-2 text-xs text-cyan-300"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'personas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Pre-configured Character Persona templates</p>
                <button
                  type="button"
                  onClick={handleAddPersona}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Persona</span>
                </button>
              </div>

              {personas.map((p, i) => (
                <div key={p.id || i} className="p-4 rounded-xl bg-[#090a0f] border border-[#262c3e] space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...personas];
                        updated[i].name = e.target.value;
                        setPersonas(updated);
                      }}
                      placeholder="Character Name"
                      className="font-bold text-xs text-cyan-300 bg-transparent focus:outline-none border-b border-cyan-500/40 pb-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePersona(i)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={p.tagline || ''}
                    onChange={(e) => {
                      const updated = [...personas];
                      updated[i].tagline = e.target.value;
                      setPersonas(updated);
                    }}
                    placeholder="Tagline / Title"
                    className="w-full rounded-lg bg-[#12151e] border border-[#1f2430] p-2 text-xs text-slate-300"
                  />

                  <textarea
                    value={p.personality}
                    onChange={(e) => {
                      const updated = [...personas];
                      updated[i].personality = e.target.value;
                      setPersonas(updated);
                    }}
                    placeholder="Personality traits..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#1f2430] p-2 text-xs text-slate-300 resize-none"
                  />

                  <textarea
                    value={p.firstMessage}
                    onChange={(e) => {
                      const updated = [...personas];
                      updated[i].firstMessage = e.target.value;
                      setPersonas(updated);
                    }}
                    placeholder="Opening first message..."
                    className="w-full h-16 rounded-lg bg-[#12151e] border border-[#1f2430] p-2 text-xs text-slate-300 resize-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[#1f2430] pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Scenario'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
