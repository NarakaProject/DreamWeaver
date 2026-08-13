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

  // 3. Select a random candidate AI profile
  const candidate = profiles[Math.floor(Math.random() * profiles.length)];

  // 4. Decide on an action type (LIKE, REPLY, POST, NO_ACTION)
  const actionChoice = Math.random();

  // --- OPTION A: AI LIKE (Deterministic, NO LLM CALL) ---
  if (actionChoice < 0.35 && allPosts.length > 0) {
    const targetPost = allPosts[Math.floor(Math.random() * allPosts.length)];
    
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
  if (actionChoice < 0.70 && allPosts.length > 0 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
    const targetPost = allPosts[Math.floor(Math.random() * allPosts.length)];

    const alreadyReplied = targetPost.replies?.some(r => r.author_id === candidate.id && r.author_type === 'ai');

    // Ensure candidate doesn't reply to their own post and hasn't already replied
    if (targetPost.author_id !== candidate.id && !alreadyReplied) {
      const { text, validation } = await generateDreamXReply(
        candidate,
        targetPost,
        targetPost.author_name || 'User',
        targetPost.author_handle || '@user',
        options
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
    reason: `Candidate ${candidate.handle} evaluated context and chose silence.`
  });
  return { outcome: 'NO_ACTION', details: 'Silence evaluated as valid choice.' };
}
