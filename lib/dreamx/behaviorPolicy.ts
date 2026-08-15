export interface ActionProbabilities {
  like: number;
  reply: number;
  post: number;
  no_action: number;
}

export interface BehaviorPolicy {
  actionProbabilities: ActionProbabilities;
  engagementSelectivity: number;
}

export interface RuntimeBehaviorContext {
  isUrgencyEvent?: boolean;
  isMentioned?: boolean;
}

export const DEFAULT_BEHAVIOR_POLICY: BehaviorPolicy = Object.freeze({
  actionProbabilities: Object.freeze({
    like: 0.35,
    reply: 0.35,
    post: 0.15,
    no_action: 0.15
  }),
  engagementSelectivity: 0.5
});

export const MENTION_BEHAVIOR_POLICY: BehaviorPolicy = Object.freeze({
  actionProbabilities: Object.freeze({
    like: 0.20,
    reply: 0.65,
    post: 0.0,
    no_action: 0.15
  }),
  engagementSelectivity: 0.8
});

export const HIGH_URGENCY_POLICY: BehaviorPolicy = Object.freeze({
  actionProbabilities: Object.freeze({
    like: 0.15, // corresponds to 0.70-0.85 in legacy
    reply: 0.70, // corresponds to 0-0.70 in legacy
    post: 0.0,
    no_action: 0.15 // corresponds to 0.85-1.0 in legacy
  }),
  engagementSelectivity: 1.0
});

/**
 * Returns a clean, independent clone of a BehaviorPolicy to prevent mutable aliasing.
 */
function clonePolicy(policy: BehaviorPolicy): BehaviorPolicy {
  return {
    actionProbabilities: {
      like: policy.actionProbabilities.like,
      reply: policy.actionProbabilities.reply,
      post: policy.actionProbabilities.post,
      no_action: policy.actionProbabilities.no_action,
    },
    engagementSelectivity: policy.engagementSelectivity
  };
}

/**
 * Validates a BehaviorPolicy object, ensuring probability constraints and residual calculations.
 * 
 * Rules:
 * - Rejects non-finite numbers (NaN, Infinity) or negative probabilities -> fallback to DEFAULT.
 * - Rejects over-budget distributions (> 1.001) without normalizing -> fallback to DEFAULT.
 * - Auto-assigns residual probability to `no_action` if omitted when activeSum <= 1.0.
 * - Clamps engagementSelectivity to [0.0, 1.0].
 * - Always returns a fresh independent policy object.
 */
export function validateBehaviorPolicy(policy: Partial<BehaviorPolicy> | null | undefined): BehaviorPolicy {
  if (!policy || !policy.actionProbabilities || typeof policy.actionProbabilities !== 'object') {
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }

  const probs = policy.actionProbabilities;
  const like = probs.like;
  const reply = probs.reply;
  const post = probs.post;
  const rawNoAction = probs.no_action;

  const isValidProb = (v: any) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

  const validLike = like !== undefined ? isValidProb(like) : true;
  const validReply = reply !== undefined ? isValidProb(reply) : true;
  const validPost = post !== undefined ? isValidProb(post) : true;
  const validNoAction = rawNoAction !== undefined ? isValidProb(rawNoAction) : true;

  if (!validLike || !validReply || !validPost || !validNoAction) {
    console.warn('Invalid BehaviorPolicy: non-finite or negative probability. Falling back to default.');
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }

  const numLike = like ?? 0;
  const numReply = reply ?? 0;
  const numPost = post ?? 0;

  const activeSum = numLike + numReply + numPost;

  // If active probabilities already exceed budget, strictly reject without normalizing
  if (activeSum > 1.001) {
    console.warn(`Invalid BehaviorPolicy: active probabilities sum to ${activeSum} (> 1.001). Falling back to default.`);
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }

  let numNoAction: number;
  if (rawNoAction === undefined || rawNoAction === null) {
    // Residual probability auto-assigned to no_action
    numNoAction = Math.max(0, Math.round((1.0 - activeSum) * 10000) / 10000);
  } else {
    numNoAction = rawNoAction;
  }

  const total = numLike + numReply + numPost + numNoAction;

  // Strict validation: Must sum to ~1.0 within tolerance. Never silently scale or distort over-budget distributions!
  if (total > 1.001 || total < 0.999) {
    console.warn(`Invalid BehaviorPolicy: probabilities sum to ${total}. Falling back to default.`);
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }

  let selectivity = DEFAULT_BEHAVIOR_POLICY.engagementSelectivity;
  if (typeof policy.engagementSelectivity === 'number' && Number.isFinite(policy.engagementSelectivity)) {
    selectivity = Math.max(0, Math.min(1.0, policy.engagementSelectivity));
  }

  return {
    actionProbabilities: {
      like: numLike,
      reply: numReply,
      post: numPost,
      no_action: numNoAction
    },
    engagementSelectivity: selectivity
  };
}

/**
 * Parses and validates a JSON-serialized BehaviorPolicy string from database storage.
 */
export function parseBehaviorPolicy(jsonString: string | null | undefined): BehaviorPolicy {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }
  try {
    const parsed = JSON.parse(jsonString);
    return validateBehaviorPolicy(parsed);
  } catch {
    console.warn('Failed to parse BehaviorPolicy JSON, returning default.');
    return clonePolicy(DEFAULT_BEHAVIOR_POLICY);
  }
}

/**
 * Pure function: Derives an effective BehaviorPolicy given an immutable baseline policy and runtime context.
 * 
 * Rules:
 * - Does not mutate basePolicy or standard policy constants.
 * - If isUrgencyEvent === true -> returns HIGH_URGENCY_POLICY.
 * - Else if isMentioned === true -> returns MENTION_BEHAVIOR_POLICY.
 * - Else -> returns basePolicy.
 */
export function deriveEffectiveBehavior(
  basePolicy: BehaviorPolicy,
  context?: RuntimeBehaviorContext
): BehaviorPolicy {
  if (context?.isUrgencyEvent) {
    return clonePolicy(HIGH_URGENCY_POLICY);
  }
  if (context?.isMentioned) {
    return clonePolicy(MENTION_BEHAVIOR_POLICY);
  }
  return clonePolicy(basePolicy || DEFAULT_BEHAVIOR_POLICY);
}

/**
 * Pure CDF lookup function mapping an actionChoice float in [0, 1) to a categorical social action.
 */
export function selectActionFromPolicy(
  policy: BehaviorPolicy,
  actionChoice: number,
  isUrgencyEvent: boolean = false
): 'like' | 'reply' | 'post' | 'no_action' {
  const p = policy.actionProbabilities;
  const round = (v: number) => Math.round(v * 10000) / 10000;
  
  if (isUrgencyEvent) {
    // Legacy High Urgency Order: REPLY, then LIKE, then NO_ACTION
    if (actionChoice < p.reply) return 'reply';
    if (actionChoice < round(p.reply + p.like)) return 'like';
    return 'no_action';
  } else {
    // Legacy Normal Order: LIKE, then REPLY, then POST, then NO_ACTION
    if (actionChoice < p.like) return 'like';
    if (actionChoice < round(p.like + p.reply)) return 'reply';
    if (actionChoice < round(p.like + p.reply + p.post)) return 'post';
    return 'no_action';
  }
}
