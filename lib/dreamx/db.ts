import { getDatabase, assertDreamXAvailable } from '@/lib/db';
import { getRunToken } from './simulation';
import type { 
  DreamXUserProfile, 
  DreamXProfile, 
  DreamXPost, 
  ActorType,
  VerificationType,
  DreamXActivityLog 
} from './types';

function validateSimulationRun(runToken?: number) {
  if (runToken !== undefined && runToken !== getRunToken()) {
    throw new Error('Ghost write aborted: Stale simulation generation');
  }
}

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function getDreamXDb() {
  assertDreamXAvailable();
  return getDatabase();
}

// ----------------------------------------------------
// Human User Profile DAL
// ----------------------------------------------------

export async function getUserProfile(): Promise<DreamXUserProfile | undefined> {
  const db = getDreamXDb();
  return db.queryFirst<DreamXUserProfile>('SELECT * FROM dreamx_user_profile LIMIT 1');
}

export async function saveUserProfile(profile: Partial<DreamXUserProfile> & { display_name: string; handle: string }): Promise<DreamXUserProfile> {
  const db = getDreamXDb();
  const existing = await getUserProfile();
  const id = profile.id || existing?.id || generateId('dx-user');
  const now = Date.now();

  const cleanHandle = (profile.handle || 'user').replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
  const handle = `@${cleanHandle || 'user'}`;
  
  const fullProfile: DreamXUserProfile = {
    id,
    display_name: profile.display_name || 'User',
    handle,
    avatar_url: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    personality: profile.personality || undefined,
    interests: profile.interests || undefined,
    writing_style: profile.writing_style || undefined,
    verification_type: profile.verification_type || existing?.verification_type || 'none',
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  await db.execute(`
    INSERT INTO dreamx_user_profile (
      id, display_name, handle, avatar_url, bio, personality, interests, writing_style, verification_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      handle = excluded.handle,
      avatar_url = excluded.avatar_url,
      bio = excluded.bio,
      personality = excluded.personality,
      interests = excluded.interests,
      writing_style = excluded.writing_style,
      verification_type = excluded.verification_type,
      updated_at = excluded.updated_at
  `, [
    fullProfile.id,
    fullProfile.display_name,
    fullProfile.handle,
    fullProfile.avatar_url,
    fullProfile.bio,
    fullProfile.personality,
    fullProfile.interests,
    fullProfile.writing_style,
    fullProfile.verification_type,
    fullProfile.created_at,
    fullProfile.updated_at
  ]);

  return fullProfile;
}


// ----------------------------------------------------
// AI Profiles DAL
// ----------------------------------------------------

export async function getProfiles(): Promise<DreamXProfile[]> {
  const db = getDreamXDb();
  return db.queryAll<DreamXProfile>('SELECT * FROM dreamx_profiles ORDER BY updated_at DESC');
}

export async function getProfile(id: string): Promise<DreamXProfile | undefined> {
  const db = getDreamXDb();
  return db.queryFirst<DreamXProfile>('SELECT * FROM dreamx_profiles WHERE id = ?', [id]);
}

export async function getProfileByHandle(handle: string): Promise<DreamXProfile | undefined> {
  const db = getDreamXDb();
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  return db.queryFirst<DreamXProfile>('SELECT * FROM dreamx_profiles WHERE LOWER(handle) = LOWER(?)', [normalizedHandle]);
}

export async function saveProfile(profile: Partial<DreamXProfile> & { display_name: string; handle: string }): Promise<DreamXProfile> {
  const db = getDreamXDb();
  const id = profile.id || generateId('dx-prof');
  const now = Date.now();
  
  const cleanHandle = (profile.handle || 'user').replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
  const handle = `@${cleanHandle || 'user'}`;

  const fullProfile: DreamXProfile = {
    id,
    display_name: profile.display_name || 'AI Profile',
    handle,
    avatar_url: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    personality: profile.personality || undefined,
    traits: profile.traits || undefined,
    interests: profile.interests || undefined,
    speaking_style: profile.speaking_style || undefined,
    beliefs: profile.beliefs || undefined,
    background: profile.background || undefined,
    posting_guidelines: profile.posting_guidelines || undefined,
    verification_type: profile.verification_type || 'none',
    created_at: profile.created_at || now,
    updated_at: now,
  };

  await db.execute(`
    INSERT INTO dreamx_profiles (
      id, display_name, handle, avatar_url, bio, personality, traits, interests, 
      speaking_style, beliefs, background, posting_guidelines, verification_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      verification_type = excluded.verification_type,
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
    fullProfile.verification_type,
    fullProfile.created_at,
    fullProfile.updated_at
  ]);

  return fullProfile;
}


/**
 * COMPLETE ATOMIC DELETION SEMANTICS
 * Deletes AI profile X in ONE atomic transaction touching ONLY dreamx_* tables:
 * 1. Find all post IDs authored by profile X.
 * 2. Delete likes targeting those posts.
 * 3. Delete reposts targeting those posts.
 * 4. Detach surviving replies (reply_to_post_id = NULL).
 * 5. Delete posts authored by profile X.
 * 6. Delete likes authored by profile X.
 * 7. Delete reposts authored by profile X.
 * 8. Delete follows involving profile X.
 * 9. Scrub activity logs referencing profile X or its authored posts.
 * 10. Delete profile X.
 */
export async function deleteProfile(id: string): Promise<void> {
  const db = getDreamXDb();

  await db.batchExecute([
    {
      sql: `DELETE FROM dreamx_likes WHERE post_id IN (SELECT id FROM dreamx_posts WHERE author_id = ? AND author_type = 'ai')`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_reposts WHERE post_id IN (SELECT id FROM dreamx_posts WHERE author_id = ? AND author_type = 'ai')`,
      args: [id]
    },
    {
      sql: `UPDATE dreamx_posts SET reply_to_post_id = NULL WHERE reply_to_post_id IN (SELECT id FROM dreamx_posts WHERE author_id = ? AND author_type = 'ai')`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_posts WHERE author_id = ? AND author_type = 'ai'`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_likes WHERE actor_id = ? AND actor_type = 'ai'`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_reposts WHERE actor_id = ? AND actor_type = 'ai'`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_follows WHERE (follower_id = ? AND follower_type = 'ai') OR followed_profile_id = ?`,
      args: [id, id]
    },
    {
      sql: `UPDATE dreamx_activity_log SET actor_id = '[DELETED]' WHERE actor_id = ?`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_profiles WHERE id = ?`,
      args: [id]
    }
  ]);
}

// ----------------------------------------------------
// Posts & Thread Tree DAL
// ----------------------------------------------------

export async function getPost(id: string): Promise<DreamXPost | undefined> {
  const db = getDreamXDb();
  const raw = await db.queryFirst<any>('SELECT * FROM dreamx_posts WHERE id = ?', [id]);
  if (!raw) return undefined;
  return populatePostMetadata(raw);
}

let lastPostCreatedAt = 0;

export async function savePost(post: { 
  id?: string;
  author_id: string; 
  author_type: ActorType; 
  content: string; 
  reply_to_post_id?: string | null 
}, runToken?: number): Promise<DreamXPost> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const id = post.id || generateId('dx-post');
  let now = Date.now();
  if (now <= lastPostCreatedAt) {
    now = lastPostCreatedAt + 1;
  }
  lastPostCreatedAt = now;


  const fullPost: DreamXPost = {
    id,
    author_id: post.author_id,
    author_type: post.author_type,
    content: post.content,
    reply_to_post_id: post.reply_to_post_id || null,
    likes_count: 0,
    reposts_count: 0,
    created_at: now,
  };

  await db.execute(`
    INSERT INTO dreamx_posts (
      id, author_id, author_type, content, reply_to_post_id, likes_count, reposts_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      author_id = excluded.author_id,
      author_type = excluded.author_type,
      content = excluded.content,
      reply_to_post_id = excluded.reply_to_post_id
  `, [



    fullPost.id,
    fullPost.author_id,
    fullPost.author_type,
    fullPost.content,
    fullPost.reply_to_post_id,
    fullPost.likes_count,
    fullPost.reposts_count,
    fullPost.created_at
  ]);

  if (post.author_type === 'human') {
    await logActivity({
      action_type: post.reply_to_post_id ? 'reply' : 'post',
      actor_id: post.author_id,
      target_post_id: id,
      reason: 'Human action'
    }, runToken);
  }

  return (await getPost(id)) || fullPost;
}

export async function deletePost(id: string): Promise<void> {
  const db = getDreamXDb();
  await db.batchExecute([
    {
      sql: `DELETE FROM dreamx_likes WHERE post_id = ?`,
      args: [id]
    },
    {
      sql: `DELETE FROM dreamx_reposts WHERE post_id = ?`,
      args: [id]
    },
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

/**
 * Main Feed Query:
 * Returns top-level posts ONLY (reply_to_post_id IS NULL), ordered created_at DESC.
 * Main feed presents standalone root posts without nested inline reply cards.
 */
export async function getFeedTree(): Promise<DreamXPost[]> {
  const db = getDreamXDb();
  const rootPostsRaw = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts WHERE reply_to_post_id IS NULL ORDER BY created_at DESC LIMIT 50'
  );

  const human = await getUserProfile();

  const posts: DreamXPost[] = [];
  for (const raw of rootPostsRaw) {
    const post = await populatePostMetadata(raw, human?.id);
    post.replies = []; // Standalone root post presentation for main feed timeline
    posts.push(post);
  }

  return posts;
}

/**
 * Returns recent posts from the DreamX timeline regardless of root/reply status, used for simulation awareness.
 */
export async function getRecentSimulationPosts(limit: number = 100): Promise<DreamXPost[]> {
  const db = getDreamXDb();
  const rawPosts = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  
  const posts: DreamXPost[] = [];
  const human = await getUserProfile();
  for (const raw of rawPosts) {
    const post = await populatePostMetadata(raw, human?.id);
    posts.push(post);
  }
  return posts;
}

/**
 * Returns replies attached to a post, ordered created_at ASC.
 */
export async function getRepliesTree(postId: string, humanId?: string): Promise<DreamXPost[]> {
  const db = getDreamXDb();
  const repliesRaw = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts WHERE reply_to_post_id = ? ORDER BY created_at ASC',
    [postId]
  );

  const replies: DreamXPost[] = [];
  for (const raw of repliesRaw) {
    const post = await populatePostMetadata(raw, humanId);
    post.replies = await getRepliesTree(post.id, humanId);
    replies.push(post);
  }

  return replies;
}

/**
 * Returns a Set of author_id:reply_to_post_id combinations to prevent
 * AI actors from attempting to reply to the same target post multiple times,
 * which would trigger a UNIQUE constraint failure.
 */
export async function getAiReplyEdges(): Promise<Set<string>> {
  const db = getDreamXDb();
  const rows = await db.queryAll<{author_id: string, reply_to_post_id: string}>(
    'SELECT author_id, reply_to_post_id FROM dreamx_posts WHERE reply_to_post_id IS NOT NULL AND author_type = ?',
    ['ai']
  );
  return new Set(rows.map(r => `${r.author_id}:${r.reply_to_post_id}`));
}

/**
 * Resolves conversation root, ancestors chain, and direct children (replies) of the target post.
 */
export async function getConversationFlat(postId: string): Promise<{
  root: DreamXPost;
  ancestors: DreamXPost[];
  replies: DreamXPost[];
  target: DreamXPost;
}> {
  const db = getDreamXDb();
  const human = await getUserProfile();

  const requestedPost = await getPost(postId);
  if (!requestedPost) {
    throw new Error(`Post not found: ${postId}`);
  }

  // 1. Resolve conversation ancestors by traversing parent links
  const ancestors: DreamXPost[] = [];
  let current = requestedPost;
  let depth = 0;
  while (current.reply_to_post_id && depth < 50) {
    const parent = await getPost(current.reply_to_post_id);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
    depth++;
  }
  
  const root = ancestors.length > 0 ? ancestors[0] : requestedPost;

  // 2. Fetch ONLY direct children of requestedPost (reply_to_post_id === requestedPost.id)
  const directChildrenRaw = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts WHERE reply_to_post_id = ? ORDER BY created_at ASC',
    [requestedPost.id]
  );

  const replies: DreamXPost[] = [];
  for (const raw of directChildrenRaw) {
    const post = await populatePostMetadata(raw, human?.id);
    replies.push(post);
  }

  return { 
    root, 
    ancestors, 
    replies, 
    target: requestedPost 
  };
}


/**
 * Gets authored posts for a specific profile page (AI or Human).
 */
export async function getProfilePosts(authorId: string, authorType: ActorType): Promise<{ original: DreamXPost[]; replies: DreamXPost[] }> {
  const db = getDreamXDb();
  const human = await getUserProfile();

  const originalRaw = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts WHERE author_id = ? AND author_type = ? AND reply_to_post_id IS NULL ORDER BY created_at DESC',
    [authorId, authorType]
  );
  
  const repliesRaw = await db.queryAll<any>(
    'SELECT * FROM dreamx_posts WHERE author_id = ? AND author_type = ? AND reply_to_post_id IS NOT NULL ORDER BY created_at DESC',
    [authorId, authorType]
  );

  const original: DreamXPost[] = [];
  for (const r of originalRaw) {
    original.push(await populatePostMetadata(r, human?.id));
  }

  const replies: DreamXPost[] = [];
  for (const r of repliesRaw) {
    replies.push(await populatePostMetadata(r, human?.id));
  }

  return { original, replies };
}

async function populatePostMetadata(raw: any, currentHumanId?: string): Promise<DreamXPost> {
  const db = getDreamXDb();

  let author_name = 'Unknown';
  let author_handle = '@unknown';
  let author_avatar = '';
  let author_verification: VerificationType = 'none';

  if (raw.author_type === 'human') {
    const user = await getUserProfile();
    if (user) {
      author_name = user.display_name;
      author_handle = user.handle;
      author_avatar = user.avatar_url || '';
      author_verification = user.verification_type || 'none';
    }
  } else {
    const aiProf = await getProfile(raw.author_id);
    if (aiProf) {
      author_name = aiProf.display_name;
      author_handle = aiProf.handle;
      author_avatar = aiProf.avatar_url || '';
      author_verification = aiProf.verification_type || 'none';
    }
  }


  // Count actual likes from dreamx_likes
  const likesRes = await db.queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM dreamx_likes WHERE post_id = ?',
    [raw.id]
  );
  const likes_count = likesRes?.count || 0;

  // Count actual reposts
  const repostsRes = await db.queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM dreamx_reposts WHERE post_id = ?',
    [raw.id]
  );
  const reposts_count = repostsRes?.count || 0;

  // Count direct replies
  const repliesRes = await db.queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM dreamx_posts WHERE reply_to_post_id = ?',
    [raw.id]
  );
  const reply_count = repliesRes?.count || 0;

  // Check if human user liked/reposted
  let user_liked = false;
  let user_reposted = false;
  if (currentHumanId) {
    const likedRow = await db.queryFirst(
      `SELECT 1 FROM dreamx_likes WHERE post_id = ? AND actor_id = ? AND actor_type = 'human'`,
      [raw.id, currentHumanId]
    );
    user_liked = !!likedRow;

    const repostedRow = await db.queryFirst(
      `SELECT 1 FROM dreamx_reposts WHERE post_id = ? AND actor_id = ? AND actor_type = 'human'`,
      [raw.id, currentHumanId]
    );
    user_reposted = !!repostedRow;
  }

  return {
    id: raw.id,
    author_id: raw.author_id,
    ...raw,
    author_name,
    author_handle,
    author_avatar,
    author_verification,
    likes_count,
    reposts_count,
    reply_count,
    user_liked,
    user_reposted,
  };
}

// ----------------------------------------------------
// Interactions (Likes, Reposts, Follows) DAL
// ----------------------------------------------------

export async function toggleLike(postId: string, actorId: string, actorType: ActorType, runToken?: number): Promise<{ liked: boolean; count: number }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_likes WHERE post_id = ? AND actor_id = ? AND actor_type = ?',
    [postId, actorId, actorType]
  );

  if (existing) {
    await db.execute('DELETE FROM dreamx_likes WHERE id = ?', [existing.id]);
  } else {
    const id = generateId('dx-like');
    await db.execute(
      'INSERT INTO dreamx_likes (id, post_id, actor_id, actor_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, postId, actorId, actorType, Date.now()]
    );
    if (actorType === 'human') {
      await logActivity({ action_type: 'like', actor_id: actorId, target_post_id: postId, reason: 'Human action' }, runToken);
    }
  }

  const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_likes WHERE post_id = ?', [postId]);
  return { liked: !existing, count: res?.count || 0 };
}

export async function ensureLike(postId: string, actorId: string, actorType: ActorType, runToken?: number): Promise<{ liked: boolean; newlyAdded: boolean; count: number }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_likes WHERE post_id = ? AND actor_id = ? AND actor_type = ?',
    [postId, actorId, actorType]
  );

  if (existing) {
    const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_likes WHERE post_id = ?', [postId]);
    return { liked: true, newlyAdded: false, count: res?.count || 0 };
  }

  const id = generateId('dx-like');
  await db.execute(
    'INSERT INTO dreamx_likes (id, post_id, actor_id, actor_type, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, postId, actorId, actorType, Date.now()]
  );
  if (actorType === 'human') {
    await logActivity({ action_type: 'like', actor_id: actorId, target_post_id: postId, reason: 'Human action' }, runToken);
  }
  
  const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_likes WHERE post_id = ?', [postId]);
  return { liked: true, newlyAdded: true, count: res?.count || 0 };
}

export async function toggleRepost(postId: string, actorId: string, actorType: ActorType, runToken?: number): Promise<{ reposted: boolean; count: number }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_reposts WHERE post_id = ? AND actor_id = ? AND actor_type = ?',
    [postId, actorId, actorType]
  );

  if (existing) {
    await db.execute('DELETE FROM dreamx_reposts WHERE id = ?', [existing.id]);
  } else {
    const id = generateId('dx-repost');
    await db.execute(
      'INSERT INTO dreamx_reposts (id, post_id, actor_id, actor_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, postId, actorId, actorType, Date.now()]
    );
    if (actorType === 'human') {
      await logActivity({ action_type: 'repost', actor_id: actorId, target_post_id: postId, reason: 'Human action' }, runToken);
    }
  }

  const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_reposts WHERE post_id = ?', [postId]);
  return { reposted: !existing, count: res?.count || 0 };
}

export async function ensureRepost(postId: string, actorId: string, actorType: ActorType, runToken?: number): Promise<{ reposted: boolean; newlyAdded: boolean; count: number }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_reposts WHERE post_id = ? AND actor_id = ? AND actor_type = ?',
    [postId, actorId, actorType]
  );

  if (existing) {
    const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_reposts WHERE post_id = ?', [postId]);
    return { reposted: true, newlyAdded: false, count: res?.count || 0 };
  }

  const id = generateId('dx-repost');
  await db.execute(
    'INSERT INTO dreamx_reposts (id, post_id, actor_id, actor_type, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, postId, actorId, actorType, Date.now()]
  );
  if (actorType === 'human') {
    await logActivity({ action_type: 'repost', actor_id: actorId, target_post_id: postId, reason: 'Human action' }, runToken);
  }
  
  const res = await db.queryFirst<{ count: number }>('SELECT COUNT(*) as count FROM dreamx_reposts WHERE post_id = ?', [postId]);
  return { reposted: true, newlyAdded: true, count: res?.count || 0 };
}

export async function toggleFollow(followerId: string, followerType: ActorType, followedProfileId: string, runToken?: number): Promise<{ following: boolean }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_follows WHERE follower_id = ? AND follower_type = ? AND followed_profile_id = ?',
    [followerId, followerType, followedProfileId]
  );

  if (existing) {
    await db.execute('DELETE FROM dreamx_follows WHERE id = ?', [existing.id]);
    return { following: false };
  } else {
    const id = generateId('dx-follow');
    await db.execute(
      'INSERT INTO dreamx_follows (id, follower_id, follower_type, followed_profile_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, followerId, followerType, followedProfileId, Date.now()]
    );
    if (followerType === 'human') {
      await logActivity({ action_type: 'follow', actor_id: followerId, target_post_id: followedProfileId, reason: 'Human action' }, runToken);
    }
    return { following: true };
  }
}

export async function ensureFollow(followerId: string, followerType: ActorType, followedProfileId: string, runToken?: number): Promise<{ following: boolean; newlyAdded: boolean }> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const existing = await db.queryFirst<{ id: string }>(
    'SELECT id FROM dreamx_follows WHERE follower_id = ? AND follower_type = ? AND followed_profile_id = ?',
    [followerId, followerType, followedProfileId]
  );

  if (existing) {
    return { following: true, newlyAdded: false };
  }

  const id = generateId('dx-follow');
  await db.execute(
    'INSERT INTO dreamx_follows (id, follower_id, follower_type, followed_profile_id, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, followerId, followerType, followedProfileId, Date.now()]
  );
  if (followerType === 'human') {
    await logActivity({ action_type: 'follow', actor_id: followerId, target_post_id: followedProfileId, reason: 'Human action' }, runToken);
  }
  return { following: true, newlyAdded: true };
}

export async function isFollowing(followerId: string, followerType: ActorType, followedProfileId: string): Promise<boolean> {
  const db = getDreamXDb();
  const res = await db.queryFirst(
    'SELECT 1 FROM dreamx_follows WHERE follower_id = ? AND follower_type = ? AND followed_profile_id = ?',
    [followerId, followerType, followedProfileId]
  );
  return !!res;
}

// ----------------------------------------------------
// Concurrency-Safe Atomic Simulation Cooldown & Log DAL
// ----------------------------------------------------

/**
 * Concurrency-Safe Atomic Simulation Slot Claim
 * Minimum 60-second cooldown enforced via atomic SQLite conditional UPDATE.
 * Returns true if slot claimed successfully, false if cooldown is active.
 */
export async function claimSimulationSlot(cooldownMs: number = 60000, runToken?: number): Promise<boolean> {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const now = Date.now();
  const cutoff = now - cooldownMs;

  // Initialize key if missing
  await db.execute(`
    INSERT INTO dreamx_simulation_state (key, value, updated_at)
    VALUES ('last_run_timestamp', '0', 0)
    ON CONFLICT(key) DO NOTHING
  `);

  // Atomic conditional update
  await db.execute(`
    UPDATE dreamx_simulation_state
    SET value = ?, updated_at = ?
    WHERE key = 'last_run_timestamp'
      AND (value IS NULL OR CAST(value AS INTEGER) <= ?)
  `, [now.toString(), now, cutoff]);

  const current = await db.queryFirst<{ value: string }>('SELECT value FROM dreamx_simulation_state WHERE key = \'last_run_timestamp\'');
  return current?.value === now.toString();
}

export async function logActivity(log: { action_type: 'post' | 'reply' | 'like' | 'repost' | 'follow' | 'no_action'; actor_id?: string; target_post_id?: string; reason?: string }, runToken?: number) {
  validateSimulationRun(runToken);
  const db = getDreamXDb();
  const id = generateId('dx-log');
  await db.execute(
    'INSERT INTO dreamx_activity_log (id, action_type, actor_id, target_post_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, log.action_type, log.actor_id || null, log.target_post_id || null, log.reason || null, Date.now()]
  );
}

export async function getActivityLogs(): Promise<DreamXActivityLog[]> {
  const db = getDreamXDb();
  return db.queryAll<DreamXActivityLog>('SELECT * FROM dreamx_activity_log ORDER BY created_at DESC LIMIT 50');
}

export async function resetSimulationState(): Promise<void> {
  const db = getDreamXDb();
  await db.batchExecute([
    { sql: 'DELETE FROM dreamx_posts' },
    { sql: 'DELETE FROM dreamx_likes' },
    { sql: 'DELETE FROM dreamx_reposts' },
    { sql: 'DELETE FROM dreamx_follows' },
    { sql: 'DELETE FROM dreamx_activity_log' },
    { sql: 'DELETE FROM dreamx_simulation_state' },
    { sql: 'DELETE FROM dreamx_notifications' },
    { sql: 'DELETE FROM dreamx_crowd_state' },
    { sql: 'DELETE FROM dreamx_crowd_engagement' },
    { sql: 'DELETE FROM dreamx_analytics_steps' },
    { sql: 'DELETE FROM dreamx_messages' },
    { sql: 'DELETE FROM dreamx_conversation_participants' },
    { sql: 'DELETE FROM dreamx_conversations' }
  ]);
}
