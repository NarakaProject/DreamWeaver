import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetSimulationState, savePost } from './db';
import { POST as MassLikePOST } from '@/app/api/dreamx/social/mass-like/route';
import { DELETE as PostDELETE } from '@/app/api/dreamx/posts/route';
import * as dbModule from './db';
import { getDatabase } from '../db/index';

describe('Phase 1 - API Hardening', () => {
  beforeEach(async () => {
    await resetSimulationState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mass-like rejects partial/invalid actor sets without partial mutations', async () => {
    // 1. Create a post
    const root = await savePost({ author_id: 'dx-user-test', author_type: 'human', content: 'ROOT', reply_to_post_id: null });
    
    // 2. Setup mock for human auth
    vi.spyOn(dbModule, 'getUserProfile').mockResolvedValue({ id: 'dx-user-test', handle: 'tester', display_name: 'Tester' } as any);

    // Create valid AI profiles directly via raw DB to avoid test-specific wrappers
    const rawDb = getDatabase();
    await rawDb.execute(`INSERT OR REPLACE INTO dreamx_profiles (id, display_name, handle, created_at, updated_at) VALUES ('dx-prof-1', 'AI 1', '@ai1', 0, 0)`);
    await rawDb.execute(`INSERT OR REPLACE INTO dreamx_profiles (id, display_name, handle, created_at, updated_at) VALUES ('dx-prof-2', 'AI 2', '@ai2', 0, 0)`);

    const reqBody = {
      actorIds: ['dx-prof-1', 'dx-prof-2', 'dx-prof-invalid-3'],
      postId: root.id,
      actorType: 'ai'
    };

    const req = new NextRequest('http://localhost/api/dreamx/social/mass-like', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });

    const res = await MassLikePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/One or more actors do not exist/);

    // Verify zero mutations
    const likes = await rawDb.queryAll<any>("SELECT * FROM dreamx_likes");
    expect(likes.length).toBe(0);
    const logs = await rawDb.queryAll<any>("SELECT * FROM dreamx_activity_log WHERE action_type = 'like'");
    expect(logs.length).toBe(0);
  });

  it('mass-like rejects impersonation attempts', async () => {
    const root = await savePost({ author_id: 'dx-user-test', author_type: 'human', content: 'ROOT', reply_to_post_id: null });
    
    vi.spyOn(dbModule, 'getUserProfile').mockResolvedValue({ id: 'dx-user-test', handle: 'tester', display_name: 'Tester' } as any);

    const rawDb = getDatabase();
    await rawDb.execute(`INSERT OR REPLACE INTO dreamx_user_profile (id, display_name, handle, created_at, updated_at) VALUES ('dx-user-other', 'Other', '@other', 0, 0)`);

    const reqBody = {
      actorIds: ['dx-user-other'],
      postId: root.id,
      actorType: 'human'
    };

    const req = new NextRequest('http://localhost/api/dreamx/social/mass-like', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });

    const res = await MassLikePOST(req);
    expect(res.status).toBe(400);
    
    const data = await res.json();
    expect(data.error).toMatch(/Cannot impersonate other human actors/);
  });

  it('post DELETE restricts deletion to human author only', async () => {
    const humanPost = await savePost({ author_id: 'dx-user-test', author_type: 'human', content: 'Human', reply_to_post_id: null });
    const aiPost = await savePost({ author_id: 'dx-prof-ai', author_type: 'ai', content: 'AI', reply_to_post_id: null });
    const otherHumanPost = await savePost({ author_id: 'dx-user-other', author_type: 'human', content: 'Other', reply_to_post_id: null });

    vi.spyOn(dbModule, 'getUserProfile').mockResolvedValue({ id: 'dx-user-test', handle: 'tester', display_name: 'Tester' } as any);

    // Test 1: AI Post deletion fails
    let req = new NextRequest(`http://localhost/api/dreamx/posts?id=${aiPost.id}`, { method: 'DELETE' });
    let res = await PostDELETE(req);
    expect(res.status).toBe(403);

    // Test 2: Other human post deletion fails
    req = new NextRequest(`http://localhost/api/dreamx/posts?id=${otherHumanPost.id}`, { method: 'DELETE' });
    res = await PostDELETE(req);
    expect(res.status).toBe(403);

    // Test 3: Own human post deletion succeeds
    req = new NextRequest(`http://localhost/api/dreamx/posts?id=${humanPost.id}`, { method: 'DELETE' });
    res = await PostDELETE(req);
    expect(res.status).toBe(200);

    const rawDb = getDatabase();
    const remaining = await rawDb.queryAll<any>("SELECT id FROM dreamx_posts");
    expect(remaining.map(p => p.id)).not.toContain(humanPost.id);
    expect(remaining.map(p => p.id)).toContain(aiPost.id);
  });
});
