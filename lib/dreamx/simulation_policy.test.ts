import { describe, it, expect } from 'vitest';
import { 
  selectActionFromPolicy, 
  DEFAULT_BEHAVIOR_POLICY, 
  MENTION_BEHAVIOR_POLICY, 
  HIGH_URGENCY_POLICY 
} from './behaviorPolicy';

describe('Phase 4 - Deterministic Policy Boundary Equivalence', () => {
  it('DEFAULT_BEHAVIOR_POLICY exactly reproduces legacy thresholds', () => {
    // Legacy thresholds: LIKE < 0.35, REPLY < 0.70, POST < 0.85
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.0, false)).toBe('like');
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.349, false)).toBe('like');
    
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.35, false)).toBe('reply');
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.699, false)).toBe('reply');
    
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.70, false)).toBe('post');
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.849, false)).toBe('post');
    
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.85, false)).toBe('no_action');
    expect(selectActionFromPolicy(DEFAULT_BEHAVIOR_POLICY, 0.999, false)).toBe('no_action');
  });

  it('MENTION_BEHAVIOR_POLICY exactly reproduces legacy mention thresholds', () => {
    // Legacy thresholds: LIKE < 0.20, REPLY < 0.85, POST unreachable
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.0, false)).toBe('like');
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.199, false)).toBe('like');
    
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.20, false)).toBe('reply');
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.849, false)).toBe('reply');
    
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.85, false)).toBe('no_action');
    expect(selectActionFromPolicy(MENTION_BEHAVIOR_POLICY, 0.999, false)).toBe('no_action');
  });

  it('HIGH_URGENCY_POLICY exactly reproduces legacy urgency thresholds', () => {
    // Legacy urgency thresholds: REPLY < 0.70, LIKE < 0.85, NO_ACTION >= 0.85
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.0, true)).toBe('reply');
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.699, true)).toBe('reply');
    
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.70, true)).toBe('like');
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.849, true)).toBe('like');
    
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.85, true)).toBe('no_action');
    expect(selectActionFromPolicy(HIGH_URGENCY_POLICY, 0.999, true)).toBe('no_action');
  });
});
