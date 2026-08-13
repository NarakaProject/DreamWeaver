import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getConversationFlat, 
  getPost,
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
    it('enforces direct-child thread semantics and deep navigation matrix (Round 4)', async () => {
      // Tree:
      // ROOT
      // ├── A
      // │   └── A.A
      // └── B
      //     └── B.A
      const root = await savePost({ author_id: 'u1', author_type: 'human', content: 'ROOT', reply_to_post_id: null });
      const postA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A', reply_to_post_id: root.id });
      const postAA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A.A', reply_to_post_id: postA.id });
      const postB = await savePost({ author_id: 'u1', author_type: 'human', content: 'B', reply_to_post_id: root.id });
      const postBA = await savePost({ author_id: 'u1', author_type: 'human', content: 'B.A', reply_to_post_id: postB.id });

      // 1. Target = ROOT
      const resROOT = await getConversationFlat(root.id);
      expect(resROOT.ancestors).toEqual([]);
      expect(resROOT.target.id).toBe(root.id);
      expect(resROOT.replies.map(p => p.id)).toEqual([postA.id, postB.id]);
      expect(resROOT.replies.map(p => p.id)).not.toContain(postAA.id);
      expect(resROOT.replies.map(p => p.id)).not.toContain(postBA.id);

      // Verify no duplicates
      const seqROOT = [...resROOT.ancestors, resROOT.target, ...resROOT.replies].map(p => p.id);
      expect(seqROOT.length).toBe(new Set(seqROOT).size);

      // 2. Target = A
      const resA = await getConversationFlat(postA.id);
      expect(resA.ancestors.map(a => a.id)).toEqual([root.id]);
      expect(resA.target.id).toBe(postA.id);
      expect(resA.replies.map(p => p.id)).toEqual([postAA.id]);
      expect(resA.replies.map(p => p.id)).not.toContain(postB.id);
      expect(resA.replies.map(p => p.id)).not.toContain(postBA.id);

      // 3. Target = A.A
      const resAA = await getConversationFlat(postAA.id);
      expect(resAA.ancestors.map(a => a.id)).toEqual([root.id, postA.id]);
      expect(resAA.target.id).toBe(postAA.id);
      expect(resAA.replies).toEqual([]);
      expect(resAA.ancestors.map(a => a.id)).not.toContain(postB.id);

      // 4. Target = B
      const resB = await getConversationFlat(postB.id);
      expect(resB.ancestors.map(a => a.id)).toEqual([root.id]);
      expect(resB.target.id).toBe(postB.id);
      expect(resB.replies.map(p => p.id)).toEqual([postBA.id]);
      expect(resB.replies.map(p => p.id)).not.toContain(postA.id);
      expect(resB.replies.map(p => p.id)).not.toContain(postAA.id);

      // 5. Target = B.A
      const resBA = await getConversationFlat(postBA.id);
      expect(resBA.ancestors.map(a => a.id)).toEqual([root.id, postB.id]);
      expect(resBA.target.id).toBe(postBA.id);
      expect(resBA.replies).toEqual([]);
      expect(resBA.ancestors.map(a => a.id)).not.toContain(postA.id);

      // Verify Interaction Counters (direct reply count)
      const populatedRoot = await getPost(root.id);
      const populatedA = await getPost(postA.id);
      const populatedAA = await getPost(postAA.id);
      const populatedB = await getPost(postB.id);
      const populatedBA = await getPost(postBA.id);

      expect(populatedRoot?.reply_count).toBe(2);
      expect(populatedA?.reply_count).toBe(1);
      expect(populatedAA?.reply_count).toBe(0);
      expect(populatedB?.reply_count).toBe(1);
      expect(populatedBA?.reply_count).toBe(0);
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
    
    it('prevents UNIQUE constraint loop by filtering out previously replied targets', async () => {
      const p1 = await saveProfile({ id: 'loop1', display_name: 'L1', handle: 'l1', verification_type: 'none' });
      const rootPost = await savePost({ author_id: 'loop1', author_type: 'ai', content: 'Loop root', reply_to_post_id: null });
      
      // Candidate has already replied to rootPost
      await savePost({ author_id: 'loop1', author_type: 'ai', content: 'Reply', reply_to_post_id: rootPost.id });

      const allPosts = [rootPost];
      const aiReplyEdges = new Set([`loop1:${rootPost.id}`]);

      // evaluateSocialUrgencyEvents should exclude rootPost because of aiReplyEdges
      const urgencyEvents = evaluateSocialUrgencyEvents([p1], allPosts, aiReplyEdges);
      expect(urgencyEvents.length).toBe(0);
    });
  });
});
