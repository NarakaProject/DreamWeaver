'use client';

import React, { useState, useMemo } from 'react';
import type { DreamXProfile, VerificationType } from '@/lib/dreamx/types';
import { Plus, X, Trash2, Edit, Search, Filter, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { DreamXVerificationBadge } from './DreamXVerificationBadge';

interface DreamXCharacterManagerProps {
  profiles: DreamXProfile[];
  onProfilesChanged: () => void;
}

export function DreamXCharacterManager({ profiles, onProfilesChanged }: DreamXCharacterManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [id, setId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [postingGuidelines, setPostingGuidelines] = useState('');
  const [verificationType, setVerificationType] = useState<VerificationType>('none');

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // Badge Filter
      if (badgeFilter !== 'all') {
        const pBadge = p.verification_type || 'none';
        if (pBadge !== badgeFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.display_name?.toLowerCase().includes(q);
        const matchHandle = p.handle?.toLowerCase().includes(q);
        const matchPersonality = p.personality?.toLowerCase().includes(q);
        const matchInterests = p.interests?.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchPersonality && !matchInterests) {
          return false;
        }
      }

      return true;
    });
  }, [profiles, searchQuery, badgeFilter]);

  const allVisibleSelected = useMemo(() => {
    if (filteredProfiles.length === 0) return false;
    return filteredProfiles.every(p => selectedIds.includes(p.id));
  }, [filteredProfiles, selectedIds]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredProfiles.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !visibleSet.has(id)));
    } else {
      const newSelected = new Set([...selectedIds, ...filteredProfiles.map(p => p.id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const toggleSelectProfile = (profileId: string) => {
    setSelectedIds(prev => 
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const resetForm = () => {
    setId('');
    setDisplayName('');
    setHandle('');
    setAvatarUrl('');
    setBio('');
    setPersonality('');
    setPostingGuidelines('');
    setVerificationType('none');
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
    setVerificationType(p.verification_type || 'none');
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
        verification_type: verificationType,
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

  const handleDeleteSingle = async (deleteId: string) => {
    if (!confirm('Are you sure? This will delete the profile AND all their posts!')) return;
    try {
      const res = await fetch(`/api/dreamx/profiles?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedIds(prev => prev.filter(i => i !== deleteId));
        onProfilesChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/dreamx/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setSelectedIds([]);
        setShowDeleteConfirmModal(false);
        onProfilesChanged();
      } else {
        alert('Failed to delete selected profiles.');
      }
    } catch (err) {
      console.error('Bulk deletion failed:', err);
      alert('Error occurred during bulk deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden h-full">
      {/* Header & Controls */}
      <div className="p-4 border-b border-white/10 bg-[#141722] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">AI Profiles Directory</h2>
            <p className="text-xs text-white/50">
              Showing {filteredProfiles.length} of {profiles.length} profiles
            </p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Profile</span>
          </button>
        </div>

        {/* Search & Verification Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search AI profiles by name or handle..."
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-white/40" />
            <select 
              value={badgeFilter}
              onChange={e => setBadgeFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#1a1d27]">All Badges</option>
              <option value="none" className="bg-[#1a1d27]">No Badge</option>
              <option value="blue" className="bg-[#1a1d27]">Blue Badge</option>
              <option value="gray" className="bg-[#1a1d27]">Gray Badge</option>
              <option value="gold" className="bg-[#1a1d27]">Gold Badge</option>
            </select>
          </div>
        </div>

        {/* Bulk Selection Actions Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAllVisible}
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
            >
              {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
              <span>Select All Visible</span>
            </button>

            {selectedIds.length > 0 && (
              <button 
                onClick={clearSelection}
                className="text-white/40 hover:text-white/80 transition-colors underline"
              >
                Clear ({selectedIds.length})
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteConfirmModal(true)}
              className="flex items-center gap-1 px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Profiles Grid / List */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProfiles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-white/40 text-xs">
            No AI profiles match your current search or filter criteria.
          </div>
        ) : (
          filteredProfiles.map(p => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <div 
                key={p.id} 
                className={`bg-black/40 border rounded-lg p-3 relative group transition-all ${
                  isSelected ? 'border-blue-500/80 bg-blue-500/10' : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button 
                    onClick={() => toggleSelectProfile(p.id)}
                    className="mt-1 text-white/40 hover:text-white"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                  </button>

                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white/80">
                    {p.avatar_url ? <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" /> : p.display_name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-sm truncate flex items-center gap-1">
                      <span>{p.display_name}</span>
                      <DreamXVerificationBadge type={p.verification_type} />
                    </p>
                    <p className="text-white/50 text-xs truncate">{p.handle}</p>

                    {p.personality && (
                      <p className="text-white/40 text-[11px] truncate mt-1 italic">
                        "{p.personality}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded p-0.5">
                  <button onClick={() => handleEdit(p)} className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white" title="Edit Profile">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteSingle(p.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400/70 hover:text-red-400" title="Delete Profile">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d27] border border-white/10 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0f111a]">
              <h3 className="font-bold text-white">{isEditing ? 'Edit Profile Configuration' : 'New AI Profile'}</h3>
              <button onClick={() => { setIsOpen(false); resetForm(); }} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <form id="profile-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Display Name</label>
                  <input required value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Handle</label>
                  <input required value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Avatar URL</label>
                  <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Bio (Public)</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Personality & Traits (Internal Prompt)</label>
                  <textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white resize-none" placeholder="How they act..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Verification Status</label>
                  <select 
                    value={verificationType} 
                    onChange={e => setVerificationType(e.target.value as VerificationType)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white text-xs"
                  >
                    <option value="none">None (Standard Account)</option>
                    <option value="blue">Blue Badge (Public Figure / Notable Person)</option>
                    <option value="gray">Gray Badge (Government / Institution)</option>
                    <option value="gold">Gold Badge (Company / Organization)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Posting Guidelines (Internal Prompt)</label>
                  <textarea value={postingGuidelines} onChange={e => setPostingGuidelines(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-white resize-none" placeholder="What they usually post about..." />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-white/10 bg-[#0f111a] flex justify-end gap-2">
              <button onClick={() => { setIsOpen(false); resetForm(); }} className="px-4 py-2 rounded text-xs text-white/70 hover:bg-white/5">Cancel</button>
              <button type="submit" form="profile-form" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium">Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d27] border border-red-500/30 rounded-xl w-full max-w-md overflow-hidden p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-white text-lg">
                Delete {selectedIds.length} AI Profiles?
              </h3>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              All posts, interactions, follows, and activity associated with these <strong className="text-white">{selectedIds.length} AI profiles</strong> will also be permanently removed.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
              This deletion strictly adheres to canonical DreamX profile cleanup rules (cleans posts, likes, reposts, detaches replies, scrubs activity log, and leaves DreamWeaver untouched).
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowDeleteConfirmModal(false)} 
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeBulkDelete} 
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <span>Confirm Delete ({selectedIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
