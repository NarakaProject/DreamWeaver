import { getDatabase } from '@/lib/db';

export interface DreamXAnalyticsData {
  summary: {
    totalBursts: number;
    totalActions: number;
    averageBurstDurationMs: number;
    latestBurstAt: number | null;
  };
  crowd: {
    totalFollowers: number;
    averageSentiment: number;
    averageMomentum: number;
    trackedActors: number;
  };
  engagement: {
    totalImpressions: number;
    totalLikes: number;
    totalReposts: number;
  };
  recentBursts: Array<{
    step_id: string;
    duration_ms: number;
    actions_taken: number;
    created_at: number;
  }>;
}

export async function getAnalyticsData(): Promise<DreamXAnalyticsData> {
  const db = getDatabase();

  // 1. Summary Metrics
  const summaryRow = await db.queryFirst<any>(`
    SELECT 
      COUNT(*) as totalBursts,
      SUM(actions_taken) as totalActions,
      AVG(duration_ms) as averageBurstDurationMs,
      MAX(created_at) as latestBurstAt
    FROM dreamx_analytics_steps
    WHERE type = 'burst'
  `);

  // 2. Crowd Metrics
  const crowdRow = await db.queryFirst<any>(`
    SELECT 
      SUM(followers_count) as totalFollowers,
      AVG(sentiment_score) as averageSentiment,
      AVG(momentum) as averageMomentum,
      COUNT(*) as trackedActors
    FROM dreamx_crowd_state
  `);

  // 3. Engagement Metrics
  const engagementRow = await db.queryFirst<any>(`
    SELECT 
      SUM(impressions) as totalImpressions,
      SUM(crowd_likes) as totalLikes,
      SUM(crowd_reposts) as totalReposts
    FROM dreamx_crowd_engagement
  `);

  // 4. Recent Bursts
  const recentBursts = await db.queryAll<any>(`
    SELECT step_id, duration_ms, actions_taken, created_at
    FROM dreamx_analytics_steps
    WHERE type = 'burst'
    ORDER BY created_at DESC
    LIMIT 10
  `);

  return {
    summary: {
      totalBursts: Number(summaryRow?.totalBursts) || 0,
      totalActions: Number(summaryRow?.totalActions) || 0,
      averageBurstDurationMs: Number(summaryRow?.averageBurstDurationMs) || 0,
      latestBurstAt: summaryRow?.latestBurstAt || null,
    },
    crowd: {
      totalFollowers: Number(crowdRow?.totalFollowers) || 0,
      averageSentiment: Number(crowdRow?.averageSentiment) || 0,
      averageMomentum: Number(crowdRow?.averageMomentum) || 0,
      trackedActors: Number(crowdRow?.trackedActors) || 0,
    },
    engagement: {
      totalImpressions: Number(engagementRow?.totalImpressions) || 0,
      totalLikes: Number(engagementRow?.totalLikes) || 0,
      totalReposts: Number(engagementRow?.totalReposts) || 0,
    },
    recentBursts: recentBursts || []
  };
}
