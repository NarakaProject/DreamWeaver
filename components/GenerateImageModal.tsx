'use client';

import React from 'react';
import { X, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { AssetType } from '@/lib/gemini/image-prompt';

interface GenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  assetType?: AssetType;
  onGenerate: (prompt: string, stylePreset: string, aspectRatio: string) => Promise<void>;
  isGenerating: boolean;
}

const STYLE_PRESETS = [
  'Dark Fantasy',
  'Cinematic',
  'Concept Art',
  'Cyberpunk',
  'Anime / Graphic Novel',
];

export function GenerateImageModal({
  isOpen,
  onClose,
  initialPrompt,
  assetType = 'general',
  onGenerate,
  isGenerating,
}: GenerateImageModalProps) {
  const [prompt, setPrompt] = React.useState('');
  const [selectedStyle, setSelectedStyle] = React.useState('Dark Fantasy');
  const [aspectRatio, setAspectRatio] = React.useState<'square' | 'landscape'>(
    assetType === 'avatar' ? 'square' : 'landscape'
  );

  React.useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt || '');
      setAspectRatio(assetType === 'avatar' ? 'square' : 'landscape');
    }
  }, [isOpen, initialPrompt, assetType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    const finalPrompt = `${prompt.trim()}, ${selectedStyle} style`;
    await onGenerate(finalPrompt, selectedStyle, aspectRatio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#12151e] border border-[#262c3e] shadow-2xl overflow-hidden flex flex-col space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Wand2 className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>✨ Generate Asset with FLUX.1-schnell</span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Text-to-Image AI Engine • Hugging Face Serverless
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Prompt Textarea */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-200">
              Prompt Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe character appearance, lighting, background, atmosphere..."
              className="w-full h-24 rounded-xl bg-[#090a0f] border border-[#262c3e] p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          {/* Style Presets */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Style Preset</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setSelectedStyle(style)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedStyle === style
                      ? 'bg-purple-500 text-white shadow-md font-bold'
                      : 'bg-[#141824] border border-[#242b3d] text-slate-400 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Picker */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">Aspect Ratio</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('square')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  aspectRatio === 'square'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-[#141824] border-[#242b3d] text-slate-400 hover:text-white'
                }`}
              >
                <span>1:1 Square (Avatar)</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('landscape')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  aspectRatio === 'landscape'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-[#141824] border-[#242b3d] text-slate-400 hover:text-white'
                }`}
              >
                <span>16:9 Landscape (Cover/Lore)</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1f2430]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-colors shadow-lg disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>{isGenerating ? 'Painting Asset...' : '✨ Paint Asset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
