import { getDatabase } from '@/lib/db';
import type { DreamXProfile, DreamXPost } from './types';

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export async function getProfiles(): Promise<DreamXProfile[]> {
  const db = getDatabase();
  return db.queryAll<DreamXProfile>('SELECT * FROM dreamx_profiles ORDER BY updated_at DESC');
}

export async function getProfile(id: string): Promise<DreamXProfile | undefined> {
  const db = getDatabase();
  return db.queryFirst<DreamXProfile>('SELECT * FROM dreamx_profiles WHERE id = ?', [id]);
}

export async function saveProfile(profile: Partial<DreamXProfile> & { display_name: string, handle: string }): Promise<DreamXProfile> {
  const db = getDatabase();
  const id = profile.id || generateId('dx-prof');
  const now = Date.now();
  
  const fullProfile: DreamXProfile = {
    id,
    display_name: profile.display_name,
    handle: profile.handle,
    avatar_url: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    personality: profile.personality || undefined,
    traits: profile.traits || undefined,
    interests: profile.interests || undefined,
    speaking_style: profile.speaking_style || undefined,
    beliefs: profile.beliefs || undefined,
    background: profile.background || undefined,
    posting_guidelines: profile.posting_guidelines || undefined,
    created_at: profile.created_at || now,
    updated_at: now,
  };

  await db.execute(`
    INSERT INTO dreamx_profiles (
      id, display_name, handle, avatar_url, bio, personality, traits, interests, 
      speaking_style, beliefs, background, posting_guidelines, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      handle = excluded.handle,
      avatar_url = excluded.avatar_url,
      bio = excluded.bio,
      personality = excluded.personality,
      traits = excluded.traits,
      interests = excluded.interests,
      speaking_style = excluded.speaking_style,
      beliefs = excluded.beliefs,
      background = excluded.background,
      posting_guidelines = excluded.posting_guidelines,
      updated_at = excluded.updated_at
  `, [
    fullProfile.id,
    fullProfile.display_name,
    fullProfile.handle,
    fullProfile.avatar_url,
    fullProfile.bio,
    fullProfile.personality,
    fullProfile.traits,
    fullProfile.interests,
    fullProfile.speaking_style,
    fullProfile.beliefs,
    fullProfile.background,
    fullProfile.posting_guidelines,
    fullProfile.created_at,
    fullProfile.updated_at
  ]);

  return fullProfile;
}

export async function deleteProfile(id: string): Promise<void> {
  const db = getDatabase();
  // Execute as one atomic SQLite transaction operating exclusively on dreamx_* tables
  // 1. Detach replies
  // 2. Delete posts by profile
  // 3. Delete profile
  await db.batchExecute([
    {
      sql: `UPDATE dreamx_posts SET reply_to_post_id = NULL WHERE reply_to_post_id IN (SELECT id FROM dreamx_posts WHERE profile_id = ?)`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_posts WHERE profile_id = ?`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_profiles WHERE id = ?`,
      args: [id]
    }
  ]);
}

export async function getFeed(): Promise<DreamXPost[]> {
  const db = getDatabase();
  return db.queryAll<DreamXPost>('SELECT * FROM dreamx_posts ORDER BY created_at DESC LIMIT 100');
}

export async function getPost(id: string): Promise<DreamXPost | undefined> {
  const db = getDatabase();
  return db.queryFirst<DreamXPost>('SELECT * FROM dreamx_posts WHERE id = ?', [id]);
}

export async function savePost(post: Partial<DreamXPost> & { profile_id: string, content: string }): Promise<DreamXPost> {
  const db = getDatabase();
  const id = post.id || generateId('dx-post');
  const now = Date.now();
  
  const fullPost: DreamXPost = {
    id,
    profile_id: post.profile_id,
    content: post.content,
    reply_to_post_id: post.reply_to_post_id || null,
    likes_count: post.likes_count || 0,
    reposts_count: post.reposts_count || 0,
    created_at: post.created_at || now,
  };

  await db.execute(`
    INSERT INTO dreamx_posts (
      id, profile_id, content, reply_to_post_id, likes_count, reposts_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      likes_count = excluded.likes_count,
      reposts_count = excluded.reposts_count
  `, [
    fullPost.id,
    fullPost.profile_id,
    fullPost.content,
    fullPost.reply_to_post_id,
    fullPost.likes_count,
    fullPost.reposts_count,
    fullPost.created_at
  ]);

  return fullPost;
}

export async function deletePost(id: string): Promise<void> {
  const db = getDatabase();
  await db.batchExecute([
    {
      sql: `UPDATE dreamx_posts SET reply_to_post_id = NULL WHERE reply_to_post_id = ?`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_posts WHERE id = ?`,
      args: [id]
    }
  ]);
}
