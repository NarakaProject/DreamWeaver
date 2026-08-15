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

export const DEFAULT_BEHAVIOR_POLICY: BehaviorPolicy = {
  actionProbabilities: {
    like: 0.35,
    reply: 0.35,
    post: 0.15,
    no_action: 0.15
  },
  engagementSelectivity: 0.5
};

export const MENTION_BEHAVIOR_POLICY: BehaviorPolicy = {
  actionProbabilities: {
    like: 0.20,
    reply: 0.65,
    post: 0.0,
    no_action: 0.15
  },
  engagementSelectivity: 0.8
};

export const HIGH_URGENCY_POLICY: BehaviorPolicy = {
  actionProbabilities: {
    like: 0.15, // corresponds to 0.70-0.85 in legacy
    reply: 0.70, // corresponds to 0-0.70 in legacy
    post: 0.0,
    no_action: 0.15 // corresponds to 0.85-1.0 in legacy
  },
  engagementSelectivity: 1.0
};

export function validateBehaviorPolicy(policy: Partial<BehaviorPolicy> | null): BehaviorPolicy {
  if (!policy || !policy.actionProbabilities) {
    return DEFAULT_BEHAVIOR_POLICY;
  }

  const probs = policy.actionProbabilities;
  const like = probs.like ?? 0;
  const reply = probs.reply ?? 0;
  const post = probs.post ?? 0;
  const no_action = probs.no_action ?? 0;

  // Strict validation: Must not exceed 1.0. We allow tiny floating point inaccuracies.
  const total = like + reply + post + no_action;
  if (total > 1.001 || total < 0.999) {
    console.warn(`Invalid BehaviorPolicy probabilities sum to ${total}. Falling back to default.`);
    return DEFAULT_BEHAVIOR_POLICY;
  }

  // Ensure no negative probabilities
  if (like < 0 || reply < 0 || post < 0 || no_action < 0) {
    console.warn(`Invalid BehaviorPolicy negative probabilities. Falling back to default.`);
    return DEFAULT_BEHAVIOR_POLICY;
  }

  const selectivity = policy.engagementSelectivity ?? DEFAULT_BEHAVIOR_POLICY.engagementSelectivity;

  return {
    actionProbabilities: { like, reply, post, no_action },
    engagementSelectivity: Math.max(0, Math.min(1.0, selectivity))
  };
}

export function parseBehaviorPolicy(jsonString: string | null | undefined): BehaviorPolicy {
  if (!jsonString) return DEFAULT_BEHAVIOR_POLICY;
  try {
    const parsed = JSON.parse(jsonString);
    return validateBehaviorPolicy(parsed);
  } catch (err) {
    console.warn('Failed to parse BehaviorPolicy JSON, returning default.');
    return DEFAULT_BEHAVIOR_POLICY;
  }
}

export function selectActionFromPolicy(policy: BehaviorPolicy, actionChoice: number, isUrgencyEvent: boolean): 'like' | 'reply' | 'post' | 'no_action' {
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
