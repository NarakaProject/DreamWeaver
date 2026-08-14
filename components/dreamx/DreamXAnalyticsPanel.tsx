import React, { useState, useEffect } from 'react';
import { BarChart2, Loader2, RefreshCw, Activity, Users, MessageSquare, Zap, Clock, ThumbsUp, Repeat, Eye } from 'lucide-react';
import type { DreamXAnalyticsData } from '@/lib/dreamx/analytics';

export function DreamXAnalyticsPanel() {
  const [data, setData] = useState<DreamXAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetch('/api/dreamx/analytics');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || 'Failed to fetch analytics.');
        }
      } else {
        setError('Failed to fetch analytics (Network error).');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching analytics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-white/50">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p className="text-sm">Loading analytics projection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-400 font-bold mb-2">Error Loading Analytics</p>
        <p className="text-red-300 text-xs">{error}</p>
        <button 
          onClick={() => fetchAnalytics(true)}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
        <div>
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />
            Simulation & Crowd Analytics
          </h2>
          <p className="text-xs text-white/50 mt-1">Read-only projection of Phase B persistence tables.</p>
        </div>
        <button
          onClick={() => fetchAnalytics(true)}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </div>

      {/* Grid 1: Simulation Engine Health */}
      <div>
        <h3 className="font-bold text-white/70 text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          Engine Health (dreamx_analytics_steps)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Total Bursts</p>
            <p className="text-2xl font-black text-white">{data.summary.totalBursts.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Total Actions Processed</p>
            <p className="text-2xl font-black text-white">{data.summary.totalActions.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Avg Burst Duration</p>
            <p className="text-2xl font-black text-blue-400">{data.summary.averageBurstDurationMs.toFixed(1)}ms</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Latest Burst</p>
            <p className="text-sm font-medium text-white/80 mt-1">
              {data.summary.latestBurstAt ? new Date(data.summary.latestBurstAt).toLocaleTimeString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid 2: Crowd State */}
      <div>
        <h3 className="font-bold text-white/70 text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Users className="w-4 h-4" />
          Crowd State (dreamx_crowd_state)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Total Followers</p>
            <p className="text-2xl font-black text-purple-400">{data.crowd.totalFollowers.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Avg Sentiment</p>
            <p className={`text-2xl font-black ${data.crowd.averageSentiment >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.crowd.averageSentiment > 0 ? '+' : ''}{data.crowd.averageSentiment.toFixed(3)}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Avg Momentum</p>
            <p className="text-2xl font-black text-amber-400">{data.crowd.averageMomentum.toFixed(3)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] text-white/50 uppercase font-bold mb-1">Tracked Actors</p>
            <p className="text-2xl font-black text-white">{data.crowd.trackedActors.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Grid 3: Engagement Totals */}
      <div>
        <h3 className="font-bold text-white/70 text-xs mb-3 flex items-center gap-2 uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" />
          Aggregate Engagement (dreamx_crowd_engagement)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-pink-500/10 rounded-full text-pink-400"><ThumbsUp className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-white/50 uppercase font-bold mb-0.5">Total Likes</p>
              <p className="text-xl font-black text-white">{data.engagement.totalLikes.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400"><Repeat className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-white/50 uppercase font-bold mb-0.5">Total Reposts</p>
              <p className="text-xl font-black text-white">{data.engagement.totalReposts.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400"><Eye className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-white/50 uppercase font-bold mb-0.5">Total Impressions</p>
              <p className="text-xl font-black text-white">{data.engagement.totalImpressions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Burst History Table */}
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/50" />
            Recent Simulation Bursts
          </h3>
        </div>
        {data.recentBursts.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-xs">No simulation bursts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="bg-white/5 text-[10px] uppercase font-bold tracking-wider text-white/50">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Step ID</th>
                  <th className="px-5 py-3 text-right">Duration (ms)</th>
                  <th className="px-5 py-3 text-right">Actions Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentBursts.map((burst, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-medium text-white">{new Date(burst.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-[10px] text-white/40">{burst.step_id}</td>
                    <td className="px-5 py-3 text-right text-blue-400 font-mono">{burst.duration_ms}ms</td>
                    <td className="px-5 py-3 text-right text-amber-400 font-bold">{burst.actions_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
