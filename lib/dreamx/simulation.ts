import { 
  claimSimulationSlot, 
  getProfiles, 
  getFeedTree, 
  savePost, 
  toggleLike, 
  ensureLike,
  logActivity,
  getPost
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

  const posts = await getFeedTree();
  
  const allPosts: DreamXPost[] = [];
  const flatten = (pts: DreamXPost[]) => {
    for (const p of pts) {
      allPosts.push(p);
      if (p.replies) flatten(p.replies);
    }
  };
  flatten(posts);

  // 3. Scan for High-Urgency Social Events (e.g. human replies or mentions)
  const urgencyEvents = evaluateSocialUrgencyEvents(profiles, allPosts);
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

    
    // Deterministic interest evaluation
    const contentLower = targetPost.content.toLowerCase();
    const interests = (candidate.interests || '').toLowerCase();
    const traits = (candidate.traits || '').toLowerCase();
    const personality = (candidate.personality || '').toLowerCase();
    
    // Simple relevance check: do any words > 4 chars in interests/traits/personality appear in the post?
    const candidateKeywords = [interests, traits, personality]
      .join(' ')
      .split(/[\\s,]+/)
      .filter(w => w.length > 4);
      
    const isRelevant = candidateKeywords.some(kw => contentLower.includes(kw));
    
    // Fallback: 10% chance to like anyway to simulate arbitrary browsing
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
    const targetPost = isCandidateMentioned 
      ? mentioningPosts[Math.floor(Math.random() * mentioningPosts.length)]
      : allPosts[Math.floor(Math.random() * allPosts.length)];

    const alreadyReplied = targetPost.replies?.some(r => r.author_id === candidate.id && r.author_type === 'ai');

    // Ensure candidate doesn't reply to their own post and hasn't already replied
    if (targetPost.author_id !== candidate.id && !alreadyReplied) {
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
          reason: alreadyReplied ? `Already replied to post ${targetPost.id}` : `Cannot reply to own post ${targetPost.id}`
       });
       return { outcome: 'NO_ACTION', details: 'Duplicate or self-reply blocked.' };
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
    return {
      profile,
      weight: isMentioned ? 2.5 : 1.0
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
 * Scans allPosts to find high-value social urgency events for AI profiles.
 */
export function evaluateSocialUrgencyEvents(profiles: DreamXProfile[], allPosts: DreamXPost[]): SocialUrgencyEvent[] {
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

      // Check if candidate has ALREADY replied to this exact post
      const alreadyReplied = post.replies?.some(r => r.author_id === candidate.id && r.author_type === 'ai');
      if (alreadyReplied) continue;

      let rawScore = 0;
      let isDirectHuman = false;
      let isMention = false;

      const mentions = extractMentions(post.content).map(m => m.toLowerCase());
      const mentionsCandidate = mentions.includes(normHandle);

      // Check direct parent post if post is a reply
      const parentPost = post.reply_to_post_id ? postMap.get(post.reply_to_post_id) : null;
      const isParentByCandidate = parentPost && parentPost.author_id === candidate.id;

      if (post.author_type === 'human') {
        if (isParentByCandidate) {
          // Human directly replied to candidate's post!
          rawScore += 10.0;
          isDirectHuman = true;
        }
        if (mentionsCandidate) {
          // Human explicitly mentioned candidate!
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
        // Recency decay (within last 30 minutes gets full score)
        const ageMs = now - post.created_at;
        const ageMinutes = ageMs / (1000 * 60);
        const recencyMultiplier = ageMinutes <= 30 ? 1.0 : Math.max(0.1, 1.0 - (ageMinutes - 30) / 120);

        const finalScore = rawScore * propensity * recencyMultiplier;
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

