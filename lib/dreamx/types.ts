import type { BehaviorPolicy } from './behaviorPolicy';

export type ActorType = 'human' | 'ai';
export type VerificationType = 'none' | 'blue' | 'gray' | 'gold';

// ----------------------------------------------------
// Canonical Actor Domain Model (Phase D1)
// ----------------------------------------------------

export interface ActorIdentity {
  id: string;
  handle: string;
  display_name: string;
  actor_type: ActorType;
  verification_type?: VerificationType;
  avatar_url?: string;
  bio?: string;
  created_at: number;
  updated_at: number;
}

export interface ActorPersonality {
  personality?: string;
  traits?: string;
  interests?: string;
  beliefs?: string;
  background?: string;
}

export interface ActorContentProfile {
  speaking_style?: string;
  writing_style?: string;
  posting_guidelines?: string;
}

export interface Actor {
  identity: ActorIdentity;
  personality?: ActorPersonality;
  contentProfile?: ActorContentProfile;
  behaviorPolicy?: BehaviorPolicy;
}

export type DreamXActor = Actor;

// ----------------------------------------------------
// Persistence / Legacy Entities
// ----------------------------------------------------

export interface DreamXUserProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url?: string;
  bio?: string;
  personality?: string;
  interests?: string;
  writing_style?: string;
  verification_type?: VerificationType;
  created_at: number;
  updated_at: number;
}

export interface DreamXProfile {
  id: string;
  display_name: string;
  handle: string;
  avatar_url?: string;
  bio?: string;
  personality?: string;
  traits?: string;
  interests?: string;
  speaking_style?: string;
  beliefs?: string;
  background?: string;
  posting_guidelines?: string;
  verification_type?: VerificationType;
  behavior_policy?: string | null;
  created_at: number;
  updated_at: number;
}

export interface DreamXPost {
  id: string;
  author_id: string;
  author_type: ActorType;
  content: string;
  reply_to_post_id?: string | null;
  likes_count: number;
  reposts_count: number;
  created_at: number;
  
  // Computed / UI properties
  author_name?: string;
  author_handle?: string;
  author_avatar?: string;
  author_verification?: VerificationType;
  user_liked?: boolean;
  user_reposted?: boolean;
  reply_count?: number;
  replies?: DreamXPost[];
}


export interface DreamXLike {
  id: string;
  post_id: string;
  actor_id: string;
  actor_type: ActorType;
  created_at: number;
}

export interface DreamXRepost {
  id: string;
  post_id: string;
  actor_id: string;
  actor_type: ActorType;
  created_at: number;
}

export interface DreamXFollow {
  id: string;
  follower_id: string;
  follower_type: ActorType;
  followed_profile_id: string;
  created_at: number;
}

export interface DreamXActivityLog {
  id: string;
  action_type: 'post' | 'reply' | 'like' | 'no_action';
  actor_id?: string | null;
  target_post_id?: string | null;
  reason?: string | null;
  created_at: number;
}

export interface DreamXCrowdState {
  actor_id: string;
  followers_count: number;
  sentiment_score: number;
  momentum: number;
  influence_score: number;
  updated_at: number;
}

export interface DreamXCrowdEngagement {
  post_id: string;
  crowd_likes: number;
  crowd_reposts: number;
  impressions: number;
  engagement_velocity: number;
  updated_at: number;
}

export interface DreamXCrowdHistoryDaily {
  id: string;
  target_id: string;
  target_type: 'actor' | 'global';
  date_string: string;
  metrics_json: string;
  updated_at: number;
}

export interface DreamXAnalyticsStep {
  step_id: string;
  type: 'normal' | 'burst';
  started_at: number;
  duration_ms: number;
  actions_taken: number;
  created_at: number;
}
