'use client';

import React from 'react';
import { ModelOption } from '@/lib/ai/models-fetcher';
import { Cpu, Search, Check, ChevronDown, Sparkles, X } from 'lucide-react';

interface SearchableModelSelectProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models: ModelOption[];
  disabled?: boolean;
  className?: string;
}

export function SearchableModelSelect({
  selectedModel,
  onModelChange,
  models = [],
  disabled = false,
  className = '',
}: SearchableModelSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModelObj = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    displayName: selectedModel,
  };

  const filteredModels = React.useMemo(() => {
    if (!searchTerm.trim()) return models;
    const term = searchTerm.toLowerCase().trim();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(term) ||
        m.displayName.toLowerCase().includes(term)
    );
  }, [models, searchTerm]);

  const handleSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#141824] border border-[#242b3d] hover:border-[#38435e] text-xs font-semibold text-slate-200 transition-all shadow-sm max-w-[240px] truncate"
        title="Select AI Model"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{activeModelObj.displayName || selectedModel}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-[#12151e] border border-[#262c3e] shadow-2xl z-50 p-2 space-y-2 contain-content animate-in fade-in zoom-in-95 duration-100">
          {/* Search Field */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search model catalog (e.g. llama, deepseek, free)..."
              className="w-full bg-[#090a0f] border border-[#1f2430] rounded-xl pl-8 pr-7 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Model Count / Filter Status */}
          <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Catalog ({filteredModels.length})</span>
            {models.some((m) => m.isFree) && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Free Models Available</span>
              </span>
            )}
          </div>

          {/* Scrollable Model List */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 contain-content scrollbar-thin scrollbar-thumb-slate-700">
            {filteredModels.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                No matching models found.
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = m.id === selectedModel;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-[#181d2a] text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{m.displayName}</span>
                        {m.isFree && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                            FREE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono truncate">
                        {m.id} {m.contextLength ? `• ${(m.contextLength / 1024).toFixed(0)}k ctx` : ''}
                      </span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
