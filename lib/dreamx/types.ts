export type ActorType = 'human' | 'ai';
export type VerificationType = 'none' | 'blue' | 'gray' | 'gold';

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
