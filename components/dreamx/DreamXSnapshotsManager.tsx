import React, { useState, useEffect } from 'react';
import { Loader2, Database, Save, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import type { SnapshotMetadata } from '@/lib/dreamx/snapshots';

export function DreamXSnapshotsManager() {
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dreamx/snapshots');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/dreamx/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create snapshot');
      setNewLabel('');
      await fetchSnapshots();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (id: string, label: string, postCount: number, profileCount: number) => {
    const confirmRestore = window.confirm(`DANGER: Are you absolutely sure you want to restore "${label}"?\n\nThis will completely overwrite the current active production database.\n\nSnapshot contains:\n- ${postCount} Posts\n- ${profileCount} AI Profiles\n\nThis action cannot be undone.`);
    if (!confirmRestore) return;

    setIsRestoring(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/dreamx/snapshots/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore snapshot');
      
      alert('Snapshot restored successfully! The application will now reload to resync state.');
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsRestoring(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the snapshot "${label}"?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/dreamx/snapshots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete snapshot');
      await fetchSnapshots();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && snapshots.length === 0) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/50" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
        <div>
          <h2 className="font-bold text-white text-base">Snapshot & Rollback System</h2>
          <p className="text-xs text-white/50">Create and restore atomic database snapshots for safety before testing.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Snapshot Label (e.g. Pre-Burst Test)"
            className="flex-1 min-w-[200px] bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
          />
          <button
            onClick={handleCreate}
            disabled={!newLabel.trim() || isCreating || isRestoring}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Snapshot
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold text-sm">Error</h3>
            <p className="text-red-300/80 text-xs mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Snapshots List */}
      <div className="grid grid-cols-1 gap-4">
        {snapshots.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Database className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <h3 className="text-white font-bold text-sm">No Snapshots Found</h3>
            <p className="text-white/50 text-xs mt-1">Create a snapshot to safely save your production dataset.</p>
          </div>
        ) : (
          snapshots.map((snap) => (
            <div key={snap.snapshot_id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  {snap.label}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-white/50">
                  <span>{new Date(snap.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span>{snap.post_count} Posts</span>
                  <span>•</span>
                  <span>{snap.profile_count} Profiles</span>
                  <span>•</span>
                  <span className="font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded">{snap.database_hash_sha256.substring(0, 12)}...</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 md:mt-0">
                <button
                  onClick={() => handleRestore(snap.snapshot_id, snap.label, snap.post_count, snap.profile_count)}
                  disabled={isRestoring || isCreating || isDeleting}
                  className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-600/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore This State
                </button>
                <button
                  onClick={() => handleDelete(snap.snapshot_id, snap.label)}
                  disabled={isRestoring || isCreating || isDeleting || snapshots.length <= 1}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                  title={snapshots.length <= 1 ? "Cannot delete the final snapshot" : "Delete snapshot"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
