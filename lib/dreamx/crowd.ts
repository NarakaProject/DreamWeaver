import { getDatabase, assertDreamXAvailable } from '@/lib/db';
import type { 
  DreamXCrowdState, 
  DreamXCrowdEngagement, 
  DreamXAnalyticsStep 
} from './types';

function getDreamXDb() {
  assertDreamXAvailable();
  return getDatabase();
}

export async function getCrowdState(actorId: string): Promise<DreamXCrowdState | undefined> {
  const db = getDreamXDb();
  return db.queryFirst<DreamXCrowdState>('SELECT * FROM dreamx_crowd_state WHERE actor_id = ?', [actorId]);
}

export async function upsertCrowdState(state: DreamXCrowdState): Promise<void> {
  const db = getDreamXDb();
  await db.execute(`
    INSERT INTO dreamx_crowd_state (
      actor_id, followers_count, sentiment_score, momentum, influence_score, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(actor_id) DO UPDATE SET
      followers_count = excluded.followers_count,
      sentiment_score = excluded.sentiment_score,
      momentum = excluded.momentum,
      influence_score = excluded.influence_score,
      updated_at = excluded.updated_at
  `, [
    state.actor_id,
    state.followers_count,
    state.sentiment_score,
    state.momentum,
    state.influence_score,
    state.updated_at
  ]);
}

export async function getCrowdEngagement(postId: string): Promise<DreamXCrowdEngagement | undefined> {
  const db = getDreamXDb();
  return db.queryFirst<DreamXCrowdEngagement>('SELECT * FROM dreamx_crowd_engagement WHERE post_id = ?', [postId]);
}

export async function upsertCrowdEngagement(engagement: DreamXCrowdEngagement): Promise<void> {
  const db = getDreamXDb();
  await db.execute(`
    INSERT INTO dreamx_crowd_engagement (
      post_id, crowd_likes, crowd_reposts, impressions, engagement_velocity, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(post_id) DO UPDATE SET
      crowd_likes = excluded.crowd_likes,
      crowd_reposts = excluded.crowd_reposts,
      impressions = excluded.impressions,
      engagement_velocity = excluded.engagement_velocity,
      updated_at = excluded.updated_at
  `, [
    engagement.post_id,
    engagement.crowd_likes,
    engagement.crowd_reposts,
    engagement.impressions,
    engagement.engagement_velocity,
    engagement.updated_at
  ]);
}

export async function recordAnalyticsStep(step: DreamXAnalyticsStep): Promise<void> {
  const db = getDreamXDb();
  await db.execute(`
    INSERT INTO dreamx_analytics_steps (
      step_id, type, started_at, duration_ms, actions_taken, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(step_id) DO NOTHING
  `, [
    step.step_id,
    step.type,
    step.started_at,
    step.duration_ms,
    step.actions_taken,
    step.created_at
  ]);
}
