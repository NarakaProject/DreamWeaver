import { 
  claimSimulationSlot, 
  getProfiles, 
  getRecentSimulationPosts, 
  savePost, 
  toggleLike, 
  ensureLike,
  logActivity,
  getPost,
  getAiReplyEdges
} from './db';
import { generateDreamXPost, generateDreamXReply } from './engine';
import { extractMentions } from './mentions';
import type { DreamXProfile, DreamXPost } from './types';
import type { ProviderKeys, AIProvider } from '@/lib/ai/provider-router';

interface SimulationOptions {
  provider?: AIProvider;
  model?: string;
  keys: ProviderKeys;
  forceBypassCooldown?: boolean; // For dev control panel
}

export async function runAutonomousActivityStep(options: SimulationOptions): Promise<{ outcome: string; details?: any }> {
  // 1. Concurrency-safe atomic cooldown claim (60 seconds)
  if (!options.forceBypassCooldown) {
    const claimed = await claimSimulationSlot(60000);
    if (!claimed) {
      return { outcome: 'COOLDOWN_ACTIVE' };
    }
  }

  // 2. Fetch DreamX-only state
  const profiles = await getProfiles();
  if (profiles.length === 0) {
    await logActivity({ action_type: 'no_action', reason: 'No AI profiles exist' });
    return { outcome: 'NO_ACTION', details: 'No AI profiles exist' };
  }

  const allPosts = await getRecentSimulationPosts(100);
  const aiReplyEdges = await getAiReplyEdges();

  // 3. Scan for High-Urgency Social Events (e.g. human replies or mentions)
  const urgencyEvents = evaluateSocialUrgencyEvents(profiles, allPosts, aiReplyEdges);
  const topUrgencyEvent = urgencyEvents.length > 0 ? urgencyEvents[0] : null;

  let candidate: DreamXProfile;
  let targetPost: DreamXPost | null = null;
  let isUrgencyEvent = false;

  if (topUrgencyEvent && topUrgencyEvent.score >= 3.0) {
    candidate = topUrgencyEvent.candidate;
    targetPost = topUrgencyEvent.targetPost;
    isUrgencyEvent = true;
  } else {
    candidate = selectWeightedCandidate(profiles, allPosts);
  }

  // Check if candidate AI is explicitly mentioned in any feed post
  const normCandidateHandle = candidate.handle.toLowerCase().replace(/^@/, '');
  const mentioningPosts = allPosts.filter(p => {
    if (p.author_id === candidate.id) return false;
    const mentions = extractMentions(p.content).map(m => m.toLowerCase());
    return mentions.includes(normCandidateHandle);
  });

  const isCandidateMentioned = mentioningPosts.length > 0;

  // 4. Decide on an action type (LIKE, REPLY, POST, NO_ACTION)
  const actionChoice = Math.random();

  // --- HIGH-VALUE EVENT OVERRIDE PATH ---
  if (isUrgencyEvent && targetPost) {
    if (actionChoice < 0.70 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
      const { text, validation } = await generateDreamXReply(
        candidate,
        targetPost,
        targetPost.author_name || 'User',
        targetPost.author_handle || '@user',
        options,
        topUrgencyEvent?.isMention || isCandidateMentioned
      );

      if (!validation.isValid) {
        await logActivity({
          action_type: 'no_action',
          actor_id: candidate.id,
          reason: `Rejected high-urgency reply output: ${validation.reason}`
        });
        return { outcome: 'NO_ACTION', details: `Rejected reply generation: ${validation.reason}` };
      }

      const saved = await savePost({
        author_id: candidate.id,
        author_type: 'ai',
        content: text,
        reply_to_post_id: targetPost.id
      });

      await logActivity({
        action_type: 'reply',
        actor_id: candidate.id,
        target_post_id: targetPost.id,
        reason: `Event-driven response to ${targetPost.author_handle} (Urgency: ${topUrgencyEvent?.score.toFixed(1)})`
      });

      return { outcome: 'REPLY_CREATED', details: { post: saved } };
    } else if (actionChoice < 0.85) {
      const result = await ensureLike(targetPost.id, candidate.id, 'ai');
      await logActivity({
        action_type: result.newlyAdded ? 'like' : 'no_action',
        actor_id: candidate.id,
        target_post_id: targetPost.id,
        reason: `Event-driven like for ${targetPost.author_handle}'s post`
      });
      return { outcome: result.newlyAdded ? 'LIKE_CREATED' : 'NO_ACTION', details: { actor: candidate.handle, postId: targetPost.id } };
    } else {
      await logActivity({
        action_type: 'no_action',
        actor_id: candidate.id,
        reason: `High urgency event present but candidate ${candidate.handle} chose silence.`
      });
      return { outcome: 'NO_ACTION', details: 'Candidate chose silence on social event.' };
    }
  }

  // If candidate is explicitly mentioned in ordinary browsing, boost REPLY action threshold to 0.85
  const replyThreshold = isCandidateMentioned ? 0.85 : 0.70;
  const likeThreshold = isCandidateMentioned ? 0.20 : 0.35;

  // --- OPTION A: AI LIKE (Deterministic, NO LLM CALL) ---
  if (actionChoice < likeThreshold && allPosts.length > 0) {
    const targetPost = isCandidateMentioned 
      ? mentioningPosts[Math.floor(Math.random() * mentioningPosts.length)]
      : allPosts[Math.floor(Math.random() * allPosts.length)];

    const contentLower = targetPost.content.toLowerCase();
    const interests = (candidate.interests || '').toLowerCase();
    const traits = (candidate.traits || '').toLowerCase();
    const personality = (candidate.personality || '').toLowerCase();
    
    const candidateKeywords = [interests, traits, personality]
      .join(' ')
      .split(/[\s,]+/)
      .filter(w => w.length > 4);
      
    const isRelevant = candidateKeywords.some(kw => contentLower.includes(kw));
    
    if (!isRelevant && Math.random() > 0.1) {
       await logActivity({
          action_type: 'no_action',
          actor_id: candidate.id,
          reason: `Evaluated post ${targetPost.id} but found no relevance to interests.`
       });
       return { outcome: 'NO_ACTION', details: 'Post not relevant for liking.' };
    }

    const result = await ensureLike(targetPost.id, candidate.id, 'ai');
    if (!result.newlyAdded) {
       await logActivity({
          action_type: 'no_action',
          actor_id: candidate.id,
          reason: `Already liked post ${targetPost.id}, skipping.`
       });
       return { outcome: 'NO_ACTION', details: 'Already liked.' };
    }

    await logActivity({
      action_type: 'like',
      actor_id: candidate.id,
      target_post_id: targetPost.id,
      reason: `Deterministic interest evaluation by ${candidate.handle}`
    });
    return { outcome: 'LIKE_CREATED', details: { actor: candidate.handle, postId: targetPost.id } };
  }

  // --- OPTION B: AI REPLY ---
  if (actionChoice < replyThreshold && allPosts.length > 0 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
    // Filter out posts this candidate has already replied to, or authored
    const validTargets = allPosts.filter(p => p.author_id !== candidate.id && !aiReplyEdges.has(`${candidate.id}:${p.id}`));
    const validMentionTargets = mentioningPosts.filter(p => p.author_id !== candidate.id && !aiReplyEdges.has(`${candidate.id}:${p.id}`));

    let possibleTargets = isCandidateMentioned && validMentionTargets.length > 0 ? validMentionTargets : validTargets;

    if (possibleTargets.length > 0) {
      const targetPost = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];

      const { text, validation } = await generateDreamXReply(
        candidate,
        targetPost,
        targetPost.author_name || 'User',
        targetPost.author_handle || '@user',
        options,
        isCandidateMentioned
      );

      if (!validation.isValid) {
        await logActivity({
          action_type: 'no_action',
          actor_id: candidate.id,
          reason: `Rejected AI reply output: ${validation.reason}`
        });
        return { outcome: 'NO_ACTION', details: `Rejected reply generation: ${validation.reason}` };
      }

      const saved = await savePost({
        author_id: candidate.id,
        author_type: 'ai',
        content: text,
        reply_to_post_id: targetPost.id
      });

      await logActivity({
        action_type: 'reply',
        actor_id: candidate.id,
        target_post_id: targetPost.id,
        reason: `Autonomous in-character reply by ${candidate.handle}`
      });

      return { outcome: 'REPLY_CREATED', details: { post: saved } };
    } else {
       await logActivity({
          action_type: 'no_action',
          actor_id: candidate.id,
          reason: `No valid targets to reply to without hitting UNIQUE constraint.`
       });
       return { outcome: 'NO_ACTION', details: 'No valid targets.' };
    }
  }

  // --- OPTION C: AI POST ---
  if (actionChoice < 0.85 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
    const { text, validation } = await generateDreamXPost(candidate, '', options);
    if (!validation.isValid) {
      await logActivity({
        action_type: 'no_action',
        actor_id: candidate.id,
        reason: `Rejected AI post output: ${validation.reason}`
      });
      return { outcome: 'NO_ACTION', details: `Rejected post generation: ${validation.reason}` };
    }

    const saved = await savePost({
      author_id: candidate.id,
      author_type: 'ai',
      content: text,
      reply_to_post_id: null
    });

    await logActivity({
      action_type: 'post',
      actor_id: candidate.id,
      reason: `Autonomous standalone post by ${candidate.handle}`
    });

    return { outcome: 'POST_CREATED', details: { post: saved } };
  }

  // --- OPTION D: NO_ACTION (Silence is valid outcome!) ---
  await logActivity({
    action_type: 'no_action',
    actor_id: candidate.id,
    reason: `Chose no action (random choice: ${actionChoice.toFixed(2)})`
  });

  return { outcome: 'NO_ACTION', details: 'No action performed.' };
}

/**
 * Calculates candidate selection weights based on mentions in current feed posts.
 * Base weight = 1.0. If profile's handle is mentioned in any post, weight = 2.5.
 */
export function calculateCandidateWeights(profiles: DreamXProfile[], allPosts: DreamXPost[]): { profile: DreamXProfile; weight: number }[] {
  const mentionedHandles = new Set<string>();
  for (const post of allPosts) {
    const mentions = extractMentions(post.content);
    for (const m of mentions) {
      mentionedHandles.add(m.toLowerCase());
    }
  }

  return profiles.map(profile => {
    const handleNorm = profile.handle.toLowerCase().replace(/^@/, '');
    const isMentioned = mentionedHandles.has(handleNorm);
    
    // 1. Base Weight
    let weight = isMentioned ? 2.5 : 1.0;

    // 2. Recent Activity / Exposure Decay
    const recentPostsCount = allPosts.filter(p => p.author_id === profile.id).length;
    let activityMultiplier = 1.0;
    if (recentPostsCount === 1) activityMultiplier = 0.8;
    else if (recentPostsCount >= 2 && recentPostsCount <= 3) activityMultiplier = 0.5;
    else if (recentPostsCount >= 4) activityMultiplier = 0.1;

    // 3. Category Opportunity Adjustment
    let categoryMultiplier = 1.0;
    if (profile.verification_type === 'gold' || profile.verification_type === 'gray' || profile.verification_type === 'blue') {
      categoryMultiplier = 0.5; // Strong penalty to famous/gov/corp
    } else if (profile.verification_type === 'none' || !profile.verification_type) {
      categoryMultiplier = 1.5; // Significant boost to unverified ordinary users
    }

    weight = weight * activityMultiplier * categoryMultiplier;
    
    // 4. Minimum Opportunity Floor
    weight = Math.max(0.05, weight);

    return {
      profile,
      weight
    };
  });
}

/**
 * Selects a candidate AI profile using weighted random selection.
 */
export function selectWeightedCandidate(profiles: DreamXProfile[], allPosts: DreamXPost[]): DreamXProfile {
  const weighted = calculateCandidateWeights(profiles, allPosts);
  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weighted) {
    if (random <= item.weight) {
      return item.profile;
    }
    random -= item.weight;
  }

  return profiles[0];
}

export interface SocialUrgencyEvent {
  candidate: DreamXProfile;
  targetPost: DreamXPost;
  score: number;
  isDirectHumanInteraction: boolean;
  isMention: boolean;
}

/**
 * Calculates personality propensity factor for an AI profile (0.5 to 1.5 multiplier).
 */
export function calculatePersonalityPropensity(profile: DreamXProfile): number {
  const text = [
    profile.personality || '',
    profile.traits || '',
    profile.speaking_style || ''
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
 * Scans allPosts to find high-value social urgency events for AI profiles.
 */
export function evaluateSocialUrgencyEvents(profiles: DreamXProfile[], allPosts: DreamXPost[], aiReplyEdges: Set<string>): SocialUrgencyEvent[] {
  const events: SocialUrgencyEvent[] = [];
  const now = Date.now();
  const postMap = new Map<string, DreamXPost>();
  for (const p of allPosts) {
    postMap.set(p.id, p);
  }

  for (const candidate of profiles) {
    const normHandle = candidate.handle.toLowerCase().replace(/^@/, '');
    const propensity = calculatePersonalityPropensity(candidate);

    for (const post of allPosts) {
      if (post.author_id === candidate.id) continue;

      // Filter out posts candidate has already replied to
      if (aiReplyEdges.has(`${candidate.id}:${post.id}`)) continue;

      let rawScore = 0;
      let isDirectHuman = false;
      let isMention = false;

      const mentions = extractMentions(post.content).map(m => m.toLowerCase());
      const mentionsCandidate = mentions.includes(normHandle);

      const parentPost = post.reply_to_post_id ? postMap.get(post.reply_to_post_id) : null;
      const isParentByCandidate = parentPost && parentPost.author_id === candidate.id;

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
          const pingPongCount = countReciprocalPingPong(post, candidate.id, postMap);
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
        const recentPostsCount = allPosts.filter(p => p.author_id === candidate.id).length;
        let activityMultiplier = 1.0;
        if (recentPostsCount === 1) activityMultiplier = 0.85;
        else if (recentPostsCount >= 2 && recentPostsCount <= 3) activityMultiplier = 0.6;
        else if (recentPostsCount >= 4) activityMultiplier = 0.2;

        let categoryMultiplier = 1.0;
        if (candidate.verification_type === 'gold' || candidate.verification_type === 'gray' || candidate.verification_type === 'blue') {
          categoryMultiplier = 0.5;
        } else if (candidate.verification_type === 'none' || !candidate.verification_type) {
          categoryMultiplier = 1.5;
        }

        finalScore = finalScore * activityMultiplier * categoryMultiplier;

        if (finalScore > 1.0) {
          events.push({
            candidate,
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
