'use client';

import React, { useState } from 'react';
import type { DreamXProfile } from '@/lib/dreamx/types';
import { Plus, X, Trash2, Edit } from 'lucide-react';

interface DreamXCharacterManagerProps {
  profiles: DreamXProfile[];
  onProfilesChanged: () => void;
}

export function DreamXCharacterManager({ profiles, onProfilesChanged }: DreamXCharacterManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [id, setId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [postingGuidelines, setPostingGuidelines] = useState('');

  const resetForm = () => {
    setId('');
    setDisplayName('');
    setHandle('');
    setAvatarUrl('');
    setBio('');
    setPersonality('');
    setPostingGuidelines('');
    setIsEditing(false);
  };

  const handleEdit = (p: DreamXProfile) => {
    setId(p.id);
    setDisplayName(p.display_name);
    setHandle(p.handle);
    setAvatarUrl(p.avatar_url || '');
    setBio(p.bio || '');
    setPersonality(p.personality || '');
    setPostingGuidelines(p.posting_guidelines || '');
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !handle) return;

    try {
      const payload: any = {
        display_name: displayName,
        handle,
        avatar_url: avatarUrl,
        bio,
        personality,
        posting_guidelines: postingGuidelines,
      };
      if (id) payload.id = id;

      const res = await fetch('/api/dreamx/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onProfilesChanged();
        resetForm();
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (deleteId: string) => {
    if (!confirm('Are you sure? This will delete the profile AND all their posts!')) return;
    try {
      const res = await fetch(`/api/dreamx/profiles?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        onProfilesChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col bg-[#0f111a] border-l border-white/10 w-80 h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-bold text-white">Profiles ({profiles.length})</h2>
        <button 
          onClick={() => { resetForm(); setIsOpen(true); }}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {profiles.map(p => (
          <div key={p.id} className="bg-black/40 border border-white/5 rounded-lg p-3 relative group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {p.avatar_url ? <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" /> : p.display_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm truncate">{p.display_name}</p>
                <p className="text-white/50 text-xs truncate">{p.handle}</p>
              </div>
            </div>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(p)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-1 hover:bg-red-500/20 rounded text-red-500/50 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {isOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d27] border border-white/10 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0f111a]">
              <h3 className="font-bold text-white">{isEditing ? 'Edit Profile' : 'New Profile'}</h3>
              <button onClick={() => { setIsOpen(false); resetForm(); }} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="profile-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Display Name</label>
                  <input required value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Handle</label>
                  <input required value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Avatar URL</label>
                  <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Personality & Traits</label>
                  <textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white resize-none" placeholder="How they act..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Posting Guidelines</label>
                  <textarea value={postingGuidelines} onChange={e => setPostingGuidelines(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white resize-none" placeholder="What they usually post about..." />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-[#0f111a] flex justify-end gap-2">
              <button onClick={() => { setIsOpen(false); resetForm(); }} className="px-4 py-2 rounded text-white/70 hover:bg-white/5">Cancel</button>
              <button type="submit" form="profile-form" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium">Save Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
