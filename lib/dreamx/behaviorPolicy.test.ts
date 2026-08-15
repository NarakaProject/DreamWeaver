import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BEHAVIOR_POLICY,
  MENTION_BEHAVIOR_POLICY,
  HIGH_URGENCY_POLICY,
  validateBehaviorPolicy,
  parseBehaviorPolicy,
  deriveEffectiveBehavior,
  selectActionFromPolicy,
  type BehaviorPolicy
} from './behaviorPolicy';

describe('Phase D4 — Behavior Policy Domain Layer', () => {
  describe('Standard Policy Constants (Audit Checks A-D)', () => {
    it('DEFAULT_BEHAVIOR_POLICY has exact audited values', () => {
      expect(DEFAULT_BEHAVIOR_POLICY).toEqual({
        actionProbabilities: {
          like: 0.35,
          reply: 0.35,
          post: 0.15,
          no_action: 0.15
        },
        engagementSelectivity: 0.5
      });
    });

    it('MENTION_BEHAVIOR_POLICY has exact audited values', () => {
      expect(MENTION_BEHAVIOR_POLICY).toEqual({
        actionProbabilities: {
          like: 0.20,
          reply: 0.65,
          post: 0.0,
          no_action: 0.15
        },
        engagementSelectivity: 0.8
      });
    });

    it('HIGH_URGENCY_POLICY has exact audited values', () => {
      expect(HIGH_URGENCY_POLICY).toEqual({
        actionProbabilities: {
          like: 0.15,
          reply: 0.70,
          post: 0.0,
          no_action: 0.15
        },
        engagementSelectivity: 1.0
      });
    });
  });

  describe('Validation & Probability Constraints (Audit Checks E-J, P-Q)', () => {
    it('validates a valid custom policy with explicit probabilities and selectivity', () => {
      const custom: BehaviorPolicy = {
        actionProbabilities: {
          like: 0.25,
          reply: 0.25,
          post: 0.25,
          no_action: 0.25
        },
        engagementSelectivity: 0.9
      };

      const validated = validateBehaviorPolicy(custom);
      expect(validated).toEqual(custom);
    });

    it('strictly rejects probability sum > 1.001 and falls back to DEFAULT (never normalizes)', () => {
      const overBudget: any = {
        actionProbabilities: {
          like: 0.5,
          reply: 0.5,
          post: 0.5,
          no_action: 0.0
        },
        engagementSelectivity: 0.5
      };

      const validated = validateBehaviorPolicy(overBudget);
      // Invariant: Must NOT scale [0.5, 0.5, 0.5] down to [0.33, 0.33, 0.33]
      expect(validated).toEqual(DEFAULT_BEHAVIOR_POLICY);
    });

    it('strictly rejects negative probabilities and falls back to DEFAULT', () => {
      const negative: any = {
        actionProbabilities: {
          like: -0.1,
          reply: 0.5,
          post: 0.3,
          no_action: 0.3
        },
        engagementSelectivity: 0.5
      };

      expect(validateBehaviorPolicy(negative)).toEqual(DEFAULT_BEHAVIOR_POLICY);
    });

    it('strictly rejects non-finite values (NaN, Infinity, -Infinity) and falls back to DEFAULT', () => {
      const nanPolicy: any = {
        actionProbabilities: {
          like: NaN,
          reply: 0.35,
          post: 0.15,
          no_action: 0.15
        }
      };
      expect(validateBehaviorPolicy(nanPolicy)).toEqual(DEFAULT_BEHAVIOR_POLICY);

      const infPolicy: any = {
        actionProbabilities: {
          like: Infinity,
          reply: 0.35,
          post: 0.15,
          no_action: 0.15
        }
      };
      expect(validateBehaviorPolicy(infPolicy)).toEqual(DEFAULT_BEHAVIOR_POLICY);
    });

    it('auto-assigns residual probability to no_action when omitted and activeSum <= 1.0', () => {
      const partial: any = {
        actionProbabilities: {
          like: 0.3,
          reply: 0.3,
          post: 0.2
        },
        engagementSelectivity: 0.6
      };

      const validated = validateBehaviorPolicy(partial);
      expect(validated.actionProbabilities).toEqual({
        like: 0.3,
        reply: 0.3,
        post: 0.2,
        no_action: 0.2 // 1.0 - 0.8 = 0.2
      });
      expect(validated.engagementSelectivity).toBe(0.6);
    });

    it('preserves and validates explicit no_action', () => {
      const explicit: any = {
        actionProbabilities: {
          like: 0.1,
          reply: 0.1,
          post: 0.1,
          no_action: 0.7
        }
      };

      const validated = validateBehaviorPolicy(explicit);
      expect(validated.actionProbabilities.no_action).toBe(0.7);
    });

    it('clamps engagementSelectivity to [0.0, 1.0]', () => {
      const highSelectivity: any = {
        actionProbabilities: { like: 0.35, reply: 0.35, post: 0.15, no_action: 0.15 },
        engagementSelectivity: 1.5
      };
      expect(validateBehaviorPolicy(highSelectivity).engagementSelectivity).toBe(1.0);

      const lowSelectivity: any = {
        actionProbabilities: { like: 0.35, reply: 0.35, post: 0.15, no_action: 0.15 },
        engagementSelectivity: -0.5
      };
      expect(validateBehaviorPolicy(lowSelectivity).engagementSelectivity).toBe(0.0);

      const nanSelectivity: any = {
        actionProbabilities: { like: 0.35, reply: 0.35, post: 0.15, no_action: 0.15 },
        engagementSelectivity: NaN
      };
      expect(validateBehaviorPolicy(nanSelectivity).engagementSelectivity).toBe(DEFAULT_BEHAVIOR_POLICY.engagementSelectivity);
    });
  });

  describe('Parsing & Deserialization (Audit Checks K-O)', () => {
    it('returns DEFAULT_BEHAVIOR_POLICY on null, undefined, or empty string', () => {
      expect(parseBehaviorPolicy(null)).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy(undefined)).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy('')).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy('   ')).toEqual(DEFAULT_BEHAVIOR_POLICY);
    });

    it('returns DEFAULT_BEHAVIOR_POLICY on malformed JSON or invalid structures', () => {
      expect(parseBehaviorPolicy('{ not a valid json')).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy('12345')).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy('true')).toEqual(DEFAULT_BEHAVIOR_POLICY);
      expect(parseBehaviorPolicy('{"foo":"bar"}')).toEqual(DEFAULT_BEHAVIOR_POLICY);
    });

    it('correctly parses valid JSON string', () => {
      const json = JSON.stringify({
        actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
        engagementSelectivity: 0.7
      });

      const parsed = parseBehaviorPolicy(json);
      expect(parsed).toEqual({
        actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
        engagementSelectivity: 0.7
      });
    });
  });

  describe('deriveEffectiveBehavior (Audit Checks R-X)', () => {
    const baseCustom: BehaviorPolicy = {
      actionProbabilities: { like: 0.4, reply: 0.3, post: 0.2, no_action: 0.1 },
      engagementSelectivity: 0.6
    };

    it('returns base policy semantics when context is neutral/empty', () => {
      const effective = deriveEffectiveBehavior(baseCustom, undefined);
      expect(effective).toEqual(baseCustom);

      const effectiveEmpty = deriveEffectiveBehavior(baseCustom, {});
      expect(effectiveEmpty).toEqual(baseCustom);
    });

    it('returns HIGH_URGENCY_POLICY when isUrgencyEvent is true', () => {
      const effective = deriveEffectiveBehavior(baseCustom, { isUrgencyEvent: true });
      expect(effective).toEqual(HIGH_URGENCY_POLICY);
    });

    it('returns MENTION_BEHAVIOR_POLICY when isMentioned is true', () => {
      const effective = deriveEffectiveBehavior(baseCustom, { isMentioned: true });
      expect(effective).toEqual(MENTION_BEHAVIOR_POLICY);
    });

    it('prioritizes urgency over mention when both are true', () => {
      const effective = deriveEffectiveBehavior(baseCustom, { isUrgencyEvent: true, isMentioned: true });
      expect(effective).toEqual(HIGH_URGENCY_POLICY);
    });

    it('does NOT mutate the base policy or shared constants (Purity & Immutability)', () => {
      const baseClone = JSON.parse(JSON.stringify(baseCustom));
      const defaultClone = JSON.parse(JSON.stringify(DEFAULT_BEHAVIOR_POLICY));
      const urgencyClone = JSON.parse(JSON.stringify(HIGH_URGENCY_POLICY));

      const effective = deriveEffectiveBehavior(baseCustom, { isUrgencyEvent: true });

      // Verify non-mutation
      expect(baseCustom).toEqual(baseClone);
      expect(DEFAULT_BEHAVIOR_POLICY).toEqual(defaultClone);
      expect(HIGH_URGENCY_POLICY).toEqual(urgencyClone);

      // Verify no shared mutable references
      effective.actionProbabilities.like = 0.99;
      expect(HIGH_URGENCY_POLICY.actionProbabilities.like).toBe(0.15);
    });
  });

  describe('Action Selection Boundary Mathematics (Audit Check Y)', () => {
    it('DEFAULT_BEHAVIOR_POLICY exact boundaries (like < 0.35, reply < 0.70, post < 0.85, no_action >= 0.85)', () => {
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.0)).toBe('like');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.3499)).toBe('like');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.35)).toBe('reply');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.6999)).toBe('reply');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.70)).toBe('post');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.8499)).toBe('post');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.85)).toBe('no_action');
      expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.9999)).toBe('no_action');
    });

    it('MENTION_BEHAVIOR_POLICY exact boundaries (like < 0.20, reply < 0.85, no_action >= 0.85)', () => {
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.0)).toBe('like');
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.1999)).toBe('like');
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.20)).toBe('reply');
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.8499)).toBe('reply');
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.85)).toBe('no_action');
      expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.9999)).toBe('no_action');
    });

    it('HIGH_URGENCY_POLICY exact boundaries (reply < 0.70, like < 0.85, no_action >= 0.85 with urgency inversion)', () => {
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.0, true)).toBe('reply');
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.6999, true)).toBe('reply');
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.70, true)).toBe('like');
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.8499, true)).toBe('like');
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.85, true)).toBe('no_action');
      expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.9999, true)).toBe('no_action');
    });
  });
});
