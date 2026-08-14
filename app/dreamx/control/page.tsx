'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DreamXProfile } from '@/lib/dreamx/types';
import { ValidationReport, exportAIProfilesJSON } from '@/lib/dreamx/import_export';
import { DreamXCharacterManager } from '@/components/dreamx/DreamXCharacterManager';
import { DreamXSnapshotsManager } from '@/components/dreamx/DreamXSnapshotsManager';
import { DreamXAnalyticsPanel } from '@/components/dreamx/DreamXAnalyticsPanel';
import {
  ShieldAlert,
  Play,
  RefreshCw,
  ArrowLeft,
  Loader2,
  FileJson,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
  Cpu,
  Zap,
  Database,
  BarChart2
} from 'lucide-react';
import Link from 'next/link';

export default function DreamXControlPage() {
  const [profiles, setProfiles] = useState<DreamXProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulation' | 'profiles' | 'import_export' | 'snapshots' | 'analytics'>('simulation');

  // Simulation execution state
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [postContext, setPostContext] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Simulation Burst state
  const [burstCount, setBurstCount] = useState<number>(10);
  const [burstResults, setBurstResults] = useState<any[]>([]);

  // Import / Export state
  const [jsonText, setJsonText] = useState('');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<'update' | 'skip'>('update');
  const [allowSkipInvalid, setAllowSkipInvalid] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const profRes = await fetch('/api/dreamx/profiles');
      if (profRes.ok) {
        const { profiles } = await profRes.json();
        setProfiles(profiles || []);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
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
          forceBypassCooldown: force,
          count: 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBurstResults(data.results || (data.result ? [data.result] : []));
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunBurstSimulation = async (count: number) => {
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
          forceBypassCooldown: true,
          count: count
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBurstResults(data.results || (data.result ? [data.result] : []));
        await loadData();
      }
    } catch (err) {
      console.error('Burst simulation failed:', err);
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

  // Handle JSON File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setValidationReport(null);
      setImportStatus(null);
    };
    reader.readAsText(file);
  };

  // Validate JSON Payload
  const handleValidateJSON = async () => {
    if (!jsonText.trim()) {
      alert('Please paste JSON or upload a JSON file first.');
      return;
    }

    setIsValidating(true);
    setImportStatus(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch('/api/dreamx/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_import',
          payload: parsed
        })
      });

      if (res.ok) {
        const { report } = await res.json();
        setValidationReport(report);
      } else {
        alert('Failed to validate import payload.');
      }
    } catch (err: any) {
      alert(`Invalid JSON Syntax: ${err.message}`);
      setValidationReport(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!jsonText.trim()) return;

    setIsImporting(true);
    setImportStatus('Executing profile import...');
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch('/api/dreamx/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_import',
          payload: parsed,
          duplicate_mode: duplicateMode,
          allow_skip_invalid: allowSkipInvalid
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus(`Import Successful: ${data.createdCount} created, ${data.updatedCount} updated, ${data.skippedCount} skipped.`);
        await loadData();
      } else {
        setImportStatus(`Import Aborted: ${data.errors?.join('; ') || 'Validation error'}`);
      }
    } catch (err: any) {
      setImportStatus(`Import Exception: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Export AI Profiles JSON
  const handleExportProfiles = () => {
    const jsonStr = exportAIProfilesJSON(profiles);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dreamx-ai-profiles.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#e2e8f0] flex flex-col">
      {/* Top Bar Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 gap-4 bg-black/40">
        <Link href="/dreamx" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h1 className="font-bold text-lg text-white">DreamX Dev & Admin Control Surface</h1>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6 flex flex-col">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300">
          <strong>Developer Boundary Warning:</strong> This control panel is isolated from public social UI. Controls operate strictly on `dreamx_*` tables and never touch DreamWeaver narrative systems or session state.
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-2">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'simulation'
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            Simulation Control
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'profiles'
                ? 'border-purple-500 bg-purple-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            AI Profiles ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('import_export')}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'import_export'
                ? 'border-emerald-500 bg-emerald-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileJson className="w-4 h-4 text-emerald-400" />
            Bulk Import & Export
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'snapshots'
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            Snapshots & Rollback
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl flex items-center gap-2 transition-colors border-b-2 ${
              activeTab === 'analytics'
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-blue-400" />
            Analytics
          </button>
        </div>

        {/* TAB 1: SIMULATION CONTROL */}
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Standard Autonomous Step
              </h2>
              <p className="text-xs text-white/50">
                Triggers 1 single simulation step. Evaluates 1 bounded candidate action (Post, Reply, Like, or NO_ACTION).
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRunSimulationStep(false)}
                  disabled={isExecuting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run 1 Step
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                Force Single AI Character Post
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

            {/* Sequential Simulation Burst Test Runner */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 col-span-full">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white flex items-center gap-2 text-base">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Sequential Simulation Burst Test Runner
                  </h2>
                  <p className="text-xs text-white/50 mt-1">
                    Executes N sequential simulation steps automatically in developer test mode. Runs actions sequentially using existing single-step logic (bypassing 60s cooldown for developer testing).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-3">
                <span className="text-xs text-white/70 font-medium">Select Burst Count:</span>
                {[1, 5, 10, 25, 50].map(count => (
                  <button
                    key={count}
                    onClick={() => setBurstCount(count)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      burstCount === count
                        ? 'bg-amber-500 text-black shadow-lg scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {count} {count === 1 ? 'Step' : 'Steps'}
                  </button>
                ))}

                <button
                  onClick={() => handleRunBurstSimulation(burstCount)}
                  disabled={isExecuting}
                  className="ml-auto px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold rounded-xl transition-all text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
                  Run {burstCount} {burstCount === 1 ? 'Step' : 'Steps'} Burst
                </button>
              </div>

              {/* Execution Results Summary & Step Log */}
              {burstResults.length > 0 && (
                <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="font-bold text-white text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Burst Simulation Results ({burstResults.length} Steps Executed)
                    </h3>
                    <button 
                      onClick={() => setBurstResults([])}
                      className="text-[11px] text-white/40 hover:text-white underline"
                    >
                      Clear Log
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2 font-mono text-xs">
                    {burstResults.map((res, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="text-white/40 font-bold">Step {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res.outcome === 'posted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            res.outcome === 'replied' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            res.outcome === 'liked' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {res.outcome?.toUpperCase()}
                          </span>
                          {res.action?.authorName && (
                            <span className="text-white font-medium">{res.action.authorName}</span>
                          )}
                          {res.action?.targetAuthorName && (
                            <span className="text-white/50 text-[11px]">→ @{res.action.targetAuthorName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI PROFILES MANAGEMENT */}
        {activeTab === 'profiles' && (
          <div className="flex-1 min-h-[500px]">
            <DreamXCharacterManager profiles={profiles} onProfilesChanged={loadData} />
          </div>
        )}

        {/* TAB 3: BULK IMPORT & EXPORT */}
        {activeTab === 'import_export' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <div>
                <h2 className="font-bold text-white text-base">Bulk AI Profile Management (JSON Schema v1)</h2>
                <p className="text-xs text-white/50">Import multiple AI personas safely or export existing AI profiles.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload JSON File
                </button>
                <button
                  onClick={handleExportProfiles}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export AI Profiles JSON
                </button>
              </div>
            </div>

            {/* Config & Editor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Import Controls & Options */}
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-white text-sm">Import Options</h3>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Duplicate Handle Resolution Mode</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateMode"
                          checked={duplicateMode === 'update'}
                          onChange={() => setDuplicateMode('update')}
                          className="accent-blue-500"
                        />
                        <span><strong>Update Mode</strong> (Overwrites config, preserves social history)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateMode"
                          checked={duplicateMode === 'skip'}
                          onChange={() => setDuplicateMode('skip')}
                          className="accent-blue-500"
                        />
                        <span><strong>Skip Mode</strong> (Skips existing profiles)</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSkipInvalid}
                        onChange={e => setAllowSkipInvalid(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>Allow partial import (skip invalid records)</span>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleValidateJSON}
                      disabled={isValidating || !jsonText.trim()}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Validate Payload
                    </button>
                  </div>

                  {validationReport && (
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || (!validationReport.canImport && !allowSkipInvalid)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Execute Profile Import
                    </button>
                  )}

                  {importStatus && (
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white/80 font-mono">
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: JSON Payload Editor */}
              <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">JSON Payload Editor</h3>
                  <a
                    href="/docs/dreamx-ai-profiles.example.json"
                    target="_blank"
                    download="dreamx-ai-profiles.example.json"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Download Sample JSON
                  </a>
                </div>

                <textarea
                  value={jsonText}
                  onChange={e => {
                    setJsonText(e.target.value);
                    setValidationReport(null);
                    setImportStatus(null);
                  }}
                  placeholder='Paste JSON array or object here...'
                  className="w-full flex-1 min-h-[300px] bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-white/90 focus:outline-none focus:border-blue-500 resize-y"
                />

                {/* Pre-Flight Validation Report */}
                {validationReport && (
                  <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white">Pre-Flight Validation Report</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        validationReport.canImport ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {validationReport.canImport ? 'PASSED & READY' : 'ERRORS DETECTED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white/5 p-2 rounded-lg"><span className="block text-white/50 text-[10px]">Total</span><strong className="text-white text-sm">{validationReport.total}</strong></div>
                      <div className="bg-emerald-500/10 p-2 rounded-lg"><span className="block text-emerald-400 text-[10px]">Valid</span><strong className="text-emerald-400 text-sm">{validationReport.validCount}</strong></div>
                      <div className="bg-red-500/10 p-2 rounded-lg"><span className="block text-red-400 text-[10px]">Invalid</span><strong className="text-red-400 text-sm">{validationReport.invalidCount}</strong></div>
                      <div className="bg-amber-500/10 p-2 rounded-lg"><span className="block text-amber-400 text-[10px]">Duplicates</span><strong className="text-amber-400 text-sm">{validationReport.duplicateCount}</strong></div>
                    </div>

                    {validationReport.items.some(i => i.errors.length > 0) && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        <span className="font-bold text-red-400 text-[11px]">Validation Errors:</span>
                        {validationReport.items.map((item, idx) => (
                          item.errors.length > 0 && (
                            <div key={idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300 text-[11px]">
                              <strong>Item #{idx + 1} ({item.raw?.display_name || item.raw?.handle || 'Unknown'}):</strong> {item.errors.join(', ')}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SNAPSHOTS & ROLLBACK */}
        {activeTab === 'snapshots' && (
          <div className="flex-1 min-h-[500px]">
            <DreamXSnapshotsManager />
          </div>
        )}

        {/* TAB 5: ANALYTICS PANEL */}
        {activeTab === 'analytics' && (
          <div className="flex-1 min-h-[500px]">
            <DreamXAnalyticsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
