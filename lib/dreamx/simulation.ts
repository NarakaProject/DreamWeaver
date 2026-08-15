import { 
  claimSimulationSlot, 
  getProfiles, 
  getRecentSimulationPosts, 
  savePost, 
  ensureLike,
  logActivity,
  getAiReplyEdges
} from './db';
import { generateDreamXPost, generateDreamXReply } from './engine';
import { extractMentions } from './mentions';
import { 
  deriveEffectiveBehavior,
  DEFAULT_BEHAVIOR_POLICY, 
  selectActionFromPolicy 
} from './behaviorPolicy';
import { toActorFromProfile } from './actors';
import type { Actor, DreamXProfile, DreamXPost } from './types';
import type { ProviderKeys, AIProvider } from '@/lib/ai/provider-router';

interface SimulationOptions {
  provider?: AIProvider;
  model?: string;
  keys: ProviderKeys;
  forceBypassCooldown?: boolean; // For dev control panel
}

function isActor(obj: any): obj is Actor {
  return obj && typeof obj === 'object' && 'identity' in obj && typeof obj.identity === 'object';
}

function ensureActor(actorOrProfile: Actor | DreamXProfile): Actor {
  return isActor(actorOrProfile) ? actorOrProfile : toActorFromProfile(actorOrProfile);
}

// ----------------------------------------------------
// Concurrency & Ghost-Write Prevention State Machine
// ----------------------------------------------------
let globalRunToken: number = Date.now();
let inFlightCount: number = 0;
let isSimulationPaused: boolean = false;

export function getRunToken(): number {
  return globalRunToken;
}

export function getInFlightCount(): number {
  return inFlightCount;
}

export function isSimulationActive(): boolean {
  return !isSimulationPaused;
}

export function pauseSimulation(): void {
  isSimulationPaused = true;
}

export function resumeSimulation(): void {
  isSimulationPaused = false;
  invalidateSimulationToken();
}

export function invalidateSimulationToken(): void {
  globalRunToken = Date.now();
}

export async function runAutonomousActivityStep(options: SimulationOptions): Promise<{ outcome: string; details?: any }> {
  if (isSimulationPaused) {
    return { outcome: 'PAUSED', details: 'Simulation is currently paused for rollback or snapshot.' };
  }

  const runToken = globalRunToken;
  inFlightCount++;

  try {
    // 1. Concurrency-safe atomic cooldown claim (60 seconds)
    if (!options.forceBypassCooldown) {
      const claimed = await claimSimulationSlot(60000, runToken);
      if (!claimed) {
        return { outcome: 'COOLDOWN_ACTIVE' };
      }
    }

    // 2. Fetch DreamX AI profiles and convert to Actor domain models
    const profiles = await getProfiles();
    if (profiles.length === 0) {
      await logActivity({ action_type: 'no_action', reason: 'No AI profiles exist' }, runToken);
      return { outcome: 'NO_ACTION', details: 'No AI profiles exist' };
    }

    // Map persistent AI profiles to canonical Actor aggregates
    const actors: Actor[] = profiles.map(toActorFromProfile);

    const allPosts = await getRecentSimulationPosts(100);
    const aiReplyEdges = await getAiReplyEdges();

    // 3. Scan for High-Urgency Social Events (e.g. human replies or mentions)
    const urgencyEvents = evaluateSocialUrgencyEvents(actors, allPosts, aiReplyEdges);
    const topUrgencyEvent = urgencyEvents.length > 0 ? urgencyEvents[0] : null;

    let candidate: Actor;
    let targetPost: DreamXPost | null = null;
    let isUrgencyEvent = false;

    if (topUrgencyEvent && topUrgencyEvent.score >= 3.0) {
      candidate = ensureActor(topUrgencyEvent.candidate);
      targetPost = topUrgencyEvent.targetPost;
      isUrgencyEvent = true;
    } else {
      candidate = selectWeightedCandidate(actors, allPosts);
    }

    // Check if candidate AI is explicitly mentioned in any feed post
    const normCandidateHandle = candidate.identity.handle.toLowerCase().replace(/^@/, '');
    const mentioningPosts = allPosts.filter(p => {
      if (p.author_id === candidate.identity.id) return false;
      const mentions = extractMentions(p.content).map(m => m.toLowerCase());
      return mentions.includes(normCandidateHandle);
    });

    const isCandidateMentioned = mentioningPosts.length > 0;

    // 4. Decide on an action type using canonical D4 deriveEffectiveBehavior
    const actionChoice = Math.random();
    const hasKeys = !!(options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey);

    const effectivePolicy = deriveEffectiveBehavior(
      candidate.behaviorPolicy || DEFAULT_BEHAVIOR_POLICY,
      {
        isUrgencyEvent,
        isMentioned: isCandidateMentioned
      }
    );

    let selectedAction = selectActionFromPolicy(effectivePolicy, actionChoice, isUrgencyEvent);

    // Exact Legacy Contextual Fallbacks:
    // 1. Empty feed causes normal actionChoice < 0.85 to fall through to POST.
    if (allPosts.length === 0 && (selectedAction === 'like' || selectedAction === 'reply')) {
      selectedAction = 'post';
    }

    // 2. Missing LLM keys causes generative actions to fall back.
    if (!hasKeys) {
      if (isUrgencyEvent && selectedAction === 'reply') {
        selectedAction = 'like';
      } else if (selectedAction === 'reply' || selectedAction === 'post') {
        selectedAction = 'no_action';
      }
    }

    // --- OPTION A: AI LIKE (Deterministic, NO LLM CALL) ---
    if (selectedAction === 'like') {
      let currentTarget = targetPost;
      if (!isUrgencyEvent) {
        currentTarget = isCandidateMentioned 
          ? mentioningPosts[Math.floor(Math.random() * mentioningPosts.length)]
          : allPosts[Math.floor(Math.random() * allPosts.length)];
      }

      if (!isUrgencyEvent && currentTarget) {
        const contentLower = currentTarget.content.toLowerCase();
        const interests = candidate.personality?.interests || [];
        const traits = candidate.personality?.traits || [];
        const topics = candidate.contentProfile?.topics || [];
        const summary = candidate.personality?.summary ? [candidate.personality.summary] : [];

        const candidateKeywords = [...interests, ...traits, ...topics, ...summary]
          .join(' ')
          .toLowerCase()
          .split(/[\s,]+/)
          .filter(w => w.length > 4);
          
        const isRelevant = candidateKeywords.length === 0 || candidateKeywords.some(kw => contentLower.includes(kw));
        
        if (!isRelevant && Math.random() > 0.1) {
           await logActivity({
              action_type: 'no_action',
              actor_id: candidate.identity.id,
              reason: `Evaluated post ${currentTarget.id} but found no relevance to interests.`
           }, runToken);
           return { outcome: 'NO_ACTION', details: 'Post not relevant for liking.' };
        }
      }

      if (currentTarget) {
        const result = await ensureLike(currentTarget.id, candidate.identity.id, 'ai', runToken);
        if (!result.newlyAdded) {
           await logActivity({
              action_type: 'no_action',
              actor_id: candidate.identity.id,
              reason: isUrgencyEvent ? `High urgency event present but candidate ${candidate.identity.handle} chose silence.` : `Already liked post ${currentTarget.id}, skipping.`
           }, runToken);
           return { outcome: 'NO_ACTION', details: isUrgencyEvent ? 'Candidate chose silence on social event.' : 'Already liked.' };
        }

        await logActivity({
          action_type: 'like',
          actor_id: candidate.identity.id,
          target_post_id: currentTarget.id,
          reason: isUrgencyEvent ? `Event-driven like for ${currentTarget.author_handle}'s post` : `Deterministic interest evaluation by ${candidate.identity.handle}`
        }, runToken);
        return { outcome: 'LIKE_CREATED', details: { actor: candidate.identity.handle, postId: currentTarget.id } };
      } else if (isUrgencyEvent) {
        await logActivity({
          action_type: 'no_action',
          actor_id: candidate.identity.id,
          reason: `High urgency event present but candidate ${candidate.identity.handle} chose silence.`
        }, runToken);
        return { outcome: 'NO_ACTION', details: 'Candidate chose silence on social event.' };
      }
    }

    // --- OPTION B: AI REPLY ---
    if (selectedAction === 'reply') {
      let currentTarget = targetPost;
      let isUrgencyReply = isUrgencyEvent;

      if (!isUrgencyEvent) {
        const validTargets = allPosts.filter(p => p.author_id !== candidate.identity.id && !aiReplyEdges.has(`${candidate.identity.id}:${p.id}`));
        const validMentionTargets = mentioningPosts.filter(p => p.author_id !== candidate.identity.id && !aiReplyEdges.has(`${candidate.identity.id}:${p.id}`));
        let possibleTargets = isCandidateMentioned && validMentionTargets.length > 0 ? validMentionTargets : validTargets;

        if (possibleTargets.length > 0) {
          currentTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        }
      }

      if (currentTarget) {
        const { text, validation } = await generateDreamXReply(
          candidate,
          currentTarget,
          currentTarget.author_name || 'User',
          currentTarget.author_handle || '@user',
          options,
          isUrgencyReply ? (topUrgencyEvent?.isMention || isCandidateMentioned) : isCandidateMentioned
        );

        if (!validation.isValid) {
          await logActivity({
            action_type: 'no_action',
            actor_id: candidate.identity.id,
            reason: isUrgencyReply ? `Rejected high-urgency reply output: ${validation.reason}` : `Rejected AI reply output: ${validation.reason}`
          }, runToken);
          return { outcome: 'NO_ACTION', details: `Rejected reply generation: ${validation.reason}` };
        }

        const saved = await savePost({
          author_id: candidate.identity.id,
          author_type: 'ai',
          content: text,
          reply_to_post_id: currentTarget.id
        }, runToken);

        await logActivity({
          action_type: 'reply',
          actor_id: candidate.identity.id,
          target_post_id: currentTarget.id,
          reason: isUrgencyReply ? `Event-driven response to ${currentTarget.author_handle} (Urgency: ${topUrgencyEvent?.score.toFixed(1)}, runToken)` : `Autonomous in-character reply by ${candidate.identity.handle}`
        }, runToken);

        return { outcome: 'REPLY_CREATED', details: { post: saved } };
      } else {
         await logActivity({
            action_type: 'no_action',
            actor_id: candidate.identity.id,
            reason: `No valid targets to reply to without hitting UNIQUE constraint.`
         }, runToken);
         return { outcome: 'NO_ACTION', details: 'No valid targets.' };
      }
    }

    // --- OPTION C: AI POST ---
    if (selectedAction === 'post') {
      const { text, validation } = await generateDreamXPost(candidate, '', options);
      if (!validation.isValid) {
        await logActivity({
          action_type: 'no_action',
          actor_id: candidate.identity.id,
          reason: `Rejected AI post output: ${validation.reason}`
        }, runToken);
        return { outcome: 'NO_ACTION', details: `Rejected post generation: ${validation.reason}` };
      }

      const saved = await savePost({
        author_id: candidate.identity.id,
        author_type: 'ai',
        content: text,
        reply_to_post_id: null
      }, runToken);

      await logActivity({
        action_type: 'post',
        actor_id: candidate.identity.id,
        target_post_id: saved.id,
        reason: `Autonomous standalone post by ${candidate.identity.handle}`
      }, runToken);

      return { outcome: 'POST_CREATED', details: { post: saved } };
    }

    // --- OPTION D: NO_ACTION (Silence is valid outcome!) ---
    await logActivity({
      action_type: 'no_action',
      actor_id: candidate.identity.id,
      reason: `Chose no action (random choice: ${actionChoice.toFixed(2)}, runToken)`
    });

    return { outcome: 'NO_ACTION', details: 'No action performed.' };
  } finally {
    inFlightCount--;
  }
}

/**
 * Calculates candidate selection weights based on mentions in current feed posts.
 * Base weight = 1.0. If actor's handle is mentioned in any post, weight = 2.5.
 */
export function calculateCandidateWeights(
  actorsOrProfiles: (Actor | DreamXProfile)[],
  allPosts: DreamXPost[]
): { 
  actor: Actor; 
  profile: any; 
  weight: number 
}[] {
  const mentionedHandles = new Set<string>();
  for (const post of allPosts) {
    const mentions = extractMentions(post.content);
    for (const m of mentions) {
      mentionedHandles.add(m.toLowerCase());
    }
  }

  return actorsOrProfiles.map(item => {
    const actor = ensureActor(item);
    const handleNorm = actor.identity.handle.toLowerCase().replace(/^@/, '');
    const isMentioned = mentionedHandles.has(handleNorm);
    
    // 1. Base Weight
    let weight = isMentioned ? 2.5 : 1.0;

    // 2. Recent Activity / Exposure Decay
    const recentPostsCount = allPosts.filter(p => p.author_id === actor.identity.id).length;
    let activityMultiplier = 1.0;
    if (recentPostsCount === 1) activityMultiplier = 0.8;
    else if (recentPostsCount >= 2 && recentPostsCount <= 3) activityMultiplier = 0.5;
    else if (recentPostsCount >= 4) activityMultiplier = 0.1;

    // 3. Category Opportunity Adjustment
    let categoryMultiplier = 1.0;
    const vType = actor.identity.verification_type;
    if (vType === 'gold' || vType === 'gray' || vType === 'blue') {
      categoryMultiplier = 0.5; // Strong penalty to famous/gov/corp
    } else if (vType === 'none' || !vType) {
      categoryMultiplier = 1.5; // Significant boost to unverified ordinary users
    }

    weight = weight * activityMultiplier * categoryMultiplier;
    
    // 4. Minimum Opportunity Floor
    weight = Math.max(0.05, weight);

    return {
      actor,
      profile: item,
      weight
    };
  });
}

/**
 * Selects a candidate AI actor using weighted random selection.
 */
export function selectWeightedCandidate(
  actorsOrProfiles: DreamXProfile[],
  allPosts: DreamXPost[]
): DreamXProfile;
export function selectWeightedCandidate(
  actorsOrProfiles: Actor[],
  allPosts: DreamXPost[]
): Actor;
export function selectWeightedCandidate<T extends Actor | DreamXProfile>(
  actorsOrProfiles: T[],
  allPosts: DreamXPost[]
): T;
export function selectWeightedCandidate(
  actorsOrProfiles: (Actor | DreamXProfile)[],
  allPosts: DreamXPost[]
): any {
  const weighted = calculateCandidateWeights(actorsOrProfiles, allPosts);
  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let random = Math.random() * totalWeight;

  let selectedIndex = 0;
  for (let i = 0; i < weighted.length; i++) {
    if (random <= weighted[i].weight) {
      selectedIndex = i;
      break;
    }
    random -= weighted[i].weight;
  }

  return actorsOrProfiles[selectedIndex];
}

export interface SocialUrgencyEvent {
  candidate: any;
  targetPost: DreamXPost;
  score: number;
  isDirectHumanInteraction: boolean;
  isMention: boolean;
}

/**
 * Calculates personality propensity factor for an AI actor (0.5 to 1.5 multiplier).
 */
export function calculatePersonalityPropensity(actorOrProfile: Actor | DreamXProfile): number {
  const actor = ensureActor(actorOrProfile);
  const text = [
    actor.personality?.summary || '',
    (actor.personality?.traits || []).join(' '),
    actor.contentProfile?.style || ''
  ].join(' ').toLowerCase();

  let score = 1.0;

  if (/\b(social|talkative|argumentative|confrontational|expressive|bold|witty|passionate)\b/.test(text)) {
    score += 0.3;
  }
  if (/\b(reserved|quiet|passive|shy|introverted|silent|calm)\b/.test(text)) {
    score -= 0.3;
  }

  return Math.min(1.5, Math.max(0.5, score));
}

/**
 * Calculates consecutive reciprocal ping-pong exchanges between candidate and target post author.
 */
export function countReciprocalPingPong(
  startPost: DreamXPost,
  candidateId: string,
  postMap: Map<string, DreamXPost>
): number {
  let count = 0;
  let curr: DreamXPost | undefined = startPost;

  while (curr && curr.reply_to_post_id && count < 10) {
    const parent = postMap.get(curr.reply_to_post_id);
    if (!parent) break;

    // Ping pong pattern: curr is by one actor, parent is by the other
    if ((curr.author_id === candidateId && parent.author_id === startPost.author_id) ||
        (curr.author_id === startPost.author_id && parent.author_id === candidateId)) {
      count++;
      curr = parent;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Calculates total replies in the thread containing startPost.
 */
export function countThreadReplies(
  startPost: DreamXPost,
  postMap: Map<string, DreamXPost>
): number {
  let root = startPost;
  let depth = 0;
  while (root.reply_to_post_id && depth < 20) {
    const parent = postMap.get(root.reply_to_post_id);
    if (!parent) break;
    root = parent;
    depth++;
  }

  let count = 0;
  const stack = [root];
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (item.replies) {
      count += item.replies.length;
      stack.push(...item.replies);
    }
  }
  return count;
}

/**
 * Scans allPosts to find high-value social urgency events for AI actors.
 */
export function evaluateSocialUrgencyEvents(
  actorsOrProfiles: (Actor | DreamXProfile)[],
  allPosts: DreamXPost[],
  aiReplyEdges: Set<string>
): SocialUrgencyEvent[] {
  const events: SocialUrgencyEvent[] = [];
  const now = Date.now();
  const postMap = new Map<string, DreamXPost>();
  for (const p of allPosts) {
    postMap.set(p.id, p);
  }

  for (const item of actorsOrProfiles) {
    const candidate = ensureActor(item);
    const normHandle = candidate.identity.handle.toLowerCase().replace(/^@/, '');
    const propensity = calculatePersonalityPropensity(candidate);

    for (const post of allPosts) {
      if (post.author_id === candidate.identity.id) continue;

      // Filter out posts candidate has already replied to
      if (aiReplyEdges.has(`${candidate.identity.id}:${post.id}`)) continue;

      let rawScore = 0;
      let isDirectHuman = false;
      let isMention = false;

      const mentions = extractMentions(post.content).map(m => m.toLowerCase());
      const mentionsCandidate = mentions.includes(normHandle);

      const parentPost = post.reply_to_post_id ? postMap.get(post.reply_to_post_id) : null;
      const isParentByCandidate = parentPost && parentPost.author_id === candidate.identity.id;

      if (post.author_type === 'human') {
        if (isParentByCandidate) {
          rawScore += 10.0;
          isDirectHuman = true;
        }
        if (mentionsCandidate) {
          rawScore += 8.0;
          isDirectHuman = true;
          isMention = true;
        }
      } else if (post.author_type === 'ai') {
        if (isParentByCandidate) {
          rawScore += 4.0;
        }
        if (mentionsCandidate) {
          rawScore += 4.0;
          isMention = true;
        }
      }

      if (rawScore > 0) {
        const ageMs = now - post.created_at;
        const ageMinutes = ageMs / (1000 * 60);
        const recencyMultiplier = ageMinutes <= 30 ? 1.0 : Math.max(0.1, 1.0 - (ageMinutes - 30) / 120);

        // Apply conversation saturation & ping-pong decay for AI-to-AI interaction
        let saturationMultiplier = 1.0;
        if (!isDirectHuman && post.author_type === 'ai') {
          const pingPongCount = countReciprocalPingPong(post, candidate.identity.id, postMap);
          const threadCount = countThreadReplies(post, postMap);

          if (pingPongCount >= 4) {
            saturationMultiplier *= 0.05;
          } else if (pingPongCount === 3) {
            saturationMultiplier *= 0.25;
          } else if (pingPongCount === 2) {
            saturationMultiplier *= 0.6;
          }

          if (threadCount > 8) {
            saturationMultiplier *= Math.max(0.1, 1 / (1 + (threadCount - 8) * 0.3));
          }
        }

        let finalScore = rawScore * propensity * recencyMultiplier * saturationMultiplier;

        // Apply recent activity exposure decay
        const recentPostsCount = allPosts.filter(p => p.author_id === candidate.identity.id).length;
        let activityMultiplier = 1.0;
        if (recentPostsCount === 1) activityMultiplier = 0.85;
        else if (recentPostsCount >= 2 && recentPostsCount <= 3) activityMultiplier = 0.6;
        else if (recentPostsCount >= 4) activityMultiplier = 0.2;

        let categoryMultiplier = 1.0;
        const vType = candidate.identity.verification_type;
        if (vType === 'gold' || vType === 'gray' || vType === 'blue') {
          categoryMultiplier = 0.5;
        } else if (vType === 'none' || !vType) {
          categoryMultiplier = 1.5;
        }

        finalScore = finalScore * activityMultiplier * categoryMultiplier;

        if (finalScore > 1.0) {
          events.push({
            candidate: item,
            targetPost: post,
            score: finalScore,
            isDirectHumanInteraction: isDirectHuman,
            isMention
          });
        }
      }
    }
  }

  return events.sort((a, b) => b.score - a.score);
}
