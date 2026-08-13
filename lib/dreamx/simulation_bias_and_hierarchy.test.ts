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
      
      // Test 1: Target = C
      const resultC = await getConversationFlat(replyC.id);
      expect(resultC.target.id).toBe(replyC.id);
      expect(resultC.root.id).toBe(root.id);
      expect(resultC.ancestors.map(a => a.id)).toEqual([root.id, replyA.id, replyB.id]);
      
      const convIdsC = resultC.conversation.map(p => p.id);
      expect(convIdsC).toContain(replyD.id);
      expect(convIdsC).not.toContain(replySibling.id);
      expect(convIdsC).not.toContain(replyC.id);
      expect(convIdsC).not.toContain(root.id);

      // Verify overall UI sequence A -> B -> C -> D has no duplicates
      const renderedSequenceC = [...resultC.ancestors, resultC.target, ...resultC.conversation].map(p => p.id);
      const uniqueIdsC = new Set(renderedSequenceC);
      expect(renderedSequenceC.length).toBe(uniqueIdsC.size); // No duplicates

      // Test 2: Target = A (Root)
      const resultA = await getConversationFlat(root.id);
      expect(resultA.ancestors).toEqual([]);
      expect(resultA.target.id).toBe(root.id);
      const convIdsA = resultA.conversation.map(p => p.id);
      expect(convIdsA).toContain(replyA.id);
      expect(convIdsA).toContain(replyC.id);
      expect(convIdsA).toContain(replyD.id);
      expect(convIdsA).toContain(replySibling.id);
      const renderedSequenceA = [...resultA.ancestors, resultA.target, ...resultA.conversation].map(p => p.id);
      expect(renderedSequenceA.length).toBe(new Set(renderedSequenceA).size);

      // Test 3: Target = D (Leaf)
      const resultD = await getConversationFlat(replyD.id);
      expect(resultD.ancestors.map(a => a.id)).toEqual([root.id, replyA.id, replyB.id, replyC.id]);
      expect(resultD.target.id).toBe(replyD.id);
      expect(resultD.conversation).toEqual([]); // D has no descendants
      const renderedSequenceD = [...resultD.ancestors, resultD.target, ...resultD.conversation].map(p => p.id);
      expect(renderedSequenceD.length).toBe(new Set(renderedSequenceD).size);
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

      // Unverified should have 1.5 boost
      expect(getWeight('ord1', weights1)).toBeCloseTo(1.5);
      expect(getWeight('ord2', weights1)).toBeCloseTo(1.5);
      // Gray/Gold/Blue should have 0.5 penalty
      expect(getWeight('gov1', weights1)).toBeCloseTo(0.5);
      expect(getWeight('corp1', weights1)).toBeCloseTo(0.5);
      expect(getWeight('celeb1', weights1)).toBeCloseTo(0.5);

      // Case 2: Corp1 posts heavily (activity decay)
      const allPosts = [
        { id: 'p1', author_id: 'corp1', content: 'ad 1' } as DreamXPost,
        { id: 'p2', author_id: 'corp1', content: 'ad 2' } as DreamXPost,
        { id: 'p3', author_id: 'corp1', content: 'ad 3' } as DreamXPost,
        { id: 'p4', author_id: 'corp1', content: 'ad 4' } as DreamXPost,
      ];

      const weights2 = calculateCandidateWeights(profiles, allPosts);
      
      // Activity penalty for 4 posts = 0.1 multiplier. 
      // Base category 0.5 * 0.1 = 0.05
      expect(getWeight('corp1', weights2)).toBeCloseTo(0.05);

      // Case 3: Ord1 mentioned (mention boost)
      allPosts.push({ id: 'p5', author_id: 'gov1', content: 'Hey @ord1' } as DreamXPost);
      const weights3 = calculateCandidateWeights(profiles, allPosts);
      
      // Base (2.5 mention) * 1.5 category = 3.75
      expect(getWeight('ord1', weights3)).toBeCloseTo(3.75);
    });

    it('distributes simulation selection evenly over a large deterministic run avoiding single-category dominance', () => {
      // 10 Ordinary, 5 Blue, 3 Gold, 2 Gray (Total 20)
      const profiles: DreamXProfile[] = [];
      for (let i=0; i<10; i++) profiles.push({ id: `ord${i}`, verification_type: 'none', handle: `ord${i}` } as DreamXProfile);
      for (let i=0; i<5; i++) profiles.push({ id: `blue${i}`, verification_type: 'blue', handle: `blue${i}` } as DreamXProfile);
      for (let i=0; i<3; i++) profiles.push({ id: `gold${i}`, verification_type: 'gold', handle: `gold${i}` } as DreamXProfile);
      for (let i=0; i<2; i++) profiles.push({ id: `gray${i}`, verification_type: 'gray', handle: `gray${i}` } as DreamXProfile);

      const counts = { ord: 0, blue: 0, gold: 0, gray: 0 };
      
      // Deterministically simulate 1000 rounds of weighted selection
      let allPosts: DreamXPost[] = [];
      for (let i = 0; i < 1000; i++) {
        const weights = calculateCandidateWeights(profiles, allPosts);
        
        // Pick top weight or randomly pick weighted. We simulate random weighted pick.
        const total = weights.reduce((acc, w) => acc + w.weight, 0);
        let random = ((i * 17) % 100) / 100 * total; // pseudo-random deterministic distribution
        
        let selected: DreamXProfile = weights[0].profile;
        for (const item of weights) {
          if (random <= item.weight) {
            selected = item.profile;
            break;
          }
          random -= item.weight;
        }

        if (selected.verification_type === 'none') counts.ord++;
        else if (selected.verification_type === 'blue') counts.blue++;
        else if (selected.verification_type === 'gold') counts.gold++;
        else if (selected.verification_type === 'gray') counts.gray++;

        // Simulate activity: selected profile posts
        allPosts.push({ id: `p${i}`, author_id: selected.id, content: 'post' } as DreamXPost);
        // Keep feed window to last 100 (matches getRecentSimulationPosts limit)
        if (allPosts.length > 100) allPosts.shift();
      }

      const total = counts.ord + counts.blue + counts.gold + counts.gray;
      const pctOrd = counts.ord / total;
      const pctBlue = counts.blue / total;

      // Ensure no single verified category generates an absolute majority
      expect(pctBlue).toBeLessThan(0.5);
      expect(counts.gold / total).toBeLessThan(0.5);
      expect(counts.gray / total).toBeLessThan(0.5);
      
      // Ensure regular users maintain a meaningful presence (e.g. at least 35%)
      expect(pctOrd).toBeGreaterThan(0.35);
      
      // Ensure high-profile users still appear (e.g. blue at least 10%)
      expect(pctBlue).toBeGreaterThan(0.10);
    });
  });
});
