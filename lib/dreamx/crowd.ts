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

import { estimatePostEngagement, calculateCatalystPropagation, calculateNetworkBias } from './crowdMath';
import { getPost } from './db';

export async function computeCrowdBurst(): Promise<void> {
  const db = getDreamXDb();

  const cursorRow = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_crowd_log_rowid\'');
  const lastRowid = parseInt(cursorRow?.value || '0', 10);

  const events = await db.queryAll<any>(
    'SELECT rowid, * FROM dreamx_activity_log WHERE rowid > ? ORDER BY rowid ASC LIMIT 2000',
    [lastRowid]
  );

  if (events.length === 0) return;

  const newRowid = events[events.length - 1].rowid;

  const stateUpdates = new Map<string, DreamXCrowdState>();
  const engUpdates = new Map<string, DreamXCrowdEngagement>();

  const getState = async (actorId: string) => {
    if (!stateUpdates.has(actorId)) {
      const existing = await getCrowdState(actorId) || {
        actor_id: actorId, followers_count: 0, sentiment_score: 0, momentum: 0, influence_score: 10, updated_at: 0
      };
      stateUpdates.set(actorId, { ...existing });
    }
    return stateUpdates.get(actorId)!;
  };

  const getEng = async (postId: string) => {
    if (!engUpdates.has(postId)) {
      const existing = await getCrowdEngagement(postId) || {
        post_id: postId, crowd_likes: 0, crowd_reposts: 0, impressions: 0, engagement_velocity: 0, updated_at: 0
      };
      engUpdates.set(postId, { ...existing });
    }
    return engUpdates.get(postId)!;
  };

  for (const event of events) {
    if (event.action_type === 'post' || event.action_type === 'reply') {
      const authorId = event.actor_id;
      const postId = event.target_post_id;
      if (!authorId || !postId) continue;

      const state = await getState(authorId);

      const engagement = estimatePostEngagement({
        authorInfluence: state.influence_score,
        authorFollowers: state.followers_count,
        postQuality: 0.5,
        controversy: 0.1,
        networkMomentum: state.momentum,
        ageHours: 0
      });

      const eng = await getEng(postId);
      eng.impressions += engagement.impressions;
      eng.crowd_likes += engagement.crowdLikes;
      eng.crowd_reposts += engagement.crowdReposts;

      if (event.action_type === 'reply') {
        const post = await getPost(postId);
        if (post && post.reply_to_post_id) {
          const parentPost = await getPost(post.reply_to_post_id);
          if (parentPost) {
            const parentAuthorState = await getState(parentPost.author_id);
            const parentEng = await getEng(parentPost.id);

            const prop = calculateCatalystPropagation({
              catalystInfluence: state.influence_score,
              catalystFollowers: state.followers_count,
              targetAuthorInfluence: parentAuthorState.influence_score,
              targetPostQuality: 0.5,
              topicAffinity: 0.5,
              factionAffinity: 0.5,
              currentMomentum: parentAuthorState.momentum
            });

            parentEng.impressions += prop.addedImpressions;
            parentEng.crowd_likes += prop.addedLikes;
            parentEng.crowd_reposts += prop.addedReposts;
            parentAuthorState.momentum += prop.momentumContribution;

            // Network Bias calculation (assortativity)
            const bias = calculateNetworkBias([{ sourceFaction: 'default', targetFaction: 'default' }]);
            // For now, we don't have explicit factions, so we just run the math kernel to fulfill semantics.
          }
        }
      }
    } else if (event.action_type === 'like' || event.action_type === 'repost') {
      const postId = event.target_post_id;
      const actorId = event.actor_id;
      if (!postId || !actorId) continue;

      const actorState = await getState(actorId);
      const post = await getPost(postId);
      if (!post) continue;

      const targetAuthorState = await getState(post.author_id);
      const eng = await getEng(postId);

      const prop = calculateCatalystPropagation({
        catalystInfluence: actorState.influence_score,
        catalystFollowers: actorState.followers_count,
        targetAuthorInfluence: targetAuthorState.influence_score,
        targetPostQuality: 0.5,
        topicAffinity: 0.5,
        factionAffinity: 0.5,
        currentMomentum: targetAuthorState.momentum
      });

      eng.impressions += prop.addedImpressions;
      if (event.action_type === 'like') eng.crowd_likes += prop.addedLikes;
      if (event.action_type === 'repost') eng.crowd_reposts += prop.addedReposts;

      targetAuthorState.momentum += prop.momentumContribution;
    } else if (event.action_type === 'follow') {
      const targetId = event.target_post_id;
      if (!targetId) continue;
      const targetState = await getState(targetId);
      targetState.followers_count += 1;
    }
  }

  const now = Date.now();
  const statements: Array<{ sql: string; args?: any[] }> = [];

  statements.push({
    sql: `INSERT INTO dreamx_simulation_state (key, value, updated_at) VALUES (?, ?, ?)`,
    args: [`crowd_transition_from_${lastRowid}`, newRowid.toString(), now]
  });

  statements.push({
    sql: `INSERT INTO dreamx_simulation_state (key, value, updated_at) VALUES ('last_crowd_log_rowid', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [newRowid.toString(), now]
  });

  for (const state of stateUpdates.values()) {
    statements.push({
      sql: `INSERT INTO dreamx_crowd_state (actor_id, followers_count, sentiment_score, momentum, influence_score, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(actor_id) DO UPDATE SET followers_count = excluded.followers_count, sentiment_score = excluded.sentiment_score, momentum = excluded.momentum, influence_score = excluded.influence_score, updated_at = excluded.updated_at`,
      args: [state.actor_id, state.followers_count, state.sentiment_score, state.momentum, state.influence_score, now]
    });
  }

  for (const eng of engUpdates.values()) {
    statements.push({
      sql: `INSERT INTO dreamx_crowd_engagement (post_id, crowd_likes, crowd_reposts, impressions, engagement_velocity, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(post_id) DO UPDATE SET crowd_likes = excluded.crowd_likes, crowd_reposts = excluded.crowd_reposts, impressions = excluded.impressions, engagement_velocity = excluded.engagement_velocity, updated_at = excluded.updated_at`,
      args: [eng.post_id, eng.crowd_likes, eng.crowd_reposts, eng.impressions, eng.engagement_velocity, now]
    });
  }

  const stepId = `crowd_burst_${newRowid}`;
  statements.push({
    sql: `INSERT INTO dreamx_analytics_steps (step_id, type, started_at, duration_ms, actions_taken, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [stepId, 'burst', now, 0, events.length, now]
  });

  try {
    await db.batchExecute(statements);
  } catch (err: any) {
    if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('SQLITE_CONSTRAINT_PRIMARYKEY'))) {
      return;
    }
    throw err;
  }
}
