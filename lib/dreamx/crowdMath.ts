/**
 * DREAMX CORE/CROWD MATHEMATICAL KERNEL
 *
 * Pure mathematical domain logic for the Simulated Crowd Layer.
 * All functions must remain side-effect free, deterministic, and isolated from SQLite or runtime states.
 */

// --- UTILITIES ---

/** Clamps a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// --- FOLLOWER SCALING MODEL ---

export interface FollowerGrowthParams {
  currentFollowers: number;
  baselineInfluence: number; // 0 to 100+
  carryingCapacity: number;  // Max theoretical followers (e.g. 100,000,000)
  viralMomentum: number;     // Multiplier from recent viral events (e.g. 0 to 5)
  sentiment: number;         // -1.0 to 1.0
  sentimentVelocity: number; // Rate of change of sentiment (-1.0 to 1.0)
  stochasticNoise: number;   // Injected random/seeded noise (-0.05 to 0.05)
}

export interface FollowerGrowthResult {
  delta: number;
  newFollowers: number;
  growthRate: number;
  saturationFactor: number;
}

/**
 * Calculates deterministic follower growth using a modified logistic equation.
 * Accounts for baseline growth, viral spikes, and controversy collapse.
 */
export function calculateFollowerDelta(params: FollowerGrowthParams): FollowerGrowthResult {
  const {
    currentFollowers,
    baselineInfluence,
    carryingCapacity,
    viralMomentum,
    sentiment,
    sentimentVelocity,
    stochasticNoise
  } = params;

  // 1. Saturation Factor (0 to 1) - how close we are to carrying capacity
  const cap = Math.max(1, carryingCapacity);
  const saturationFactor = clamp(1 - (currentFollowers / cap), 0, 1);

  // 2. Controversy Collapse
  // If sentiment drops very low, and velocity is negative, people unfollow.
  let controversyMultiplier = 1.0;
  if (sentiment < -0.5 && sentimentVelocity < 0) {
    controversyMultiplier = sentiment * 2; // e.g. -0.8 * 2 = -1.6 (negative growth)
  }

  // 3. Raw Growth and Saturation
  // Base growth scales with influence.
  const baseGrowth = baselineInfluence * 10;
  const viralGrowth = baseGrowth * viralMomentum;

  const rawGrowth = (baseGrowth + viralGrowth) * controversyMultiplier;

  let rawDelta = 0;
  if (rawGrowth >= 0) {
    // Throttled by carrying capacity
    rawDelta = rawGrowth * saturationFactor;
  } else {
    // Negative growth (follower loss) is NOT throttled by carrying capacity
    rawDelta = rawGrowth;
  }

  // 4. Noise
  rawDelta = rawDelta * (1 + stochasticNoise);

  // Round to nearest integer
  const delta = Math.round(rawDelta);
  const newFollowers = Math.max(0, currentFollowers + delta);
  const actualDelta = newFollowers - currentFollowers;

  return {
    delta: actualDelta,
    newFollowers,
    growthRate: currentFollowers > 0 ? actualDelta / currentFollowers : 0,
    saturationFactor
  };
}


// --- CATALYST NODE PROPAGATION ---

export interface CatalystPropagationParams {
  catalystInfluence: number;       // 0 to 100+
  catalystFollowers: number;       // 0 to millions
  targetAuthorInfluence: number;   // 0 to 100+
  targetPostQuality: number;       // 0.0 to 1.0
  topicAffinity: number;           // 0.0 to 1.0
  factionAffinity: number;         // 0.0 to 1.0
  currentMomentum: number;         // existing momentum multiplier
}

export interface CatalystPropagationResult {
  addedImpressions: number;
  addedLikes: number;
  addedReposts: number;
  engagementMultiplier: number;
  momentumContribution: number;
}

/**
 * Calculates the shockwave effect of a high-influence agent interacting with a post.
 * O(1) complexity, no follower loops.
 */
export function calculateCatalystPropagation(params: CatalystPropagationParams): CatalystPropagationResult {
  const {
    catalystInfluence,
    catalystFollowers,
    targetAuthorInfluence,
    targetPostQuality,
    topicAffinity,
    factionAffinity,
    currentMomentum
  } = params;

  // Base exposure from the catalyst's audience
  // Only a fraction of the catalyst's followers will actually see/care about this interaction
  const safeFollowers = Math.max(0, catalystFollowers);
  const exposureRatio = clamp(0.01 + (topicAffinity * 0.04), 0.01, 0.1);
  let addedImpressions = safeFollowers * exposureRatio;

  // Quality and faction affinity determine conversion from impressions to engagement
  const conversionRate = clamp(targetPostQuality * factionAffinity * 0.05, 0.001, 0.15);

  const addedLikes = Math.round(addedImpressions * conversionRate);
  const addedReposts = Math.round(addedLikes * 0.1); // Reposts are ~10% of likes conceptually

  // The momentum contribution is relative to the target's existing influence
  const influenceGap = Math.max(1, catalystInfluence - targetAuthorInfluence);
  const momentumContribution = (influenceGap / 100) * topicAffinity * (1 + currentMomentum * 0.1);

  return {
    addedImpressions: Math.round(addedImpressions),
    addedLikes,
    addedReposts,
    engagementMultiplier: 1 + momentumContribution,
    momentumContribution
  };
}


// --- IMPLICIT ENGAGEMENT MODEL ---

export interface PostEngagementParams {
  authorInfluence: number;       // 0 to 100+
  authorFollowers: number;       // audience size
  postQuality: number;           // 0.0 to 1.0
  controversy: number;           // 0.0 to 1.0
  networkMomentum: number;       // Multiplier from catalyst interactions
  ageHours: number;              // Age of the post
}

export interface PostEngagementResult {
  impressions: number;
  crowdLikes: number;
  crowdReposts: number;
  engagementRate: number;
}

/**
 * Estimates organic crowd engagement for a post using a decay model.
 */
export function estimatePostEngagement(params: PostEngagementParams): PostEngagementResult {
  const { authorInfluence, authorFollowers, postQuality, controversy, networkMomentum, ageHours } = params;

  // 1. Time Decay (Half-life model)
  // Decay lambda ~0.05 means engagement halves roughly every 14 hours.
  const timeDecay = Math.exp(-0.05 * Math.max(0, ageHours));

  // 2. Base Reach (Impressions)
  // Base reach within own audience
  const baseReachFactor = clamp(0.1 + (controversy * 0.1), 0.05, 0.8);

  // Algorithmic discovery multiplier driven by networkMomentum
  // A linear multiplier guarantees monotonic scaling without runaway exponential explosion
  const discoveryMultiplier = 1 + Math.max(0, networkMomentum);

  let baseImpressions = authorFollowers * baseReachFactor * discoveryMultiplier;

  // Absolute cap to prevent astronomical mathematical runaway
  baseImpressions = Math.min(baseImpressions, 100_000_000);

  // Apply time decay to impressions
  const impressions = Math.max(0, Math.round(baseImpressions * timeDecay));

  // 3. Conversion (Likes & Reposts)
  // High quality = high likes. High controversy = mixed likes, high reposts.
  const likeConversion = clamp(postQuality * 0.1, 0.001, 0.2);
  const repostConversion = clamp(controversy * 0.05 + postQuality * 0.02, 0.001, 0.1);

  const crowdLikes = Math.max(0, Math.round(impressions * likeConversion));
  const crowdReposts = Math.max(0, Math.round(impressions * repostConversion));

  const engagementRate = impressions > 0 ? (crowdLikes + crowdReposts) / impressions : 0;

  return {
    impressions,
    crowdLikes,
    crowdReposts,
    engagementRate
  };
}


// --- SENTIMENT VELOCITY ---

/**
 * Distinguishes normalized sentiment from its rate of change.
 */
export function calculateSentimentVelocity(currentSentiment: number, previousSentiment: number, deltaTimeHours: number): number {
  if (deltaTimeHours <= 0) return 0;

  // Normalized delta
  const delta = clamp(currentSentiment, -1, 1) - clamp(previousSentiment, -1, 1);

  // Velocity is rate of change per hour, clamped to realistic bounds [-2, 2]
  return clamp(delta / deltaTimeHours, -2, 2);
}


// --- MAGNETISM DETECTION ---

export interface MagnetismResult {
  anomalyScore: number;
  isMagnet: boolean;
}

/**
 * Detects whether a post is receiving abnormal attention.
 * Uses a safe Z-score analog.
 */
export function detectMagnetism(
  observedEngagement: number,
  expectedEngagement: number,
  historicalStdDev: number
): MagnetismResult {
  if (expectedEngagement <= 0 && observedEngagement === 0) return { anomalyScore: 0, isMagnet: false };
  if (expectedEngagement <= 0) {
    // If we expect zero but got something, it's highly magnetic if the absolute number is meaningful.
    return { anomalyScore: observedEngagement > 10 ? 5 : 0, isMagnet: observedEngagement > 10 };
  }

  // Safe standard deviation to prevent divide-by-zero
  const safeStdDev = Math.max(historicalStdDev, expectedEngagement * 0.1, 1);

  const zScore = (observedEngagement - expectedEngagement) / safeStdDev;

  return {
    anomalyScore: Math.max(0, zScore), // We only care about positive magnetism
    isMagnet: zScore > 3.0 // 3 standard deviations above expected
  };
}


// --- ECHO CHAMBER / NETWORK BIAS ---

export interface NetworkEdge {
  sourceFaction: string;
  targetFaction: string;
}

export interface NetworkBiasResult {
  crossFactionRatio: number;
  isEchoChamber: boolean;
  totalEdges: number;
}

/**
 * Operates strictly on the Core Agent graph edges to determine network bias.
 */
export function calculateNetworkBias(edges: NetworkEdge[]): NetworkBiasResult {
  const totalEdges = edges.length;
  if (totalEdges === 0) {
    return { crossFactionRatio: 0, isEchoChamber: false, totalEdges: 0 };
  }

  let crossFactionCount = 0;
  for (const edge of edges) {
    if (edge.sourceFaction !== edge.targetFaction) {
      crossFactionCount++;
    }
  }

  const crossFactionRatio = crossFactionCount / totalEdges;

  return {
    crossFactionRatio,
    // Arbitrary threshold for echo chamber: less than 10% cross-faction interaction
    isEchoChamber: totalEdges > 10 && crossFactionRatio < 0.1,
    totalEdges
  };
}


// --- KL DIVERGENCE ---

/**
 * Calculates Kullback-Leibler Divergence KL(P || Q) for two discrete probability distributions.
 * P = True distribution (e.g., Normal behavior)
 * Q = Approximating distribution (e.g., Burst behavior)
 *
 * Safe against zero probabilities via epsilon smoothing.
 */
export function klDivergence(p: number[], q: number[]): number {
  if (p.length !== q.length || p.length === 0) return 0;

  const epsilon = 1e-10;
  let divergence = 0;

  for (let i = 0; i < p.length; i++) {
    // Smooth probabilities to prevent log(0) or divide-by-zero
    const pSafe = Math.max(p[i], epsilon);
    const qSafe = Math.max(q[i], epsilon);

    divergence += pSafe * Math.log(pSafe / qSafe);
  }

  // Floating point precision could result in very tiny negative numbers
  return Math.max(0, divergence);
}


// --- NORMAL VS BURST CONSISTENCY ---

export interface BehavioralDistribution {
  posts: number;
  replies: number;
  likes: number;
  reposts: number;
  follows: number;
}

export interface ConsistencyResult {
  divergenceScore: number;
  isConsistent: boolean;
}

function normalizeDistribution(dist: BehavioralDistribution): number[] {
  const sum = dist.posts + dist.replies + dist.likes + dist.reposts + dist.follows;
  if (sum === 0) return [0.2, 0.2, 0.2, 0.2, 0.2]; // Uniform fallback if no actions
  return [
    dist.posts / sum,
    dist.replies / sum,
    dist.likes / sum,
    dist.reposts / sum,
    dist.follows / sum
  ];
}

/**
 * Compares Normal vs Burst behavioral distributions to ensure
 * stress-testing doesn't change the underlying agent character.
 */
export function compareBehavioralConsistency(normal: BehavioralDistribution, burst: BehavioralDistribution): ConsistencyResult {
  const p = normalizeDistribution(normal);
  const q = normalizeDistribution(burst);

  const divergenceScore = klDivergence(p, q);

  return {
    divergenceScore,
    // A divergence score > 0.5 typically indicates a significant distributional shift
    isConsistent: divergenceScore < 0.5
  };
}


// --- ELTM ANALYTICS KERNEL ---

export interface EltmMetricsResult {
  consolidationRatio: number;
  retrievalRate: number;
}

/**
 * Pure metrics for Episodic Long-Term Memory analytics.
 */
export function calculateEltmMetrics(rawMemoriesCount: number, summaryMemoriesCount: number, retrievalHits: number, totalQueries: number): EltmMetricsResult {
  return {
    consolidationRatio: rawMemoriesCount > 0 ? summaryMemoriesCount / rawMemoriesCount : 0,
    retrievalRate: totalQueries > 0 ? Math.min(1.0, retrievalHits / totalQueries) : 0
  };
}
