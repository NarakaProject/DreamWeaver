'use client';

import React, { useState, useEffect } from 'react';
import type { DreamXProfile, DreamXActivityLog } from '@/lib/dreamx/types';
import { ShieldAlert, Play, RefreshCw, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DreamXControlPage() {
  const [profiles, setProfiles] = useState<DreamXProfile[]>([]);
  const [logs, setLogs] = useState<DreamXActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Forced simulation state
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [postContext, setPostContext] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const loadData = async () => {
    try {
      const [profRes, logRes] = await Promise.all([
        fetch('/api/dreamx/profiles'),
        fetch('/api/dreamx/posts') // just to ensure DB is initialized
      ]);
      if (profRes.ok) {
        const { profiles } = await profRes.json();
        setProfiles(profiles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulationStep = async (force: boolean = false) => {
    setIsExecuting(true);
    try {
      const apiKeys = {
        geminiKey: localStorage.getItem('dreamweaver_gemini_key') || '',
        groqKey: localStorage.getItem('dreamweaver_groq_key') || '',
        openrouterKey: localStorage.getItem('dreamweaver_openrouter_key') || ''
      };

      const res = await fetch('/api/dreamx/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          keys: apiKeys,
          forceBypassCooldown: force
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Simulation Step Finished: ${data.result?.outcome}`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleForceAIPost = async () => {
    if (!selectedProfileId) return;
    setIsExecuting(true);
    try {
      const apiKeys = {
        geminiKey: localStorage.getItem('dreamweaver_gemini_key') || '',
        groqKey: localStorage.getItem('dreamweaver_groq_key') || '',
        openrouterKey: localStorage.getItem('dreamweaver_openrouter_key') || ''
      };

      const res = await fetch('/api/dreamx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          profile_id: selectedProfileId,
          context: postContext,
          provider: 'gemini',
          keys: apiKeys
        })
      });
      if (res.ok) {
        setPostContext('');
        alert('Forced AI post successfully generated and persisted.');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col">
      {/* Top Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 gap-4 bg-black/40">
        <Link href="/dreamx" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h1 className="font-bold text-lg text-white">DreamX Simulation & Dev Control Surface</h1>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300">
          <strong>Developer Boundary Warning:</strong> This interface is isolated from normal DreamX social UI. Controls here operate strictly on isolated `dreamx_*` tables and never touch DreamWeaver sessions, characters, or story state.
        </div>

        {/* Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Autonomous Step Trigger */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-400" />
              Autonomous Activity Trigger
            </h2>
            <p className="text-xs text-white/50">
              Triggers the simulation decision engine. Respects 60s cooldown unless forced. Evaluates 1 bounded candidate action (Post, Reply, Like, or NO_ACTION).
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunSimulationStep(false)}
                disabled={isExecuting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Step (Standard)
              </button>
              <button
                onClick={() => handleRunSimulationStep(true)}
                disabled={isExecuting}
                className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors text-xs flex items-center gap-2 disabled:opacity-50"
              >
                Force Step
              </button>
            </div>
          </div>

          {/* Forced AI Post Generation */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Force AI Character Post
            </h2>
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
            >
              <option value="">Select AI persona...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.display_name} ({p.handle})</option>
              ))}
            </select>
            <input
              value={postContext}
              onChange={e => setPostContext(e.target.value)}
              placeholder="Topic or context guidance..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
            />
            <button
              onClick={handleForceAIPost}
              disabled={!selectedProfileId || isExecuting}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Force Generate Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
