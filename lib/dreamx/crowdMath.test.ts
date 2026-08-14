import { describe, it, expect } from 'vitest';
import {
  calculateFollowerDelta,
  calculateCatalystPropagation,
  estimatePostEngagement,
  calculateSentimentVelocity,
  detectMagnetism,
  calculateNetworkBias,
  klDivergence,
  compareBehavioralConsistency,
  calculateEltmMetrics,
  clamp
} from './crowdMath';

describe('DreamX Core/Crowd Mathematical Kernel', () => {

  describe('Utility: clamp', () => {
    it('clamps correctly', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('Follower Scaling Model', () => {
    it('provides baseline growth', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 1000,
        baselineInfluence: 10,
        carryingCapacity: 100000,
        viralMomentum: 0,
        sentiment: 0.5,
        sentimentVelocity: 0.1,
        stochasticNoise: 0
      });
      expect(result.delta).toBeGreaterThan(0);
      expect(result.newFollowers).toBe(1000 + result.delta);
      expect(result.saturationFactor).toBeCloseTo(0.99, 2);
    });

    it('slows down near carrying capacity', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 99000,
        baselineInfluence: 10,
        carryingCapacity: 100000,
        viralMomentum: 0,
        sentiment: 0.5,
        sentimentVelocity: 0.1,
        stochasticNoise: 0
      });
      expect(result.saturationFactor).toBeCloseTo(0.01, 2);
      expect(result.delta).toBeLessThan(5); // Very slow growth
    });

    it('produces negative follower delta when sentiment is extremely negative and falling', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 5000,
        baselineInfluence: 10,
        carryingCapacity: 100000,
        viralMomentum: 0,
        sentiment: -0.8,
        sentimentVelocity: -0.5,
        stochasticNoise: 0
      });
      expect(result.delta).toBeLessThan(0);
      expect(result.newFollowers).toBeLessThan(5000);
    });

    it('handles viral spike', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 5000,
        baselineInfluence: 10,
        carryingCapacity: 100000,
        viralMomentum: 10,
        sentiment: 0.5,
        sentimentVelocity: 0.1,
        stochasticNoise: 0
      });
      expect(result.delta).toBeGreaterThan(500);
    });

    it('bounds lower limit at zero followers', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 5,
        baselineInfluence: 10,
        carryingCapacity: 100000,
        viralMomentum: 0,
        sentiment: -1.0,
        sentimentVelocity: -1.0,
        stochasticNoise: 0
      });
      // A massive collapse on a tiny audience
      expect(result.newFollowers).toBeGreaterThanOrEqual(0);
    });

    it('maintains extreme input stability', () => {
      const result = calculateFollowerDelta({
        currentFollowers: 999999999,
        baselineInfluence: 1000000,
        carryingCapacity: 1000,
        viralMomentum: 5000,
        sentiment: 50,
        sentimentVelocity: -50,
        stochasticNoise: 10
      });
      expect(result.newFollowers).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.newFollowers)).toBe(true);
    });

    describe('RED Defect Fix - Follower Loss at Carrying Capacity', () => {
      it('Test A — Celebrity at capacity loses followers', () => {
        const result = calculateFollowerDelta({
          currentFollowers: 100000000,
          carryingCapacity: 100000000,
          baselineInfluence: 10,
          viralMomentum: 0,
          sentiment: -1.0,
          sentimentVelocity: -0.5,
          stochasticNoise: 0
        });
        expect(result.delta).toBeLessThan(0);
        expect(result.newFollowers).toBeLessThan(100000000);
      });

      it('Test B — Celebrity above capacity can lose followers', () => {
        const result = calculateFollowerDelta({
          currentFollowers: 120000000,
          carryingCapacity: 100000000,
          baselineInfluence: 10,
          viralMomentum: 0,
          sentiment: -1.0,
          sentimentVelocity: -0.5,
          stochasticNoise: 0
        });
        expect(result.delta).toBeLessThan(0);
        expect(result.newFollowers).toBeLessThan(120000000);
      });

      it('Test C — Healthy celebrity at capacity does not grow indefinitely', () => {
        const result = calculateFollowerDelta({
          currentFollowers: 100000000,
          carryingCapacity: 100000000,
          baselineInfluence: 10,
          viralMomentum: 5,
          sentiment: 1.0,
          sentimentVelocity: 0.5,
          stochasticNoise: 0
        });
        // Saturated, so positive growth approaches zero
        expect(result.delta).toBeLessThanOrEqual(5);
      });

      it('Test D — Followers never become negative under extreme loss', () => {
        const result = calculateFollowerDelta({
          currentFollowers: 10, // tiny base
          carryingCapacity: 100000000,
          baselineInfluence: 100,
          viralMomentum: 50,
          sentiment: -1.0,
          sentimentVelocity: -1.0,
          stochasticNoise: 0
        });
        expect(result.delta).toBeLessThan(0);
        expect(result.newFollowers).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Catalyst Propagation Model', () => {
    it('handles low-influence vs high-influence catalyst', () => {
      const lowResult = calculateCatalystPropagation({
        catalystInfluence: 5,
        catalystFollowers: 100,
        targetAuthorInfluence: 2,
        targetPostQuality: 0.5,
        topicAffinity: 0.5,
        factionAffinity: 0.5,
        currentMomentum: 0
      });

      const highResult = calculateCatalystPropagation({
        catalystInfluence: 95,
        catalystFollowers: 1000000,
        targetAuthorInfluence: 2,
        targetPostQuality: 0.5,
        topicAffinity: 0.5,
        factionAffinity: 0.5,
        currentMomentum: 0
      });

      expect(highResult.addedImpressions).toBeGreaterThan(lowResult.addedImpressions);
      expect(highResult.momentumContribution).toBeGreaterThan(lowResult.momentumContribution);
    });

    it('adjusts engagement based on target post quality and topic affinity', () => {
      const highQualityResult = calculateCatalystPropagation({
        catalystInfluence: 50,
        catalystFollowers: 10000,
        targetAuthorInfluence: 5,
        targetPostQuality: 1.0,
        topicAffinity: 1.0,
        factionAffinity: 1.0,
        currentMomentum: 0
      });

      const lowQualityResult = calculateCatalystPropagation({
        catalystInfluence: 50,
        catalystFollowers: 10000,
        targetAuthorInfluence: 5,
        targetPostQuality: 0.1,
        topicAffinity: 1.0,
        factionAffinity: 1.0,
        currentMomentum: 0
      });

      expect(highQualityResult.addedLikes).toBeGreaterThan(lowQualityResult.addedLikes);
    });

    it('never returns negative values', () => {
      const result = calculateCatalystPropagation({
        catalystInfluence: -50,
        catalystFollowers: -10000,
        targetAuthorInfluence: 5,
        targetPostQuality: -1.0,
        topicAffinity: -1.0,
        factionAffinity: -1.0,
        currentMomentum: -50
      });
      expect(result.addedImpressions).toBeGreaterThanOrEqual(0);
      expect(result.addedLikes).toBeGreaterThanOrEqual(0);
      expect(result.addedReposts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Engagement Model', () => {
    it('handles normal post vs high quality vs controversial post', () => {
      const base = { authorInfluence: 50, authorFollowers: 10000, networkMomentum: 0, ageHours: 1 };

      const normal = estimatePostEngagement({ ...base, postQuality: 0.5, controversy: 0.1 });
      const highQual = estimatePostEngagement({ ...base, postQuality: 1.0, controversy: 0.1 });
      const controv = estimatePostEngagement({ ...base, postQuality: 0.5, controversy: 1.0 });

      expect(highQual.crowdLikes).toBeGreaterThan(normal.crowdLikes);
      expect(controv.crowdReposts).toBeGreaterThan(normal.crowdReposts);
    });

    it('decays over time', () => {
      const base = { authorInfluence: 50, authorFollowers: 10000, postQuality: 0.5, controversy: 0.1, networkMomentum: 0 };
      const newPost = estimatePostEngagement({ ...base, ageHours: 0 });
      const oldPost = estimatePostEngagement({ ...base, ageHours: 24 });

      expect(newPost.impressions).toBeGreaterThan(oldPost.impressions);
    });

    it('returns zero safely', () => {
      const zero = estimatePostEngagement({
        authorInfluence: 0, authorFollowers: 0, postQuality: 0, controversy: 0, networkMomentum: 0, ageHours: 0
      });
      expect(zero.impressions).toBe(0);
      expect(zero.engagementRate).toBe(0);
    });

    describe('YELLOW Defect Fix - Organic Discovery Ceiling', () => {
      it('Test E — Small account can go viral', () => {
        const result = estimatePostEngagement({
          authorInfluence: 10,
          authorFollowers: 10, // Tiny account
          postQuality: 1.0,
          controversy: 0,
          networkMomentum: 1000, // Very high
          ageHours: 0
        });
        expect(result.impressions).toBeGreaterThan(10);
        // It should reach thousands due to discovery multiplier applied to the base follower pool (100)
        expect(result.impressions).toBeGreaterThan(1000);
      });

      it('Test F — Discovery is monotonic', () => {
        const base = { authorInfluence: 10, authorFollowers: 100, postQuality: 0.5, controversy: 0, ageHours: 0 };
        const low = estimatePostEngagement({ ...base, networkMomentum: 10 });
        const high = estimatePostEngagement({ ...base, networkMomentum: 100 });
        const higher = estimatePostEngagement({ ...base, networkMomentum: 1000 });

        expect(high.impressions).toBeGreaterThanOrEqual(low.impressions);
        expect(higher.impressions).toBeGreaterThanOrEqual(high.impressions);
      });

      it('Test G — Extreme momentum remains bounded', () => {
        const result = estimatePostEngagement({
          authorInfluence: 100,
          authorFollowers: 1000000,
          postQuality: 1.0,
          controversy: 1.0,
          networkMomentum: 1e12, // Absurd momentum
          ageHours: 0
        });

        expect(Number.isFinite(result.impressions)).toBe(true);
        expect(Number.isFinite(result.crowdLikes)).toBe(true);
        expect(Number.isFinite(result.crowdReposts)).toBe(true);

        // Expect it capped safely below astronomical numbers
        expect(result.impressions).toBeLessThanOrEqual(100000000); // 100M cap
      });
    });
  });

  describe('Sentiment Velocity', () => {
    it('calculates velocity correctly', () => {
      expect(calculateSentimentVelocity(0.5, 0.1, 1)).toBeCloseTo(0.4);
      expect(calculateSentimentVelocity(-0.5, 0.5, 2)).toBeCloseTo(-0.5); // (-0.5 - 0.5) / 2 = -0.5
      expect(calculateSentimentVelocity(0, 0, 1)).toBe(0);
    });

    it('clamps velocity', () => {
      expect(calculateSentimentVelocity(1.0, -1.0, 0.1)).toBeCloseTo(2.0); // (1 - -1) / 0.1 = 20, clamped to 2
    });
  });

  describe('Magnetism Detection', () => {
    it('detects normal vs anomaly', () => {
      const normal = detectMagnetism(105, 100, 10);
      expect(normal.isMagnet).toBe(false);

      const anomaly = detectMagnetism(150, 100, 10); // z-score = 5
      expect(anomaly.isMagnet).toBe(true);
      expect(anomaly.anomalyScore).toBe(5);
    });

    it('handles zero expected engagement gracefully', () => {
      const zeroVariance = detectMagnetism(20, 0, 0);
      expect(zeroVariance.isMagnet).toBe(true); // > 10 is considered magnetic if expected is 0
    });

    it('handles zero variance safely', () => {
      const safe = detectMagnetism(110, 100, 0); // safeStdDev will be 10 (10% of 100)
      expect(safe.anomalyScore).toBe(1); // (110 - 100) / 10 = 1
    });
  });

  describe('Echo Chamber Detection', () => {
    it('calculates perfect cross-faction', () => {
      const edges = [
        { sourceFaction: 'A', targetFaction: 'B' },
        { sourceFaction: 'A', targetFaction: 'C' }
      ];
      const res = calculateNetworkBias(edges);
      expect(res.crossFactionRatio).toBe(1.0);
      expect(res.isEchoChamber).toBe(false);
    });

    it('detects extreme homophily', () => {
      const edges = Array(11).fill({ sourceFaction: 'A', targetFaction: 'A' });
      const res = calculateNetworkBias(edges);
      expect(res.crossFactionRatio).toBe(0.0);
      expect(res.isEchoChamber).toBe(true); // > 10 edges, ratio < 0.1
    });

    it('handles isolated agents (zero edges)', () => {
      const res = calculateNetworkBias([]);
      expect(res.crossFactionRatio).toBe(0);
      expect(res.isEchoChamber).toBe(false); // Insufficient data
    });
  });

  describe('KL Divergence', () => {
    it('identical distributions -> approximately zero', () => {
      const p = [0.2, 0.2, 0.2, 0.2, 0.2];
      const div = klDivergence(p, p);
      expect(div).toBeCloseTo(0, 5);
    });

    it('clearly different distributions', () => {
      const p = [0.8, 0.1, 0.1, 0, 0];
      const q = [0.1, 0.1, 0.1, 0.6, 0.1];
      const div = klDivergence(p, q);
      expect(div).toBeGreaterThan(1);
    });

    it('handles zeroes gracefully via epsilon smoothing', () => {
      const p = [1, 0, 0];
      const q = [0, 1, 0];
      expect(klDivergence(p, q)).toBeGreaterThan(0);
      expect(Number.isFinite(klDivergence(p, q))).toBe(true);
    });
  });

  describe('Normal vs Burst Consistency', () => {
    it('detects consistent behavior despite higher volume', () => {
      const normal = { posts: 10, replies: 10, likes: 10, reposts: 10, follows: 10 };
      const burst = { posts: 100, replies: 100, likes: 100, reposts: 100, follows: 100 }; // Same normalized distribution

      const res = compareBehavioralConsistency(normal, burst);
      expect(res.isConsistent).toBe(true);
      expect(res.divergenceScore).toBeCloseTo(0, 5);
    });

    it('detects divergent behavior', () => {
      const normal = { posts: 10, replies: 90, likes: 50, reposts: 5, follows: 5 };
      const burst = { posts: 100, replies: 0, likes: 0, reposts: 0, follows: 0 }; // Agent suddenly only posts

      const res = compareBehavioralConsistency(normal, burst);
      expect(res.isConsistent).toBe(false);
      expect(res.divergenceScore).toBeGreaterThan(0.5);
    });
  });

  describe('ELTM Analytics', () => {
    it('calculates metrics', () => {
      const res = calculateEltmMetrics(100, 25, 50, 200);
      expect(res.consolidationRatio).toBe(0.25);
      expect(res.retrievalRate).toBe(0.25);
    });

    it('handles zeroes', () => {
      const res = calculateEltmMetrics(0, 0, 0, 0);
      expect(res.consolidationRatio).toBe(0);
      expect(res.retrievalRate).toBe(0);
    });
  });

  describe('Property / Invariants Check', () => {
    it('never produces negative followers or engagement', () => {
      const fDelta = calculateFollowerDelta({
        currentFollowers: 0, baselineInfluence: -10, carryingCapacity: 0, viralMomentum: -10, sentiment: -1, sentimentVelocity: -1, stochasticNoise: 10
      });
      expect(fDelta.newFollowers).toBeGreaterThanOrEqual(0);

      const prop = calculateCatalystPropagation({
        catalystInfluence: -10, catalystFollowers: -1000, targetAuthorInfluence: -10, targetPostQuality: -1, topicAffinity: -1, factionAffinity: -1, currentMomentum: -1
      });
      expect(prop.addedImpressions).toBeGreaterThanOrEqual(0);
      expect(prop.addedLikes).toBeGreaterThanOrEqual(0);

      const eng = estimatePostEngagement({
        authorInfluence: -1, authorFollowers: -100, postQuality: -1, controversy: -1, networkMomentum: -1, ageHours: -1
      });
      expect(eng.impressions).toBeGreaterThanOrEqual(0);
      expect(eng.crowdLikes).toBeGreaterThanOrEqual(0);
    });

    it('engagement <= impressions', () => {
      const eng = estimatePostEngagement({
        authorInfluence: 100, authorFollowers: 10000, postQuality: 1, controversy: 1, networkMomentum: 1, ageHours: 0
      });
      expect(eng.crowdLikes + eng.crowdReposts).toBeLessThanOrEqual(eng.impressions);
    });

    it('KL divergence is always >= 0', () => {
      const p = [0.1, 0.9];
      const q = [0.5, 0.5];
      expect(klDivergence(p, q)).toBeGreaterThanOrEqual(0);
      expect(klDivergence(q, p)).toBeGreaterThanOrEqual(0);
    });
  });

});
