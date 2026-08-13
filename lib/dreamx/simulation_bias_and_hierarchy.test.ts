import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getConversationFlat, 
  savePost, 
  saveProfile, 
  resetSimulationState, 
  getProfiles 
} from './db';
import { calculateCandidateWeights, evaluateSocialUrgencyEvents } from './simulation';
import type { DreamXProfile, DreamXPost } from './types';

describe('DreamX v0.2 - Simulation Bias and Target-Aware Hierarchy', () => {
  beforeEach(async () => {
    await resetSimulationState();
  });

  describe('Deep Reply Navigation and Target-Aware Resolution', () => {
    it('resolves ancestors, target, and descendants correctly', async () => {
      const root = await savePost({ author_id: 'u1', author_type: 'human', content: 'Root post', reply_to_post_id: null });
      const replyA = await savePost({ author_id: 'u1', author_type: 'human', content: 'Reply A', reply_to_post_id: root.id });
      const replyB = await savePost({ author_id: 'u1', author_type: 'human', content: 'Reply B', reply_to_post_id: replyA.id });
      const replyC = await savePost({ author_id: 'u1', author_type: 'human', content: 'Reply C (TARGET)', reply_to_post_id: replyB.id });
      const replyD = await savePost({ author_id: 'u1', author_type: 'human', content: 'Reply D', reply_to_post_id: replyC.id });
      
      // Sibling reply to B (should be in descendants)
      const replySibling = await savePost({ author_id: 'u1', author_type: 'human', content: 'Reply Sibling', reply_to_post_id: replyB.id });

      const result = await getConversationFlat(replyC.id);
      
      expect(result.target.id).toBe(replyC.id);
      expect(result.root.id).toBe(root.id);
      
      // Ancestors should be Root -> Reply A -> Reply B
      expect(result.ancestors.length).toBe(3);
      expect(result.ancestors[0].id).toBe(root.id);
      expect(result.ancestors[1].id).toBe(replyA.id);
      expect(result.ancestors[2].id).toBe(replyB.id);

      // Descendants/Conversation should include Reply D and Reply Sibling
      const conversationIds = result.conversation.map(p => p.id);
      expect(conversationIds).toContain(replyD.id);
      expect(conversationIds).toContain(replySibling.id);
      
      // Target and ancestors should NOT be in the conversation array
      expect(conversationIds).not.toContain(replyC.id);
      expect(conversationIds).not.toContain(root.id);
      expect(conversationIds).not.toContain(replyA.id);
      expect(conversationIds).not.toContain(replyB.id);
    });
  });

  describe('Simulation Candidate Exposure Decay & Balancing', () => {
    it('applies category balancing and recent activity decay to weights', async () => {
      const ord1 = await saveProfile({ id: 'ord1', display_name: 'Ord 1', handle: 'ord1', verification_type: 'none' });
      const ord2 = await saveProfile({ id: 'ord2', display_name: 'Ord 2', handle: 'ord2', verification_type: 'none' });
      const gov1 = await saveProfile({ id: 'gov1', display_name: 'Gov 1', handle: 'gov1', verification_type: 'gray' });
      const corp1 = await saveProfile({ id: 'corp1', display_name: 'Corp 1', handle: 'corp1', verification_type: 'gold' });
      const celeb1 = await saveProfile({ id: 'celeb1', display_name: 'Celeb 1', handle: 'celeb1', verification_type: 'blue' }); // baseline blue

      const profiles = await getProfiles();
      
      // Case 1: No recent posts, verify base category modifiers
      const weights1 = calculateCandidateWeights(profiles, []);
      
      const getWeight = (id: string, ws: any[]) => ws.find(w => w.profile.id === id).weight;

      // Unverified should have 1.2 boost
      expect(getWeight('ord1', weights1)).toBeCloseTo(1.2);
      expect(getWeight('ord2', weights1)).toBeCloseTo(1.2);
      // Gray/Gold should have 0.7 penalty
      expect(getWeight('gov1', weights1)).toBeCloseTo(0.7);
      expect(getWeight('corp1', weights1)).toBeCloseTo(0.7);
      // Blue should have standard 1.0
      expect(getWeight('celeb1', weights1)).toBeCloseTo(1.0);

      // Case 2: Corp1 posts heavily (activity decay)
      const allPosts = [
        { id: 'p1', author_id: 'corp1', content: 'ad 1' } as DreamXPost,
        { id: 'p2', author_id: 'corp1', content: 'ad 2' } as DreamXPost,
        { id: 'p3', author_id: 'corp1', content: 'ad 3' } as DreamXPost,
        { id: 'p4', author_id: 'corp1', content: 'ad 4' } as DreamXPost,
      ];

      const weights2 = calculateCandidateWeights(profiles, allPosts);
      
      // Activity penalty for 4 posts = 0.1 multiplier. 
      // Base category 0.7 * 0.1 = 0.07
      expect(getWeight('corp1', weights2)).toBeCloseTo(0.07);

      // Case 3: Ord1 mentioned (mention boost)
      allPosts.push({ id: 'p5', author_id: 'gov1', content: 'Hey @ord1' } as DreamXPost);
      const weights3 = calculateCandidateWeights(profiles, allPosts);
      
      // Base (2.5 mention) * 1.2 category = 3.0
      expect(getWeight('ord1', weights3)).toBeCloseTo(3.0);
    });

    it('distributes simulation selection evenly over a large deterministic run', () => {
      const profiles = [
        { id: 'ord1', verification_type: 'none', handle: 'ord1' },
        { id: 'ord2', verification_type: 'none', handle: 'ord2' },
        { id: 'ord3', verification_type: 'none', handle: 'ord3' },
        { id: 'gov1', verification_type: 'gray', handle: 'gov1' },
        { id: 'corp1', verification_type: 'gold', handle: 'corp1' },
        { id: 'corp2', verification_type: 'gold', handle: 'corp2' },
      ] as DreamXProfile[];

      const counts = { ord: 0, gov_corp: 0 };
      
      // Deterministically simulate 1000 rounds of weighted selection
      let allPosts: DreamXPost[] = [];
      for (let i = 0; i < 1000; i++) {
        const weights = calculateCandidateWeights(profiles, allPosts);
        
        // Pick top weight or randomly pick weighted. We simulate random weighted pick.
        const total = weights.reduce((acc, w) => acc + w.weight, 0);
        let random = (i % 100) / 100 * total; // pseudo-random distribution
        
        let selected: DreamXProfile = weights[0].profile;
        for (const item of weights) {
          if (random <= item.weight) {
            selected = item.profile;
            break;
          }
          random -= item.weight;
        }

        if (selected.verification_type === 'none') {
          counts.ord++;
        } else {
          counts.gov_corp++;
        }

        // Simulate activity: selected profile posts
        allPosts.push({ id: `p${i}`, author_id: selected.id, content: 'post' } as DreamXPost);
        // Keep feed window to last 50
        if (allPosts.length > 50) allPosts.shift();
      }

      // Ensure ordinary profiles got a meaningful share of the simulation (at least 300)
      expect(counts.ord).toBeGreaterThan(300);
      
      // Ensure they out-performed the penalized categories over time
      // 3 ords vs 3 gov/corp, ords have 1.2x boost and gov/corp have 0.7x penalty
      expect(counts.ord).toBeGreaterThan(counts.gov_corp);
    });
  });
});
