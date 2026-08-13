import { 
  claimSimulationSlot, 
  getProfiles, 
  getFeedTree, 
  savePost, 
  toggleLike, 
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

  // 3. Select a random candidate AI profile
  const candidate = profiles[Math.floor(Math.random() * profiles.length)];

  // 4. Decide on an action type (LIKE, REPLY, POST, NO_ACTION)
  const actionChoice = Math.random();

  // --- OPTION A: AI LIKE (Deterministic, NO LLM CALL) ---
  if (actionChoice < 0.35 && posts.length > 0) {
    const targetPost = posts[Math.floor(Math.random() * posts.length)];
    // Toggle like deterministically
    const result = await toggleLike(targetPost.id, candidate.id, 'ai');
    await logActivity({
      action_type: 'like',
      actor_id: candidate.id,
      target_post_id: targetPost.id,
      reason: `Deterministic interest evaluation by ${candidate.handle}`
    });
    return { outcome: 'LIKE_CREATED', details: { actor: candidate.handle, postId: targetPost.id } };
  }

  // --- OPTION B: AI REPLY ---
  if (actionChoice < 0.70 && posts.length > 0 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
    const targetPost = posts[Math.floor(Math.random() * posts.length)];

    // Ensure candidate doesn't reply to their own post
    if (targetPost.author_id !== candidate.id) {
      const generatedReply = await generateDreamXReply(
        candidate,
        targetPost,
        targetPost.author_name || 'User',
        targetPost.author_handle || '@user',
        options
      );

      if (generatedReply && generatedReply.length > 3) {
        const saved = await savePost({
          author_id: candidate.id,
          author_type: 'ai',
          content: generatedReply,
          reply_to_post_id: targetPost.id
        });

        await logActivity({
          action_type: 'reply',
          actor_id: candidate.id,
          target_post_id: targetPost.id,
          reason: `Autonomous in-character reply by ${candidate.handle}`
        });

        return { outcome: 'REPLY_CREATED', details: { post: saved } };
      }
    }
  }

  // --- OPTION C: AI POST ---
  if (actionChoice < 0.85 && (options.keys.geminiKey || options.keys.groqKey || options.keys.openrouterKey)) {
    const generatedPost = await generateDreamXPost(candidate, '', options);
    if (generatedPost && generatedPost.length > 3) {
      const saved = await savePost({
        author_id: candidate.id,
        author_type: 'ai',
        content: generatedPost,
        reply_to_post_id: null
      });

      await logActivity({
        action_type: 'post',
        actor_id: candidate.id,
        reason: `Autonomous standalone post by ${candidate.handle}`
      });

      return { outcome: 'POST_CREATED', details: { post: saved } };
    }
  }

  // --- OPTION D: NO_ACTION (Silence is valid outcome!) ---
  await logActivity({
    action_type: 'no_action',
    actor_id: candidate.id,
    reason: `Candidate ${candidate.handle} evaluated context and chose silence.`
  });
  return { outcome: 'NO_ACTION', details: 'Silence evaluated as valid choice.' };
}
