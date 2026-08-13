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
  created_at: number;
  updated_at: number;
}

export interface DreamXPost {
  id: string;
  profile_id: string;
  content: string;
  reply_to_post_id?: string | null;
  likes_count: number;
  reposts_count: number;
  created_at: number;
}
