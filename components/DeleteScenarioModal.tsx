'use client';

import React from 'react';
import { FullScenario } from '@/lib/scenarios/types';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: FullScenario | null;
  onConfirmDelete: (scenarioId: string) => Promise<void> | void;
}

export function DeleteScenarioModal({
  isOpen,
  onClose,
  scenario,
  onConfirmDelete,
}: DeleteScenarioModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!isOpen || !scenario) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(scenario.meta.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete scenario:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 contain-content backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#12151e] border border-[#262c3e] p-6 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Delete Scenario?</h2>
              <p className="text-xs text-slate-400">Permanent scenario deletion confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a202c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1f2430] space-y-2 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Are you sure you want to delete <strong className="text-amber-400">{scenario.meta.title}</strong>?
          </p>
          <p className="text-slate-400">
            This action cannot be undone. The scenario template and all its associated building blocks will be permanently removed from your catalog.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-[#1f2430] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
