'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DreamXProfile, DreamXActivityLog } from '@/lib/dreamx/types';
import { ValidationReport, exportAIProfilesJSON } from '@/lib/dreamx/import_export';
import { DreamXVerificationBadge } from '@/components/dreamx/DreamXVerificationBadge';
import { DreamXCharacterManager } from '@/components/dreamx/DreamXCharacterManager';
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
  Cpu
} from 'lucide-react';
import Link from 'next/link';

export default function DreamXControlPage() {
  const [profiles, setProfiles] = useState<DreamXProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulation' | 'profiles' | 'import_export'>('simulation');

  // Simulation execution state
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [postContext, setPostContext] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

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

      <div className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6 flex flex-col">
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
        </div>

        {/* TAB 1: SIMULATION CONTROL */}
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Autonomous Step Trigger
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
        )}

        {/* TAB 2: AI PROFILES MANAGEMENT */}
        {activeTab === 'profiles' && (
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col min-h-[450px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-bold text-white text-base">AI Profiles Directory</h2>
                <p className="text-xs text-white/50">Manage individual AI persona configurations and verified badges.</p>
              </div>
              <button
                onClick={handleExportProfiles}
                className="px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export Profiles JSON
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <DreamXCharacterManager profiles={profiles} onProfilesChanged={loadData} />
            </div>
          </div>
        )}

        {/* TAB 3: BULK IMPORT & EXPORT */}
        {activeTab === 'import_export' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-white text-base flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    Bulk Import AI Profiles (JSON)
                  </h2>
                  <p className="text-xs text-white/50 mt-1">
                    Upload or paste JSON matching the v1 profile schema. Atomic pre-flight validation protects existing social history.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    Load JSON File
                  </button>
                  <button
                    onClick={handleExportProfiles}
                    className="px-3 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600/30 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Export Current Profiles
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={e => {
                  setJsonText(e.target.value);
                  setValidationReport(null);
                  setImportStatus(null);
                }}
                placeholder='Paste JSON here... Example: {"version":1,"profiles":[{"display_name":"Maria","handle":"@MariaEnoce","verification":{"type":"blue"}}]}'
                rows={6}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-xs font-mono resize-none focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-3 items-center">
                <button
                  onClick={handleValidateJSON}
                  disabled={isValidating || !jsonText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  1. Validate JSON
                </button>

                <button
                  onClick={() => {
                    setJsonText('');
                    setValidationReport(null);
                    setImportStatus(null);
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold rounded-xl transition-colors"
                >
                  Clear / Reset
                </button>
              </div>

              {/* Validation Report & Preview */}
              {validationReport && (
                <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                      Validation Preview & Pre-Flight Report
                    </h3>
                    <div className="flex gap-4 text-xs font-semibold">
                      <span className="text-white/60">Total: {validationReport.total}</span>
                      <span className="text-emerald-400">Valid: {validationReport.validCount}</span>
                      <span className="text-amber-400">Duplicates: {validationReport.duplicateCount}</span>
                      <span className="text-red-400">Invalid: {validationReport.invalidCount}</span>
                    </div>
                  </div>

                  {/* Errors List if any */}
                  {validationReport.invalidCount > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Validation Errors Detected ({validationReport.invalidCount} records):
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                        {validationReport.items.filter(i => !i.isValid).map((item, idx) => (
                          <li key={idx}>
                            Record #{idx + 1} ({item.raw?.handle || 'Unknown'}): {item.errors.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Duplicate Mode & Import Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                    <div>
                      <label className="block text-xs font-bold text-white/70 mb-1">
                        Duplicate Handle Strategy:
                      </label>
                      <select
                        value={duplicateMode}
                        onChange={e => setDuplicateMode(e.target.value as 'update' | 'skip')}
                        className="w-full bg-black/70 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs"
                      >
                        <option value="update">Update existing profile personality & config (Default)</option>
                        <option value="skip">Skip existing profile if handle matches</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white/70 mb-1">
                        Invalid Record Handling:
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={allowSkipInvalid}
                          onChange={e => setAllowSkipInvalid(e.target.checked)}
                          className="rounded border-white/20"
                        />
                        <span>Skip invalid records and import remaining valid profiles</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || (!allowSkipInvalid && validationReport.invalidCount > 0)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      2. Execute Bulk AI Profile Import
                    </button>
                    {!allowSkipInvalid && validationReport.invalidCount > 0 && (
                      <p className="text-[11px] text-red-400 mt-1.5 text-center">
                        Import blocked because validation report contains invalid records. Fix JSON errors or enable &quot;Skip invalid records&quot;.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Message */}
              {importStatus && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-300">
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
